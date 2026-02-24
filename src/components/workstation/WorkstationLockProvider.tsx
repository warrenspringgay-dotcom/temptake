"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { usePathname } from "next/navigation";

import WorkstationLockScreen from "@/components/workstation/WorkstationLockScreen";

type Operator = {
  teamMemberId: string;
  orgId?: string | null;
  locationId?: string | null;
  name?: string | null;
  initials?: string | null;
  role?: string | null;
};

type ActingContext = {
  acted_by_team_member_id: string | null;
  acted_by_initials: string | null;
};

type Ctx = {
  locked: boolean;
  operator: Operator | null;
  setOperator: (op: Operator | null) => void;
  clearOperator: () => void;

  // Used by QuickActionsFab and anywhere else
  openLockModal: () => void;

  // Optional, but handy
  lockNow: () => void;

  // Acting context helper (used by your useActingClient hook)
  getActingContextClient: () => ActingContext;
};

const WorkstationLockContext = createContext<Ctx | null>(null);

const LS_OPERATOR = "tt_ws_operator_v1";
const LS_LOCKED = "tt_ws_locked_v1";

function readJson<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

function writeJson(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // ignore
  }
}

export function WorkstationLockProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  const [operator, _setOperator] = useState<Operator | null>(() => {
    return readJson<Operator>(LS_OPERATOR);
  });

  // CRITICAL FIX:
  // Do NOT default to locked=true for fresh sessions,
  // otherwise brand new accounts get forced into lock screen before org/location exists.
  const [locked, setLocked] = useState<boolean>(() => {
    const saved = readJson<boolean>(LS_LOCKED);
    return typeof saved === "boolean" ? saved : false;
  });

  const [showLockModal, setShowLockModal] = useState(false);

  const persistOperator = useCallback((op: Operator | null) => {
    _setOperator(op);
    writeJson(LS_OPERATOR, op);
  }, []);

  const persistLocked = useCallback((v: boolean) => {
    setLocked(v);
    writeJson(LS_LOCKED, v);
  }, []);

  const setOperator = useCallback(
    (op: Operator | null) => {
      persistOperator(op);
      if (op) {
        persistLocked(false);
        setShowLockModal(false);
      } else {
        // no operator = workstation effectively locked (but modal only shown when explicitly opened)
        persistLocked(true);
      }
    },
    [persistOperator, persistLocked]
  );

  const clearOperator = useCallback(() => {
    persistOperator(null);
    persistLocked(true);
    setShowLockModal(true);
  }, [persistOperator, persistLocked]);

  const openLockModal = useCallback(() => {
    // Opening the lock modal implies we're in "locked until operator chosen" mode
    persistLocked(true);
    setShowLockModal(true);
  }, [persistLocked]);

  const lockNow = useCallback(() => {
    persistLocked(true);
    setShowLockModal(true);
  }, [persistLocked]);

  const getActingContextClient = useCallback((): ActingContext => {
    if (!operator) {
      return { acted_by_team_member_id: null, acted_by_initials: null };
    }
    return {
      acted_by_team_member_id: operator.teamMemberId ?? null,
      acted_by_initials: (operator.initials ?? null) as string | null,
    };
  }, [operator]);

  // Keep legacy event hook so you can trigger lock screen anywhere without plumbing
  useEffect(() => {
    function onOpen() {
      openLockModal();
    }
    window.addEventListener("tt-open-workstation-lock", onOpen);
    return () => window.removeEventListener("tt-open-workstation-lock", onOpen);
  }, [openLockModal]);

  // If you’re on auth pages, never show the lock modal
  useEffect(() => {
    const onAuth =
      pathname?.startsWith("/login") ||
      pathname?.startsWith("/signup") ||
      pathname?.startsWith("/auth") ||
      pathname?.startsWith("/forgot-password") ||
      pathname?.startsWith("/reset-password");

    if (onAuth) {
      setShowLockModal(false);
    }
  }, [pathname]);

  const value = useMemo<Ctx>(
    () => ({
      locked,
      operator,
      setOperator,
      clearOperator,
      openLockModal,
      lockNow,
      getActingContextClient,
    }),
    [locked, operator, setOperator, clearOperator, openLockModal, lockNow, getActingContextClient]
  );

  return (
    <WorkstationLockContext.Provider value={value}>
      {children}

      {/* Single source of truth: the provider owns the lock UI.
          This prevents the “FAB locked but page unlocked” split-brain. */}
      {showLockModal ? <WorkstationLockScreen /> : null}
    </WorkstationLockContext.Provider>
  );
}

export function useWorkstation() {
  const ctx = useContext(WorkstationLockContext);
  if (!ctx) throw new Error("useWorkstation must be used within WorkstationLockProvider");
  return ctx;
}
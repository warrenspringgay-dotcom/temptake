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
import { supabase } from "@/lib/supabaseBrowser";

/* ===================== Types ===================== */

export type Operator = {
  teamMemberId: string;
  orgId: string;
  locationId: string;
  name?: string | null;
  initials?: string | null;
  role?: string | null;
};

export type ActingContext = {
  acted_by_team_member_id?: string | null;
  acted_by_initials?: string | null;
};

type Ctx = {
  locked: boolean;
  operator: Operator | null;
  setOperator: (op: Operator | null) => void;
  clearOperator: () => void;

  openLockModal: () => void;
  closeLockModal: () => void;
  lockNow: () => void;

  // Used by useActingClient()
  getActingContextClient: () => ActingContext;
};

const WorkstationLockContext = createContext<Ctx | null>(null);

/* ===================== Local Storage Keys ===================== */

const LS_LOCKED = "tt_ws_locked_v1";
const LS_OPERATOR = "tt_ws_operator_v1";
const LS_AUTH_UID = "tt_ws_auth_uid_v1";

function readJson<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

function writeJson(key: string, value: any) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // ignore
  }
}

function removeKey(key: string) {
  try {
    localStorage.removeItem(key);
  } catch {
    // ignore
  }
}

/* ===================== Provider ===================== */

export function WorkstationLockProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  const [locked, setLocked] = useState<boolean>(false);
  const [operator, setOperatorState] = useState<Operator | null>(null);
  const [showLockModal, setShowLockModal] = useState(false);

  // 1) Account-isolate the workstation state (localStorage is shared across accounts).
  useEffect(() => {
    let cancelled = false;

    (async () => {
      const { data } = await supabase.auth.getUser();
      if (cancelled) return;

      const uid = data.user?.id ?? null;
      const prev = typeof window !== "undefined" ? localStorage.getItem(LS_AUTH_UID) : null;

      if (uid && prev && prev !== uid) {
        // Different logged-in user: wipe workstation state.
        removeKey(LS_LOCKED);
        removeKey(LS_OPERATOR);
      }

      if (uid) {
        try {
          localStorage.setItem(LS_AUTH_UID, uid);
        } catch {}
      }

      // Load persisted state after we’ve handled user switching.
      const persistedLocked = localStorage.getItem(LS_LOCKED) === "1";
      const persistedOperator = readJson<Operator>(LS_OPERATOR);

      setLocked(persistedLocked);
      setOperatorState(persistedOperator);
      setShowLockModal(persistedLocked);
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  // 2) If app is locked, ensure modal stays open (but don’t fight the UI if unlocked).
  useEffect(() => {
    if (locked) setShowLockModal(true);
  }, [locked]);

  // Optional: if you want locking to apply to route changes, keep it simple:
  useEffect(() => {
    if (locked) setShowLockModal(true);
  }, [pathname, locked]);

  const setOperator = useCallback((op: Operator | null) => {
    setOperatorState(op);
    if (op) writeJson(LS_OPERATOR, op);
    else removeKey(LS_OPERATOR);
  }, []);

  const clearOperator = useCallback(() => {
    setOperator(null);
  }, [setOperator]);

  const openLockModal = useCallback(() => {
    setShowLockModal(true);
    setLocked(true);
    try {
      localStorage.setItem(LS_LOCKED, "1");
    } catch {}
  }, []);

  const closeLockModal = useCallback(() => {
    setShowLockModal(false);
  }, []);

  const lockNow = useCallback(() => {
    // Lock immediately and clear operator (forces PIN selection)
    setOperator(null);
    setShowLockModal(true);
    setLocked(true);
    try {
      localStorage.setItem(LS_LOCKED, "1");
    } catch {}
  }, [setOperator]);

  const unlock = useCallback(() => {
    setLocked(false);
    setShowLockModal(false);
    try {
      localStorage.setItem(LS_LOCKED, "0");
    } catch {}
  }, []);

  const getActingContextClient = useCallback((): ActingContext => {
    // keep this tiny and stable; other files rely on these field names
    return {
      acted_by_team_member_id: operator?.teamMemberId ?? null,
      acted_by_initials: operator?.initials ?? null,
    };
  }, [operator]);

  const value = useMemo<Ctx>(
    () => ({
      locked,
      operator,
      setOperator: (op) => {
        setOperator(op);
        if (op) {
          // setting an operator implies “unlocked”
          unlock();
        }
      },
      clearOperator,

      openLockModal,
      closeLockModal,
      lockNow,

      getActingContextClient,
    }),
    [
      locked,
      operator,
      setOperator,
      clearOperator,
      openLockModal,
      closeLockModal,
      lockNow,
      unlock,
      getActingContextClient,
    ]
  );

  return (
    <WorkstationLockContext.Provider value={value}>
      {children}

      {/* UI stays as-is: your lock screen component controls styling */}
      {showLockModal ? null : null}
    </WorkstationLockContext.Provider>
  );
}

/* ===================== Hook ===================== */

export function useWorkstation() {
  const ctx = useContext(WorkstationLockContext);
  if (!ctx) throw new Error("useWorkstation must be used within WorkstationLockProvider");
  return ctx;
}
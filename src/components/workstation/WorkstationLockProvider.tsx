"use client";
import WorkstationLockScreen from "./WorkstationLockScreen";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

import { usePathname } from "next/navigation";

import { getActiveOrgIdClient } from "@/lib/orgClient";
import { getActiveLocationIdClient } from "@/lib/locationClient";

/**
* Keep this contract stable.
* Other files already assume these names exist.
*/

export type Operator = {
  teamMemberId: string;

  // IMPORTANT: these exist and are used elsewhere (LockScreen + unlock route)
  orgId: string;
  locationId: string;

  name?: string | null;
  initials?: string | null;
  role?: string | null;
};

type ActingContext = {
  acted_by_initials?: string | null;
};

type Ctx = {
  locked: boolean;

  operator: Operator | null;
  setOperator: (op: Operator | null) => void;
  clearOperator: () => void;

  // Used by QuickActionsFab
  openLockModal: () => void;
  lockNow: () => void;

  // Used by useActingClient
  getActingContextClient: () => ActingContext;
  setActingContextClient: (patch: ActingContext) => void;
};

const WorkstationLockContext = createContext<Ctx | null>(null);

const LS_OPERATOR = "tt_ws_operator";
const LS_ACTING = "tt_ws_acting";

function readJson<T>(key: string): T | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

function writeJson(key: string, value: unknown) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // ignore
  }
}

function removeKey(key: string) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(key);
  } catch {
    // ignore
  }
}

export function WorkstationLockProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  const [operator, _setOperator] = useState<Operator | null>(() =>
    readJson<Operator>(LS_OPERATOR)
  );

  const [locked, setLocked] = useState<boolean>(() => {
    // If there is no operator selected, we start "locked"
    return !readJson<Operator>(LS_OPERATOR);
  });

  const [showLockModal, setShowLockModal] = useState(false);

  // Active org/location (may not exist immediately after signup)
  const [orgId, setOrgId] = useState<string | null>(null);
  const [locationId, setLocationId] = useState<string | null>(null);

  const refreshActiveContext = useCallback(async () => {
    // These helpers might be sync or async depending on your implementation.
    // Promise.resolve handles both and stops TS screaming.
    const o = await Promise.resolve(getActiveOrgIdClient());
    const l = await Promise.resolve(getActiveLocationIdClient());

    setOrgId(o || null);
    setLocationId(l || null);

    return { orgId: o || null, locationId: l || null };
  }, []);

  const setOperator = useCallback((op: Operator | null) => {
    _setOperator(op);

    if (op) {
      writeJson(LS_OPERATOR, op);
      setLocked(false);
      setShowLockModal(false);
    } else {
      removeKey(LS_OPERATOR);
      setLocked(true);
    }
  }, []);

  const clearOperator = useCallback(() => {
    setOperator(null);
  }, [setOperator]);

  const openLockModal = useCallback(() => {
    setShowLockModal(true);
  }, []);

  const lockNow = useCallback(() => {
    // Locking means: require operator to continue, modal should show
    setLocked(true);
    setShowLockModal(true);
  }, []);

  const getActingContextClient = useCallback((): ActingContext => {
    return readJson<ActingContext>(LS_ACTING) ?? {};
  }, []);

  const setActingContextClient = useCallback((patch: ActingContext) => {
    const current = readJson<ActingContext>(LS_ACTING) ?? {};
    const next = { ...current, ...patch };
    writeJson(LS_ACTING, next);
  }, []);

  // Keep org/location in sync whenever route changes (helps after signup redirects)
  useEffect(() => {
    refreshActiveContext();
  }, [pathname, refreshActiveContext]);

  // If operator exists but context disappears (new account edge cases), keep UI stable:
  // - We DO NOT auto-clear operator
  // - We DO allow lock screen to show a "no active org/location selected" message
  // (LockScreen handles that text without changing UI)
  useEffect(() => {
    // If operator missing, ensure locked state is true
    if (!operator) setLocked(true);
  }, [operator]);

  const value = useMemo<Ctx>(
    () => ({
      locked,
      operator,
      setOperator,
      clearOperator,
      openLockModal,
      lockNow,
      getActingContextClient,
      setActingContextClient,
    }),
    [
      locked,
      operator,
      setOperator,
      clearOperator,
      openLockModal,
      lockNow,
      getActingContextClient,
      setActingContextClient,
    ]
  );

  return (
    <WorkstationLockContext.Provider value={value}>
      {children}

      {/* UI stays exactly as-is: the lock modal is whatever your LockScreen renders */}
      {showLockModal ? (
        // Import path matches your existing structure (you already have the file)
        // If your project uses a different relative path, keep it identical to your existing import.
        // eslint-disable-next-line react/jsx-no-undef
        <WorkstationLockScreen onClose={() => setShowLockModal(false)} />
      ) : null}
    </WorkstationLockContext.Provider>
  );
}

export function useWorkstation() {
  const ctx = useContext(WorkstationLockContext);
  if (!ctx) throw new Error("useWorkstation must be used within WorkstationLockProvider");
  return ctx;
}
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

import WorkstationLockScreen from "./WorkstationLockScreen";
import { getActiveOrgIdClient } from "@/lib/orgClient";
import { getActiveLocationIdClient } from "@/lib/locationClient";

/**
* IMPORTANT:
* - These keys MUST match what the rest of the app (FAB etc.) expects.
* - Your console screenshot shows: tt_workstation_force, tt_workstation_operator
*/
const LS_FORCE_LOCK = "tt_workstation_force";
const LS_OPERATOR = "tt_workstation_operator";

/**
* Backward compat (in case you've already written these somewhere).
* If you don't have these in your project anymore, leaving them doesn't hurt.
*/
const LS_FORCE_LOCK_OLD = "tt_ws_force_lock";
const LS_OPERATOR_OLD = "tt_ws_operator";

type Operator = {
  teamMemberId: string;
  orgId?: string | null;
  locationId?: string | null;
  name?: string | null;
  initials?: string | null;
  role?: string | null;
};

export type ActingContext = {
  acted_by_team_member_id: string | null;
  acted_by_initials: string | null;
};

type Ctx = {
  // state
  lockRequired: boolean;
  locked: boolean;

  operator: Operator | null;

  // actions
  setOperator: (op: Operator | null) => void;
  clearOperator: () => void;

  openLockModal: () => void;
  closeLockModal: () => void;

  lockNow: () => void;
  unlockNow: () => void;

  // acting
  getActingContextClient: () => ActingContext;
};

const WorkstationLockContext = createContext<Ctx | null>(null);

function safeParse<T>(s: string | null): T | null {
  if (!s) return null;
  try {
    return JSON.parse(s) as T;
  } catch {
    return null;
  }
}

function readBoolLS(key: string): boolean | null {
  const v = localStorage.getItem(key);
  if (v == null) return null;
  if (v === "true") return true;
  if (v === "false") return false;
  // tolerate JSON booleans
  if (v === "1") return true;
  if (v === "0") return false;
  return null;
}

function writeBoolLS(key: string, value: boolean) {
  localStorage.setItem(key, value ? "true" : "false");
}

export function WorkstationLockProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  // persisted operator + force lock
  const [operator, _setOperator] = useState<Operator | null>(null);
  const [forceLock, setForceLock] = useState<boolean>(false);

  // ui
  const [showLockModal, setShowLockModal] = useState(false);

  // context
  const [orgId, setOrgId] = useState<string | null>(null);
  const [locationId, setLocationId] = useState<string | null>(null);

  // do we require workstation lock at all?
  const [lockRequired, setLockRequired] = useState<boolean>(false);

  // ---------- init from storage ----------
  useEffect(() => {
    // operator (new key first)
    const opNew = safeParse<Operator>(localStorage.getItem(LS_OPERATOR));
    const opOld = safeParse<Operator>(localStorage.getItem(LS_OPERATOR_OLD));
    _setOperator(opNew ?? opOld ?? null);

    // force lock (new key first)
    const fNew = readBoolLS(LS_FORCE_LOCK);
    const fOld = readBoolLS(LS_FORCE_LOCK_OLD);
    setForceLock((fNew ?? fOld) ?? false);
  }, []);

  // keep storage in sync when operator changes
  const setOperator = useCallback((op: Operator | null) => {
    _setOperator(op);
    if (op) localStorage.setItem(LS_OPERATOR, JSON.stringify(op));
    else localStorage.removeItem(LS_OPERATOR);

    // also write old key to avoid “half the app is reading the other key”
    if (op) localStorage.setItem(LS_OPERATOR_OLD, JSON.stringify(op));
    else localStorage.removeItem(LS_OPERATOR_OLD);

    // broadcast to other tabs/components that only listen to storage events
    window.dispatchEvent(new StorageEvent("storage", { key: LS_OPERATOR }));
  }, []);

  const clearOperator = useCallback(() => {
    setOperator(null);
  }, [setOperator]);

  // keep storage in sync when forceLock changes
  useEffect(() => {
    writeBoolLS(LS_FORCE_LOCK, forceLock);
    writeBoolLS(LS_FORCE_LOCK_OLD, forceLock);
    window.dispatchEvent(new StorageEvent("storage", { key: LS_FORCE_LOCK }));
  }, [forceLock]);

  // ---------- active org/location ----------
  const refreshActiveContext = useCallback(async () => {
    /**
     * These helpers should be synchronous (cookie/local storage read).
     * If you made them async, that explains earlier Promise<...> TS errors.
     */
    const o = getActiveOrgIdClient?.() as unknown as string | null | undefined;
    const l = getActiveLocationIdClient?.() as unknown as
      | string
      | null
      | undefined;

    setOrgId(o ?? null);
    setLocationId(l ?? null);

    // If we don't have an active context yet, we can't enforce the lock.
    if (!o || !l) {
      setLockRequired(false);
      return { orgId: o ?? null, locationId: l ?? null };
    }

    // Decide if lock is required. In your build, you were calling a fetch.
    // Keep it simple and robust:
    // - If force lock is on -> required
    // - Otherwise let it be required by whatever your app wants (default true)
    //
    // If you already have an API to decide this, wire it here.
    setLockRequired(true);

    return { orgId: o, locationId: l };
  }, []);

  // refresh on mount + when route changes (common cause of drift)
  useEffect(() => {
    refreshActiveContext();
  }, [refreshActiveContext, pathname]);

  // ---------- derived lock ----------
  const locked = useMemo(() => {
    if (!lockRequired) return false;
    if (forceLock) return true;
    return !operator;
  }, [lockRequired, forceLock, operator]);

  // if locked, ensure modal is open (but don't be obnoxious in routes like /auth)
  useEffect(() => {
    // avoid locking on auth pages if you want (optional)
    if (pathname?.startsWith("/auth")) return;

    if (locked) setShowLockModal(true);
  }, [locked, pathname]);

  // ---------- actions exposed ----------
  const openLockModal = useCallback(() => setShowLockModal(true), []);
  const closeLockModal = useCallback(() => setShowLockModal(false), []);

  const lockNow = useCallback(() => {
    // “lock now” means: enforce lock and clear operator so the app + FAB agree.
    setForceLock(true);
    clearOperator();
    setShowLockModal(true);
  }, [clearOperator]);

  const unlockNow = useCallback(() => {
    // unlockNow just removes the forced lock. Actual unlock requires an operator.
    setForceLock(false);
  }, []);

  const getActingContextClient = useCallback((): ActingContext => {
    return {
      acted_by_team_member_id: operator?.teamMemberId ?? null,
      acted_by_initials: (operator?.initials ?? null) || null,
    };
  }, [operator]);

  const value: Ctx = useMemo(
    () => ({
      lockRequired,
      locked,

      operator,
      setOperator,
      clearOperator,

      openLockModal,
      closeLockModal,

      lockNow,
      unlockNow,

      getActingContextClient,
    }),
    [
      lockRequired,
      locked,
      operator,
      setOperator,
      clearOperator,
      openLockModal,
      closeLockModal,
      lockNow,
      unlockNow,
      getActingContextClient,
    ]
  );

  return (
    <WorkstationLockContext.Provider value={value}>
      {children}

      {/* UI stays as-is: you asked, the universe tried to argue, and lost. */}
      {showLockModal ? (
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

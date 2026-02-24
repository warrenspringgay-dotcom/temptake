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

import { getActiveOrgIdClient } from "@/lib/orgClient";
import { getActiveLocationIdClient } from "@/lib/locationClient";

/** Keep this shape consistent across the app */
export type Operator = {
  teamMemberId: string;
  orgId: string;
  locationId: string;
  name?: string | null;
  initials?: string | null;
  role?: string | null;
};

type ActingContext = {
  orgId: string | null;
  locationId: string | null;
  acted_by_team_member_id: string | null;
  acted_by_name: string | null;
  acted_by_initials: string | null;
  acted_by_role: string | null;
};

type Ctx = {
  locked: boolean;
  operator: Operator | null;
  setOperator: (op: Operator | null) => void;
  clearOperator: () => void;

  /** Used by FAB */
  openLockModal: () => void;
  lockNow: () => void;

  /** Used in other parts of app (e.g. useActingClient) */
  getActingContextClient: () => ActingContext;
};

const WorkstationLockContext = createContext<Ctx | null>(null);

const LS_OPERATOR = "tt_workstation_operator";
const LS_FORCE_LOCK = "tt_force_workstation_lock";

/** small helpers */
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
  } catch {}
}
function removeKey(key: string) {
  try {
    localStorage.removeItem(key);
  } catch {}
}

/**
* Provider owns:
* - persisted operator
* - "force lock" (manual lock)
* - active org/location lookup (async helpers)
* - exposing openLockModal/lockNow for FAB
*
* It does NOT change your LockScreen UI. It just supports it properly.
*/
export function WorkstationLockProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  const [operator, setOperatorState] = useState<Operator | null>(null);
  const [forceLocked, setForceLocked] = useState<boolean>(false);

  const [orgId, setOrgId] = useState<string | null>(null);
  const [locationId, setLocationId] = useState<string | null>(null);

  // Hydrate operator + force lock from localStorage (client-only)
  useEffect(() => {
    const op = readJson<Operator>(LS_OPERATOR);
    if (op?.teamMemberId && op?.orgId && op?.locationId) setOperatorState(op);

    const fl = readJson<boolean>(LS_FORCE_LOCK);
    if (typeof fl === "boolean") setForceLocked(fl);
  }, []);

  // Refresh active context (async helpers) on mount + route changes
  const refreshActiveContext = useCallback(async () => {
    try {
      const o = await getActiveOrgIdClient();
      const l = await getActiveLocationIdClient();
      setOrgId(o ?? null);
      setLocationId(l ?? null);
      return { orgId: o ?? null, locationId: l ?? null };
    } catch {
      setOrgId(null);
      setLocationId(null);
      return { orgId: null, locationId: null };
    }
  }, []);

  useEffect(() => {
    void refreshActiveContext();
  }, [refreshActiveContext, pathname]);

  // Persist operator changes
  const setOperator = useCallback((op: Operator | null) => {
    setOperatorState(op);
    if (op) writeJson(LS_OPERATOR, op);
    else removeKey(LS_OPERATOR);
  }, []);

  const clearOperator = useCallback(() => {
    setOperator(null);
  }, [setOperator]);

  // Manual lock, used by FAB or inactivity timers
  const lockNow = useCallback(() => {
    setForceLocked(true);
    writeJson(LS_FORCE_LOCK, true);

    // Tell the lock screen (which listens globally) to open itself
    window.dispatchEvent(new CustomEvent("tt-open-workstation-lock"));
  }, []);

  // Open modal without forcing locked state (FAB "unlock workstation" button)
  const openLockModal = useCallback(() => {
    window.dispatchEvent(new CustomEvent("tt-open-workstation-lock"));
  }, []);

  // When should we consider workstation locked?
  // - if forced locked OR no operator selected
  // - but only when active org+location exist (otherwise onboarding gets bricked)
  const locked = useMemo(() => {
    if (!orgId || !locationId) return false;
    if (forceLocked) return true;
    return operator == null;
  }, [forceLocked, operator, orgId, locationId]);

  // Clear "force lock" as soon as we have a valid operator in the current context
  useEffect(() => {
    if (!forceLocked) return;
    if (!operator) return;
    if (!orgId || !locationId) return;

    // If operator belongs to current org/location, consider workstation unlocked
    if (operator.orgId === orgId && operator.locationId === locationId) {
      setForceLocked(false);
      writeJson(LS_FORCE_LOCK, false);
    }
  }, [forceLocked, operator, orgId, locationId]);

  const getActingContextClient = useCallback((): ActingContext => {
    return {
      orgId,
      locationId,
      acted_by_team_member_id: operator?.teamMemberId ?? null,
      acted_by_name: operator?.name ?? null,
      acted_by_initials: operator?.initials ?? null,
      acted_by_role: operator?.role ?? null,
    };
  }, [operator, orgId, locationId]);

  const value: Ctx = useMemo(
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
    </WorkstationLockContext.Provider>
  );
}

export function useWorkstation() {
  const ctx = useContext(WorkstationLockContext);
  if (!ctx) throw new Error("useWorkstation must be used within WorkstationLockProvider");
  return ctx;
}

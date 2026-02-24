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

import WorkstationLockScreen from "@/components/workstation/WorkstationLockScreen";

type Operator = {
  teamMemberId: string;
  orgId: string;
  locationId: string;
  name?: string | null;
  initials?: string | null;
  role?: string | null;
};

type ActingContext = {
  // Keep this minimal and stable.
  acted_by_initials?: string | null;
  acted_by_team_member_id?: string | null;
};

type Ctx = {
  locked: boolean;
  operator: Operator | null;

  setOperator: (op: Operator | null) => void;
  clearOperator: () => void;

  // Expected by QuickActionsFab / other callers:
  openLockModal: () => void;
  lockNow: () => void;

  // Used by useActingClient
  getActingContextClient: () => ActingContext;
};

const LS_OPERATOR = "tt_workstation_operator";
const LS_FORCE_LOCKED = "tt_workstation_force_locked";

function safeReadJson<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

function safeWriteJson(key: string, val: any) {
  try {
    localStorage.setItem(key, JSON.stringify(val));
  } catch {}
}

function safeReadBool(key: string, fallback = false) {
  try {
    const raw = localStorage.getItem(key);
    if (raw == null) return fallback;
    return raw === "true";
  } catch {
    return fallback;
  }
}

function safeWriteBool(key: string, val: boolean) {
  try {
    localStorage.setItem(key, val ? "true" : "false");
  } catch {}
}

// Helpers might return string|null OR Promise<string|null>. Handle both.
async function maybeAwaitString(v: any): Promise<string | null> {
  try {
    const out = await Promise.resolve(v);
    return out ? String(out) : null;
  } catch {
    return null;
  }
}

const WorkstationLockContext = createContext<Ctx | null>(null);

export function WorkstationLockProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  // Persisted operator (so refresh keeps workstation “unlocked” once chosen)
  const [operator, _setOperator] = useState<Operator | null>(() =>
    typeof window === "undefined" ? null : safeReadJson<Operator>(LS_OPERATOR)
  );

  // "Force locked" is the only persisted lock flag we need.
  // Final `locked` is derived from forceLocked + operator presence.
  const [forceLocked, setForceLocked] = useState<boolean>(() =>
    typeof window === "undefined" ? true : safeReadBool(LS_FORCE_LOCKED, true)
  );

  const [showLockModal, setShowLockModal] = useState(false);

  // Active context (org/location)
  const [orgId, setOrgId] = useState<string | null>(null);
  const [locationId, setLocationId] = useState<string | null>(null);

  const refreshActiveContext = useCallback(async () => {
    const o = await maybeAwaitString(getActiveOrgIdClient());
    const l = await maybeAwaitString(getActiveLocationIdClient());
    setOrgId(o);
    setLocationId(l);
    return { orgId: o, locationId: l };
  }, []);

  useEffect(() => {
    refreshActiveContext();
  }, [refreshActiveContext, pathname]);

  // If context changes and the operator belongs to a different org/location, clear it.
  useEffect(() => {
    if (!operator) return;
    if (!orgId || !locationId) return;

    if (operator.orgId !== orgId || operator.locationId !== locationId) {
      _setOperator(null);
      safeWriteJson(LS_OPERATOR, null);
      setForceLocked(true);
      safeWriteBool(LS_FORCE_LOCKED, true);
    }
  }, [operator, orgId, locationId]);

  const setOperator = useCallback((op: Operator | null) => {
    _setOperator(op);
    safeWriteJson(LS_OPERATOR, op);

    if (op) {
      // choosing an operator unlocks workstation
      setForceLocked(false);
      safeWriteBool(LS_FORCE_LOCKED, false);
      setShowLockModal(false);
    } else {
      // no operator => workstation locked
      setForceLocked(true);
      safeWriteBool(LS_FORCE_LOCKED, true);
    }
  }, []);

  const clearOperator = useCallback(() => {
    _setOperator(null);
    safeWriteJson(LS_OPERATOR, null);
    setForceLocked(true);
    safeWriteBool(LS_FORCE_LOCKED, true);
    setShowLockModal(true);
  }, []);

  const openLockModal = useCallback(() => {
    setShowLockModal(true);
  }, []);

  const lockNow = useCallback(() => {
    // This is “lock workstation now”: clear operator and force lock.
    _setOperator(null);
    safeWriteJson(LS_OPERATOR, null);
    setForceLocked(true);
    safeWriteBool(LS_FORCE_LOCKED, true);
    setShowLockModal(true);
  }, []);

  // ✅ Single source of truth:
  // - If there is no org/location yet, don’t block the whole app with a lock.
  // - If there IS context, lock depends on (forceLocked OR no operator).
  const locked = useMemo(() => {
    if (!orgId || !locationId) return false;
    return forceLocked || !operator;
  }, [forceLocked, operator, orgId, locationId]);

  const getActingContextClient = useCallback((): ActingContext => {
    // Keep this stable for useActingClient: if operator exists, provide ids.
    if (!operator) return {};
    return {
      acted_by_team_member_id: operator.teamMemberId,
      acted_by_initials: operator.initials ?? null,
    };
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
    }),
    [locked, operator, setOperator, clearOperator, openLockModal, lockNow, getActingContextClient]
  );

  return (
    <WorkstationLockContext.Provider value={value}>
      {children}

      {/* UI stays as-is: the existing glass modal is still WorkstationLockScreen */}
      {showLockModal ? <WorkstationLockScreen /> : null}
    </WorkstationLockContext.Provider>
  );
}

export function useWorkstation() {
  const ctx = useContext(WorkstationLockContext);
  if (!ctx) throw new Error("useWorkstation must be used within <WorkstationLockProvider>");
  return ctx;
}
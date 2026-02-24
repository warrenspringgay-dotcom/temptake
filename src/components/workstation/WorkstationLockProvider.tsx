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
import { getActiveOrgIdClient } from "@/lib/orgClient";
import { getActiveLocationIdClient } from "@/lib/locationClient";

import WorkstationLockScreen from "@/components/workstation/WorkstationLockScreen";

/* ===================== Local Storage keys ===================== */

const LS_LOCKED = "tt_ws_locked";
const LS_OPERATOR = "tt_ws_operator";
const LS_ACTING = "tt_ws_acting";

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

  // existing callers use these
  setOperator: (op: Operator | null) => void;
  clearOperator: () => void;

  // ✅ QuickActionsFab expects this name
  openLockModal: () => void;

  // helpers (safe additions)
  lockNow: () => void;
  unlockWorkstation: () => void;

  // acting context (your useActingClient expects this)
  getActingContextClient: () => ActingContext;
};

/* ===================== Helpers ===================== */

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

function writeJson<T>(key: string, value: T | null) {
  if (typeof window === "undefined") return;
  try {
    if (value === null) window.localStorage.removeItem(key);
    else window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // ignore
  }
}

function readBool(key: string, fallback: boolean) {
  const v = readJson<boolean>(key);
  return typeof v === "boolean" ? v : fallback;
}

function writeBool(key: string, value: boolean) {
  writeJson<boolean>(key, value);
}

async function resolveMaybePromise<T>(v: T | Promise<T>) {
  return await Promise.resolve(v);
}

/* ===================== Context ===================== */

const WorkstationLockContext = createContext<Ctx | null>(null);

export function WorkstationLockProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  const [locked, setLockedState] = useState<boolean>(() => readBool(LS_LOCKED, false));
  const [operator, setOperatorState] = useState<Operator | null>(() =>
    readJson<Operator>(LS_OPERATOR)
  );

  const [showLockModal, setShowLockModal] = useState<boolean>(false);

  // Track active context (from cookies) purely so we can avoid locking before it exists.
  const [orgId, setOrgId] = useState<string | null>(null);
  const [locationId, setLocationId] = useState<string | null>(null);

  const persistLocked = useCallback((v: boolean) => {
    setLockedState(v);
    writeBool(LS_LOCKED, v);
  }, []);

  const setOperator = useCallback((op: Operator | null) => {
    setOperatorState(op);
    writeJson<Operator>(LS_OPERATOR, op);
    if (op) {
      // unlocked once an operator is set
      persistLocked(false);
      setShowLockModal(false);
    }
  }, [persistLocked]);

  const clearOperator = useCallback(() => {
    setOperatorState(null);
    writeJson<Operator>(LS_OPERATOR, null);
  }, []);

  const unlockWorkstation = useCallback(() => {
    persistLocked(false);
    setShowLockModal(false);
  }, [persistLocked]);

  const lockNow = useCallback(() => {
    // Locking does NOT clear operator; it just forces re-PIN.
    persistLocked(true);
    setShowLockModal(true);
  }, [persistLocked]);

  const openLockModal = useCallback(() => {
    setShowLockModal(true);
  }, []);

  const refreshActiveContext = useCallback(async () => {
    const o = await resolveMaybePromise(getActiveOrgIdClient() as any);
    const l = await resolveMaybePromise(getActiveLocationIdClient() as any);

    const oStr = typeof o === "string" && o.length ? o : null;
    const lStr = typeof l === "string" && l.length ? l : null;

    setOrgId(oStr);
    setLocationId(lStr);

    // ✅ CRITICAL FIX:
    // If we don't have active org/location yet (new signup), DO NOT show lock modal.
    // Also force locked=false to avoid "No active organisation/location selected" trap.
    if (!oStr || !lStr) {
      persistLocked(false);
      setShowLockModal(false);
    }
  }, [persistLocked]);

  // Refresh active context on mount + route change
  useEffect(() => {
    refreshActiveContext();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  // If the workstation is locked, show modal (but only if active context exists)
  useEffect(() => {
    if (locked && orgId && locationId) setShowLockModal(true);
    if (!locked) setShowLockModal(false);
  }, [locked, orgId, locationId]);

  // Keep operator synced with auth changes (optional safety)
  useEffect(() => {
    const { data } = supabase.auth.onAuthStateChange(() => {
      refreshActiveContext();
    });
    return () => data.subscription.unsubscribe();
  }, [refreshActiveContext]);

  const getActingContextClient = useCallback((): ActingContext => {
    const acting = readJson<ActingContext>(LS_ACTING) ?? {};
    return {
      acted_by_team_member_id: acting.acted_by_team_member_id ?? null,
      acted_by_initials: acting.acted_by_initials ?? null,
    };
  }, []);

  const value: Ctx = useMemo(
    () => ({
      locked,
      operator,
      setOperator,
      clearOperator,
      openLockModal,
      lockNow,
      unlockWorkstation,
      getActingContextClient,
    }),
    [
      locked,
      operator,
      setOperator,
      clearOperator,
      openLockModal,
      lockNow,
      unlockWorkstation,
      getActingContextClient,
    ]
  );

  return (
    <WorkstationLockContext.Provider value={value}>
      {children}

      {/* UI stays as-is: your modal component controls the look */}
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
"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { usePathname } from "next/navigation";

import WorkstationLockScreen from "@/components/workstation/WorkstationLockScreen";
import { getActiveOrgIdClient } from "@/lib/orgClient";
import { getActiveLocationIdClient } from "@/lib/locationClient";

/* ===================== Types ===================== */

export type Operator = {
  teamMemberId: string;
  name?: string | null;
  initials?: string | null;
  role?: string | null;
};

export type ActingContext = {
  acted_by_team_member_id?: string | null;
  acted_by_initials?: string | null;
};

type Ctx = {
  // Derived lock state: single source of truth
  locked: boolean;
  lockRequired: boolean;

  // Operator session (PIN)
  operator: Operator | null;
  setOperator: (op: Operator | null) => void;
  clearOperator: () => void;

  // Modal controls
  openLockModal: () => void;
  closeLockModal: () => void;

  // Force lock right now (clears operator so FAB + app agree)
  lockNow: () => void;
  unlockWorkstation: () => void;

  // Helper for other client hooks
  getActingContextClient: () => ActingContext;
};

const WorkstationLockContext = createContext<Ctx | null>(null);

/* ===================== LocalStorage Keys ===================== */

const LS_OPERATOR = "tt_workstation_operator";
const LS_FORCE = "tt_workstation_force";

/* ===================== Small helpers ===================== */

async function resolveMaybePromise<T>(v: T | Promise<T>): Promise<T> {
  return await Promise.resolve(v);
}

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

  const [operator, setOperatorState] = useState<Operator | null>(null);
  const [showLockModal, setShowLockModal] = useState(false);

  // Active context
  const [orgId, setOrgId] = useState<string | null>(null);
  const [locationId, setLocationId] = useState<string | null>(null);

  // Whether this org/location wants lock enforcement
  const [lockRequired, setLockRequired] = useState(false);

  const bootedRef = useRef(false);

  const isAuthRoute = useMemo(() => {
    const p = pathname || "";
    // Don’t PIN-lock login/signup/reset flows
    return (
      p.startsWith("/login") ||
      p.startsWith("/signup") ||
      p.startsWith("/auth") ||
      p.startsWith("/reset") ||
      p.startsWith("/forgot")
    );
  }, [pathname]);

  const hasActiveContext = !!orgId && !!locationId;

  // ✅ Single source of truth for lock:
  // - if lock not required OR no active context OR on auth routes => not locked
  // - else locked if operator missing
  const locked = useMemo(() => {
    if (isAuthRoute) return false;
    if (!hasActiveContext) return false;
    if (!lockRequired) return false;
    return !operator;
  }, [isAuthRoute, hasActiveContext, lockRequired, operator]);

  const setOperator = useCallback((op: Operator | null) => {
    setOperatorState(op);

    if (op) {
      writeJson(LS_OPERATOR, op);
      // once operator set, hide modal
      setShowLockModal(false);
    } else {
      removeKey(LS_OPERATOR);
    }
  }, []);

  const clearOperator = useCallback(() => {
    setOperator(null);
    // clearing operator means we should show modal again if lock is enforced
    setShowLockModal(true);
  }, [setOperator]);

  const openLockModal = useCallback(() => setShowLockModal(true), []);
  const closeLockModal = useCallback(() => setShowLockModal(false), []);

  // ✅ Force lock now = clear operator (no separate "locked" flag)
  const lockNow = useCallback(() => {
    clearOperator();
  }, [clearOperator]);

  const unlockWorkstation = useCallback(() => {
    // Unlock = close modal; actual lock state becomes false when operator is set
    setShowLockModal(false);
  }, []);

  const getActingContextClient = useCallback((): ActingContext => {
    return {
      acted_by_team_member_id: operator?.teamMemberId ?? null,
      acted_by_initials: operator?.initials ?? null,
    };
  }, [operator]);

  const refreshActiveContext = useCallback(async () => {
    const o = await resolveMaybePromise(getActiveOrgIdClient());
    const l = await resolveMaybePromise(getActiveLocationIdClient());

    setOrgId(o || null);
    setLocationId(l || null);

    // If we don't have active context yet, do NOT enforce lock and don't show modal.
    if (!o || !l) {
      setLockRequired(false);
      setShowLockModal(false);
      return { orgId: o || null, locationId: l || null };
    }

    // Load lockRequired from persisted toggle, default true if previously enforced.
    // You can still override this via your API fetch if you want later.
    const force = localStorage.getItem(LS_FORCE);
    setLockRequired(force === "true");

    return { orgId: o || null, locationId: l || null };
  }, []);

  // Boot: load operator + initial context
  useEffect(() => {
    if (bootedRef.current) return;
    bootedRef.current = true;

    const savedOp = readJson<Operator>(LS_OPERATOR);
    if (savedOp?.teamMemberId) {
      setOperatorState(savedOp);
    }

    refreshActiveContext();
  }, [refreshActiveContext]);

  // Whenever route changes: avoid auth-route lockouts
  useEffect(() => {
    if (isAuthRoute) {
      setShowLockModal(false);
      return;
    }
    // If app is locked, ensure modal is visible
    if (locked) setShowLockModal(true);
  }, [isAuthRoute, locked]);

  // When active context appears later (post-login), re-check context + enforce
  useEffect(() => {
    refreshActiveContext();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  // If lock is enforced and operator missing, show modal
  useEffect(() => {
    if (isAuthRoute) return;
    if (!hasActiveContext) return;
    if (!lockRequired) return;

    if (!operator) setShowLockModal(true);
  }, [isAuthRoute, hasActiveContext, lockRequired, operator]);

  const value = useMemo<Ctx>(
    () => ({
      locked,
      lockRequired,
      operator,
      setOperator,
      clearOperator,
      openLockModal,
      closeLockModal,
      lockNow,
      unlockWorkstation,
      getActingContextClient,
    }),
    [
      locked,
      lockRequired,
      operator,
      setOperator,
      clearOperator,
      openLockModal,
      closeLockModal,
      lockNow,
      unlockWorkstation,
      getActingContextClient,
    ]
  );

  return (
    <WorkstationLockContext.Provider value={value}>
      {children}

      {/* Keep UI as-is (your glass modal lives inside the screen component) */}
      {showLockModal ? <WorkstationLockScreen /> : null}
    </WorkstationLockContext.Provider>
  );
}

/* ===================== Hook ===================== */

export function useWorkstation() {
  const ctx = useContext(WorkstationLockContext);
  if (!ctx) throw new Error("useWorkstation must be used within WorkstationLockProvider");
  return ctx;
}

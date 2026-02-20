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

type Operator = {
  teamMemberId: string;
  orgId: string;
  locationId: string;
  name: string;
  initials: string | null;
  role: string | null;
};

type Ctx = {
  locked: boolean;
  operator: Operator | null;
  lockNow: () => void;
  clearOperator: () => void;
  setOperator: (op: Operator) => void;
  bump: () => void;
  getActingContextClient: () => {
    acted_by_team_member_id: string | null;
    acted_by_initials: string | null;
  };
};

const WorkstationCtx = createContext<Ctx | null>(null);

const LS_KEY = "tt_active_operator_v1";
const IDLE_MS = 10 * 60 * 1000; // 10 minutes (change if you want)

function safeJsonParse<T>(s: string | null): T | null {
  if (!s) return null;
  try {
    return JSON.parse(s) as T;
  } catch {
    return null;
  }
}

export function WorkstationLockProvider({ children }: { children: React.ReactNode }) {
  const [locked, setLocked] = useState<boolean>(true);
  const [operator, setOperatorState] = useState<Operator | null>(null);

  const idleTimer = useRef<number | null>(null);

  const clearIdle = useCallback(() => {
    if (idleTimer.current) window.clearTimeout(idleTimer.current);
    idleTimer.current = null;
  }, []);

  const armIdle = useCallback(() => {
    clearIdle();
    idleTimer.current = window.setTimeout(() => {
      setLocked(true);
    }, IDLE_MS);
  }, [clearIdle]);

  const bump = useCallback(() => {
    if (!operator) return;
    if (locked) return;
    armIdle();
  }, [operator, locked, armIdle]);

  const lockNow = useCallback(() => {
    setLocked(true);
    clearIdle();
  }, [clearIdle]);

  const clearOperator = useCallback(() => {
    setOperatorState(null);
    localStorage.removeItem(LS_KEY);
    setLocked(true);
    clearIdle();
  }, [clearIdle]);

  const setOperator = useCallback(
    (op: Operator) => {
      setOperatorState(op);
      localStorage.setItem(LS_KEY, JSON.stringify(op));
      setLocked(false);
      armIdle();
    },
    [armIdle]
  );

  const getActingContextClient = useCallback(() => {
    return {
      acted_by_team_member_id: operator?.teamMemberId ?? null,
      acted_by_initials: (operator?.initials ?? "").trim().toUpperCase() || null,
    };
  }, [operator]);

  // Load saved operator ONCE on mount
  useEffect(() => {
    const saved = safeJsonParse<Operator>(localStorage.getItem(LS_KEY));
    if (saved?.teamMemberId) {
      setOperatorState(saved);
      setLocked(false);
    } else {
      setLocked(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Global activity listeners
  useEffect(() => {
    const events = ["mousemove", "mousedown", "keydown", "touchstart", "scroll"];
    const handler = () => bump();

    events.forEach((e) => window.addEventListener(e, handler, { passive: true }));
    return () => {
      events.forEach((e) => window.removeEventListener(e, handler as any));
    };
  }, [bump]);

  // Arm timer when unlocked/operator exists
  useEffect(() => {
    clearIdle();
    if (!operator) {
      setLocked(true);
      return;
    }
    if (!locked) armIdle();
    return () => clearIdle();
  }, [operator, locked, armIdle, clearIdle]);

  const value = useMemo<Ctx>(
    () => ({
      locked,
      operator,
      lockNow,
      clearOperator,
      setOperator,
      bump,
      getActingContextClient,
    }),
    [locked, operator, lockNow, clearOperator, setOperator, bump, getActingContextClient]
  );

  return <WorkstationCtx.Provider value={value}>{children}</WorkstationCtx.Provider>;
}

export function useWorkstation() {
  const ctx = useContext(WorkstationCtx);
  if (!ctx) throw new Error("useWorkstation must be used inside WorkstationLockProvider");
  return ctx;
}
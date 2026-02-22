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
  getActingContextClient: () => {
    acted_by_team_member_id: string | null;
    acted_by_initials: string | null;
  };
};

const WorkstationCtx = createContext<Ctx | null>(null);

const LS_KEY = "tt_active_operator_v1";
const IDLE_MS = 3 * 60 * 1000; // 3 minutes

function safeJsonParse<T>(s: string | null): T | null {
  if (!s) return null;
  try {
    return JSON.parse(s) as T;
  } catch {
    return null;
  }
}

export function WorkstationLockProvider({ children }: { children: React.ReactNode }) {
  const [locked, setLocked] = useState(false);
  const [operator, setOperatorState] = useState<Operator | null>(null);

  const idleTimer = useRef<number | null>(null);

  const clearIdle = useCallback(() => {
    if (idleTimer.current) window.clearTimeout(idleTimer.current);
    idleTimer.current = null;
  }, []);

  const armIdle = useCallback(() => {
    clearIdle();
    idleTimer.current = window.setTimeout(() => setLocked(true), IDLE_MS);
  }, [clearIdle]);

  const bump = useCallback(() => {
    if (!operator) return; // nobody selected, stay locked
    if (locked) return; // don't unlock by wiggling
    armIdle();
  }, [operator, locked, armIdle]);

  const lockNow = useCallback(() => {
    setLocked(true);
  }, []);

  const clearOperator = useCallback(() => {
    setOperatorState(null);
    localStorage.removeItem(LS_KEY);
    setLocked(true);

    // Clear server operator cookie/session
    fetch("/api/workstation/clear", { method: "POST" }).catch(() => {});
  }, []);

  const setOperator = useCallback((op: Operator) => {
    setOperatorState(op);
    localStorage.setItem(LS_KEY, JSON.stringify(op));
    setLocked(false);

    // ✅ Ensure middleware + nav gating can read the operator role via cookie
    fetch("/api/workstation/set", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        teamMemberId: op.teamMemberId,
        orgId: op.orgId,
        locationId: op.locationId,
        role: op.role,
        initials: op.initials,
        name: op.name,
      }),
    }).catch(() => {});
  }, []);

  const getActingContextClient = useCallback(() => {
    return {
      acted_by_team_member_id: operator?.teamMemberId ?? null,
      acted_by_initials: (operator?.initials ?? "").trim().toUpperCase() || null,
    };
  }, [operator]);

  // Load from localStorage on mount
  useEffect(() => {
    const saved = safeJsonParse<Operator>(localStorage.getItem(LS_KEY));
    if (saved?.teamMemberId) {
      setOperatorState(saved);
      setLocked(false);
    } else {
      setLocked(true);
    }
  }, []);

  // Global event listeners for idle tracking
  useEffect(() => {
    const events = ["mousemove", "mousedown", "keydown", "touchstart", "scroll"] as const;
    const handler = () => bump();
    events.forEach((e) => window.addEventListener(e, handler, { passive: true }));
    return () => events.forEach((e) => window.removeEventListener(e, handler as any));
  }, [bump]);

  // Arm timer when operator set/unlocked
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
    () => ({ locked, operator, lockNow, clearOperator, setOperator, getActingContextClient }),
    [locked, operator, lockNow, clearOperator, setOperator, getActingContextClient]
  );

  return <WorkstationCtx.Provider value={value}>{children}</WorkstationCtx.Provider>;
}

export function useWorkstation() {
  const ctx = useContext(WorkstationCtx);
  if (!ctx) throw new Error("useWorkstation must be used inside WorkstationLockProvider");
  return ctx;
}
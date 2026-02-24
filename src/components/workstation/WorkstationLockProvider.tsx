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

  // UI helpers
  openLockModal: () => void;

  // State transitions
  lockNow: () => void;
  clearOperator: () => void;
  setOperator: (op: Operator) => void;

  // For inserts/updates
  getActingContextClient: () => {
    acted_by_team_member_id: string | null;
    acted_by_initials: string | null;
  };
};

const WorkstationCtx = createContext<Ctx | null>(null);

const LS_OPERATOR = "tt_active_operator_v1";
const LS_LOCKED = "tt_ws_locked_v1";
const IDLE_MS = 3 * 60 * 1000; // 3 minutes

function safeJsonParse<T>(s: string | null): T | null {
  if (!s) return null;
  try {
    return JSON.parse(s) as T;
  } catch {
    return null;
  }
}

export function WorkstationLockProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [locked, setLocked] = useState(false);
  const [operator, setOperatorState] = useState<Operator | null>(null);

  const idleTimer = useRef<number | null>(null);

  const clearIdle = useCallback(() => {
    if (idleTimer.current) window.clearTimeout(idleTimer.current);
    idleTimer.current = null;
  }, []);

  const armIdle = useCallback(() => {
    clearIdle();
    idleTimer.current = window.setTimeout(() => {
      // idle lock should behave like manual lock (persist + cookie clear)
      setLocked(true);
      try {
        localStorage.setItem(LS_LOCKED, "1");
        window.dispatchEvent(new Event("tt-workstation-changed"));
      } catch {}
      fetch("/api/workstation/clear", { method: "POST" }).catch(() => {});
    }, IDLE_MS);
  }, [clearIdle]);

  const bump = useCallback(() => {
    // No operator means locked by definition
    if (!operator) return;
    // Don't unlock by wiggling
    if (locked) return;
    armIdle();
  }, [operator, locked, armIdle]);

  const openLockModal = useCallback(() => {
    try {
      window.dispatchEvent(new Event("tt-open-workstation-lock"));
    } catch {}
  }, []);

  const lockNow = useCallback(() => {
    setLocked(true);
    try {
      localStorage.setItem(LS_LOCKED, "1");
      window.dispatchEvent(new Event("tt-workstation-changed"));
    } catch {}

    // Clear server operator cookie/session so middleware/gating can react
    fetch("/api/workstation/clear", { method: "POST" }).catch(() => {});
  }, []);

  const clearOperator = useCallback(() => {
    setOperatorState(null);
    setLocked(true);

    try {
      localStorage.removeItem(LS_OPERATOR);
      localStorage.setItem(LS_LOCKED, "1");
      window.dispatchEvent(new Event("tt-workstation-changed"));
    } catch {}

    fetch("/api/workstation/clear", { method: "POST" }).catch(() => {});
  }, []);

  const setOperator = useCallback((op: Operator) => {
    setOperatorState(op);
    setLocked(false);

    try {
      localStorage.setItem(LS_OPERATOR, JSON.stringify(op));
      localStorage.removeItem(LS_LOCKED);
      window.dispatchEvent(new Event("tt-workstation-changed"));
    } catch {}

    // Ensure middleware + nav gating can read the operator role via cookie
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
      acted_by_initials:
        (operator?.initials ?? "").trim().toUpperCase() || null,
    };
  }, [operator]);

  // Load from localStorage on mount (operator + locked flag)
  useEffect(() => {
    const savedOp = safeJsonParse<Operator>(localStorage.getItem(LS_OPERATOR));
    const savedLocked = localStorage.getItem(LS_LOCKED) === "1";

    if (savedOp?.teamMemberId) {
      setOperatorState(savedOp);
      setLocked(savedLocked ? true : false);

      // If locked, ensure server cookie is cleared so middleware agrees
      if (savedLocked) {
        fetch("/api/workstation/clear", { method: "POST" }).catch(() => {});
      }
    } else {
      setOperatorState(null);
      setLocked(true);
      try {
        localStorage.setItem(LS_LOCKED, "1");
      } catch {}
    }
  }, []);

  // Global event listeners for idle tracking
  useEffect(() => {
    const events = [
      "mousemove",
      "mousedown",
      "keydown",
      "touchstart",
      "scroll",
    ] as const;
    const handler = () => bump();
    events.forEach((e) =>
      window.addEventListener(e, handler, { passive: true })
    );
    return () =>
      events.forEach((e) => window.removeEventListener(e, handler as any));
  }, [bump]);

  // Arm timer when operator set/unlocked
  useEffect(() => {
    clearIdle();

    if (!operator) {
      setLocked(true);
      try {
        localStorage.setItem(LS_LOCKED, "1");
      } catch {}
      return;
    }

    if (!locked) armIdle();

    return () => clearIdle();
  }, [operator, locked, armIdle, clearIdle]);

  const value = useMemo<Ctx>(
    () => ({
      locked,
      operator,
      openLockModal,
      lockNow,
      clearOperator,
      setOperator,
      getActingContextClient,
    }),
    [
      locked,
      operator,
      openLockModal,
      lockNow,
      clearOperator,
      setOperator,
      getActingContextClient,
    ]
  );

  return (
    <WorkstationCtx.Provider value={value}>{children}</WorkstationCtx.Provider>
  );
}

export function useWorkstation() {
  const ctx = useContext(WorkstationCtx);
  if (!ctx)
    throw new Error("useWorkstation must be used inside WorkstationLockProvider");
  return ctx;
}
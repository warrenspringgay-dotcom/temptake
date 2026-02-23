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

  orgId: string | null;
  locationId: string | null;

  openLockModal: () => void;
  lockNow: () => void;
  clearOperator: () => void;
  setOperator: (op: Operator) => void;

  getActingContextClient: () => {
    acted_by_team_member_id: string | null;
    acted_by_initials: string | null;
  };
};

const WorkstationCtx = createContext<Ctx | null>(null);

const LS_OPERATOR = "tt_active_operator_v1";
const LS_LOCKED = "tt_ws_locked_v1";
const IDLE_MS = 3 * 60 * 1000;

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

  const [orgId, setOrgId] = useState<string | null>(null);
  const [locationId, setLocationId] = useState<string | null>(null);

  const idleTimer = useRef<number | null>(null);

  const clearIdle = useCallback(() => {
    if (idleTimer.current) window.clearTimeout(idleTimer.current);
    idleTimer.current = null;
  }, []);

  const armIdle = useCallback(() => {
    clearIdle();
    idleTimer.current = window.setTimeout(() => {
      setLocked(true);
      localStorage.setItem(LS_LOCKED, "1");
      fetch("/api/workstation/clear", { method: "POST" }).catch(() => {});
    }, IDLE_MS);
  }, [clearIdle]);

  const bump = useCallback(() => {
    if (!operator || locked) return;
    armIdle();
  }, [operator, locked, armIdle]);

  const openLockModal = useCallback(() => {
    window.dispatchEvent(new Event("tt-open-workstation-lock"));
  }, []);

  const lockNow = useCallback(() => {
    setLocked(true);
    localStorage.setItem(LS_LOCKED, "1");
    fetch("/api/workstation/clear", { method: "POST" }).catch(() => {});
  }, []);

  const clearOperator = useCallback(() => {
    setOperatorState(null);
    setLocked(true);
    localStorage.removeItem(LS_OPERATOR);
    localStorage.setItem(LS_LOCKED, "1");
    fetch("/api/workstation/clear", { method: "POST" }).catch(() => {});
  }, []);

  const setOperator = useCallback((op: Operator) => {
    setOperatorState(op);
    setLocked(false);
    localStorage.setItem(LS_OPERATOR, JSON.stringify(op));
    localStorage.removeItem(LS_LOCKED);

    fetch("/api/workstation/set", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(op),
    }).catch(() => {});
  }, []);

  const getActingContextClient = useCallback(() => {
    return {
      acted_by_team_member_id: operator?.teamMemberId ?? null,
      acted_by_initials:
        (operator?.initials ?? "").trim().toUpperCase() || null,
    };
  }, [operator]);

  // 🔥 NEW: load active org + location independently of operator
  useEffect(() => {
    async function loadProfile() {
      const res = await fetch("/api/profile/active-context");
      const json = await res.json().catch(() => ({}));
      setOrgId(json?.orgId ?? null);
      setLocationId(json?.locationId ?? null);
    }

    loadProfile();
  }, []);

  useEffect(() => {
    const savedOp = safeJsonParse<Operator>(
      localStorage.getItem(LS_OPERATOR)
    );
    const savedLocked = localStorage.getItem(LS_LOCKED) === "1";

    if (savedOp?.teamMemberId) {
      setOperatorState(savedOp);
      setLocked(savedLocked ? true : false);
    } else {
      setLocked(true);
    }
  }, []);

  useEffect(() => {
    const events = ["mousemove", "mousedown", "keydown", "touchstart", "scroll"] as const;
    const handler = () => bump();
    events.forEach((e) =>
      window.addEventListener(e, handler, { passive: true })
    );
    return () =>
      events.forEach((e) => window.removeEventListener(e, handler as any));
  }, [bump]);

  useEffect(() => {
    clearIdle();

    if (!operator) {
      setLocked(true);
      localStorage.setItem(LS_LOCKED, "1");
      return;
    }

    if (!locked) armIdle();
    return () => clearIdle();
  }, [operator, locked, armIdle, clearIdle]);

  const value = useMemo<Ctx>(
    () => ({
      locked,
      operator,
      orgId,
      locationId,
      openLockModal,
      lockNow,
      clearOperator,
      setOperator,
      getActingContextClient,
    }),
    [locked, operator, orgId, locationId, openLockModal, lockNow, clearOperator, setOperator, getActingContextClient]
  );

  return (
    <WorkstationCtx.Provider value={value}>
      {children}
    </WorkstationCtx.Provider>
  );
}

export function useWorkstation() {
  const ctx = useContext(WorkstationCtx);
  if (!ctx)
    throw new Error("useWorkstation must be used inside WorkstationLockProvider");
  return ctx;
}
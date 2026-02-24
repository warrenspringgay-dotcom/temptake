"use client";

import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import { supabase } from "@/lib/supabaseBrowser";
import WorkstationLockScreen from "@/components/workstation/WorkstationLockScreen";
import type { AuthChangeEvent, Session } from "@supabase/supabase-js";
const LS_LOCKED = "tt_workstation_forced";
const LS_OPERATOR = "tt_workstation_operator";

export type Operator = {
  teamMemberId: string;
  orgId: string;
  locationId: string;
  name: string | null;
  initials: string | null;
  role: string | null;
};

export type ActingContext = {
  acted_by_team_member_id?: string | null;
  acted_by_initials?: string | null;
};

export type Ctx = {
  /** NEW (preferred) */
  isLocked: boolean;
  /** Backwards-compat alias for older code */
  locked: boolean;

  isModalOpen: boolean;
  operator: Operator | null;

  openLockModal: () => void;
  closeLockModal: () => void;

  lockNow: () => void;
  unlockWorkstation: () => void;

  setOperator: (op: Operator) => void;
  clearOperator: () => void;

  getActingContextClient: () => ActingContext;
};

const WorkstationCtx = createContext<Ctx | null>(null);

function readBoolLS(key: string, fallback = false) {
  if (typeof window === "undefined") return fallback;
  const v = window.localStorage.getItem(key);
  if (v == null) return fallback;
  return v === "true";
}

function writeBoolLS(key: string, value: boolean) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(key, value ? "true" : "false");
}

function readJsonLS<T>(key: string): T | null {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(key);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

function writeJsonLS(key: string, value: unknown) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(key, JSON.stringify(value));
}

function removeLS(key: string) {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(key);
}

function isAuthRoute(pathname: string) {
  return (
    pathname === "/login" ||
    pathname.startsWith("/login") ||
    pathname === "/signup" ||
    pathname.startsWith("/signup") ||
    pathname === "/forgot-password" ||
    pathname.startsWith("/forgot-password") ||
    pathname === "/reset-password" ||
    pathname.startsWith("/reset-password")
  );
}

export function WorkstationLockProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const authRoute = isAuthRoute(pathname || "");

  const [hasSession, setHasSession] = useState(false);

  const [isLocked, setIsLocked] = useState(false);
  const [operator, setOperatorState] = useState<Operator | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Hydrate from storage once
  useEffect(() => {
    const locked = readBoolLS(LS_LOCKED, false);
    const op = readJsonLS<Operator>(LS_OPERATOR);

    setIsLocked(locked);
    setOperatorState(op ?? null);

    if (locked && !authRoute) setIsModalOpen(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Track Supabase session
  useEffect(() => {
    let mounted = true;

    (async () => {
      const { data } = await supabase.auth.getSession();
      if (!mounted) return;
      setHasSession(!!data?.session);
    })();

    const { data: sub } = supabase.auth.onAuthStateChange((_event: AuthChangeEvent, session: Session | null) => {
      setHasSession(!!session);
    });

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  // Never show lock UI on auth routes or without session
  useEffect(() => {
    if (!hasSession || authRoute) {
      setIsModalOpen(false);
    } else {
      if (isLocked) setIsModalOpen(true);
    }
  }, [hasSession, authRoute, isLocked]);

  // Multi-tab sync
  useEffect(() => {
    function onStorage(e: StorageEvent) {
      if (e.key === LS_LOCKED) setIsLocked(readBoolLS(LS_LOCKED, false));
      if (e.key === LS_OPERATOR) setOperatorState(readJsonLS<Operator>(LS_OPERATOR));
    }
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  function lockNow() {
    setIsLocked(true);
    writeBoolLS(LS_LOCKED, true);
    if (!authRoute) setIsModalOpen(true);
  }

  function unlockWorkstation() {
    setIsLocked(false);
    writeBoolLS(LS_LOCKED, false);
    setIsModalOpen(false);
  }

  function openLockModal() {
    setIsLocked(true);
    writeBoolLS(LS_LOCKED, true);
    if (!authRoute) setIsModalOpen(true);
  }

  function closeLockModal() {
    setIsModalOpen(false);
  }

  function setOperator(op: Operator) {
    setOperatorState(op);
    writeJsonLS(LS_OPERATOR, op);

    setIsLocked(false);
    writeBoolLS(LS_LOCKED, false);
    setIsModalOpen(false);
  }

  function clearOperator() {
    setOperatorState(null);
    removeLS(LS_OPERATOR);
  }

  function getActingContextClient(): ActingContext {
    return {
      acted_by_team_member_id: operator?.teamMemberId ?? null,
      acted_by_initials: operator?.initials ?? null,
    };
  }

  const value: Ctx = useMemo(
    () => ({
      isLocked,
      locked: isLocked, // 👈 alias for your older code (IncidentModal etc.)
      isModalOpen,
      operator,

      openLockModal,
      closeLockModal,

      lockNow,
      unlockWorkstation,

      setOperator,
      clearOperator,

      getActingContextClient,
    }),
    [isLocked, isModalOpen, operator]
  );

  return (
    <WorkstationCtx.Provider value={value}>
      {children}

      {hasSession && !authRoute && isLocked && isModalOpen ? (
        <WorkstationLockScreen onClose={closeLockModal} />
      ) : null}
    </WorkstationCtx.Provider>
  );
}

export function useWorkstation() {
  const ctx = useContext(WorkstationCtx);
  if (!ctx) throw new Error("useWorkstation must be used within <WorkstationLockProvider>");
  return ctx;
}
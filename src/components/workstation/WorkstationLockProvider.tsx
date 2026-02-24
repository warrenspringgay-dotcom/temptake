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
import type { AuthChangeEvent, Session } from "@supabase/supabase-js";

import { supabase } from "@/lib/supabaseBrowser";
import { getActiveOrgIdClient } from "@/lib/orgClient";
import { getActiveLocationIdClient } from "@/lib/locationClient";

import WorkstationLockScreen from "@/components/workstation/WorkstationLockScreen";

const LS_LOCKED = "tt_ws_locked";
const LS_OPERATOR = "tt_ws_operator";
const LS_ACTING = "tt_ws_acting";

type ActingContext = {
  acted_by_team_member_id?: string | null;
  acted_by_initials?: string | null;
};

export type Operator = {
  teamMemberId: string;
  orgId: string;
  locationId: string;
  name: string | null;
  initials: string | null;
  role: string | null;
};

type Ctx = {
  // state
  locked: boolean;
  lockRequired: boolean;
  showLockModal: boolean;
  operator: Operator | null;

  // active context
  orgId: string | null;
  locationId: string | null;

  // actions
  openLockModal: () => void;
  closeLockModal: () => void;

  lockNow: () => void;
  unlockWorkstation: () => void;

  setOperator: (op: Operator | null) => void;
  clearOperator: () => void;

  setActingContextClient: (ctx: ActingContext) => void;
  getActingContextClient: () => ActingContext;
};

const WorkstationLockContext = createContext<Ctx | null>(null);

function readJson<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

function writeJson<T>(key: string, value: T) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // ignore
  }
}

function readBool(key: string, fallback: boolean) {
  try {
    const raw = localStorage.getItem(key);
    if (raw === null) return fallback;
    return raw === "true";
  } catch {
    return fallback;
  }
}

function writeBool(key: string, value: boolean) {
  try {
    localStorage.setItem(key, value ? "true" : "false");
  } catch {
    // ignore
  }
}

function isAuthRoute(pathname: string) {
  // Add any other auth-ish pages you have.
  return (
    pathname === "/login" ||
    pathname.startsWith("/login") ||
    pathname === "/signup" ||
    pathname.startsWith("/signup") ||
    pathname === "/reset-password" ||
    pathname.startsWith("/reset-password")
  );
}

export function WorkstationLockProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  const [orgId, setOrgId] = useState<string | null>(null);
  const [locationId, setLocationId] = useState<string | null>(null);

  const [hasSession, setHasSession] = useState<boolean>(false);

  const [locked, setLockedState] = useState<boolean>(() => readBool(LS_LOCKED, false));
  const [lockRequired, setLockRequired] = useState<boolean>(false);
  const [showLockModal, setShowLockModal] = useState<boolean>(false);

  const [operator, setOperatorState] = useState<Operator | null>(() => readJson<Operator>(LS_OPERATOR));

  const lastContextRef = useRef<{ orgId: string | null; locationId: string | null }>({
    orgId: null,
    locationId: null,
  });

  const setLocked = useCallback((v: boolean) => {
    setLockedState(v);
    writeBool(LS_LOCKED, v);
  }, []);

  const setOperator = useCallback((op: Operator | null) => {
    setOperatorState(op);
    writeJson<Operator | null>(LS_OPERATOR, op);
  }, []);

  const clearOperator = useCallback(() => {
    setOperator(null);
  }, [setOperator]);

  const openLockModal = useCallback(() => setShowLockModal(true), []);
  const closeLockModal = useCallback(() => setShowLockModal(false), []);

  const lockNow = useCallback(() => {
    setLocked(true);
    setShowLockModal(true);
  }, [setLocked]);

  const unlockWorkstation = useCallback(() => {
    setLocked(false);
    setShowLockModal(false);
  }, [setLocked]);

  const setActingContextClient = useCallback((ctx: ActingContext) => {
    writeJson(LS_ACTING, ctx);
  }, []);

  const getActingContextClient = useCallback((): ActingContext => {
    return readJson<ActingContext>(LS_ACTING) ?? {};
  }, []);

  const refreshActiveContext = useCallback(async () => {
    // These helpers might be sync or async depending on your implementation.
    const o = await Promise.resolve(getActiveOrgIdClient() as any);
    const l = await Promise.resolve(getActiveLocationIdClient() as any);

    const nextOrgId = (typeof o === "string" ? o : null) as string | null;
    const nextLocId = (typeof l === "string" ? l : null) as string | null;

    setOrgId(nextOrgId);
    setLocationId(nextLocId);

    lastContextRef.current = { orgId: nextOrgId, locationId: nextLocId };

    // If there's no active context, do NOT enforce lock (and don't show modal).
    if (!nextOrgId || !nextLocId) {
      setLockRequired(false);
      setLocked(false);
      setShowLockModal(false);
      return { orgId: nextOrgId, locationId: nextLocId };
    }

    // Context exists, we can enforce lock.
    setLockRequired(true);

    // If we have an operator but it's for a different org/location, clear it and lock.
    if (operator && (operator.orgId !== nextOrgId || operator.locationId !== nextLocId)) {
      setOperator(null);
      setLocked(true);
      setShowLockModal(true);
    }

    return { orgId: nextOrgId, locationId: nextLocId };
  }, [operator, setLocked, setOperator]);

  // Keep hasSession accurate.
  useEffect(() => {
    let mounted = true;

    (async () => {
      const { data } = await supabase.auth.getSession();
      if (!mounted) return;
      setHasSession(!!data.session);
    })();

    const { data: sub } = supabase.auth.onAuthStateChange(
      (_event: AuthChangeEvent, session: Session | null) => {
        setHasSession(!!session);

        // If user signed out, nuke workstation state so FAB doesn't stay "locked".
        if (!session) {
          setLockRequired(false);
          setLocked(false);
          setShowLockModal(false);
          setOperator(null);
          setOrgId(null);
          setLocationId(null);
        }
      }
    );

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, [setLocked, setOperator]);

  // Refresh context whenever route changes (after auth/session is known).
  useEffect(() => {
    if (!hasSession) return;
    refreshActiveContext();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasSession, pathname]);

  // Hard gate: never show workstation lock UI on auth pages or without a session.
  useEffect(() => {
    if (!hasSession || isAuthRoute(pathname)) {
      setShowLockModal(false);
      setLockRequired(false);
      setLocked(false);
      return;
    }

    // If we require lock and are locked, show modal.
    if (lockRequired && locked) setShowLockModal(true);
  }, [hasSession, pathname, lockRequired, locked, setLocked]);

  const value: Ctx = useMemo(
    () => ({
      locked,
      lockRequired,
      showLockModal,
      operator,

      orgId,
      locationId,

      openLockModal,
      closeLockModal,

      lockNow,
      unlockWorkstation,

      setOperator,
      clearOperator,

      setActingContextClient,
      getActingContextClient,
    }),
    [
      locked,
      lockRequired,
      showLockModal,
      operator,
      orgId,
      locationId,
      openLockModal,
      closeLockModal,
      lockNow,
      unlockWorkstation,
      setOperator,
      clearOperator,
      setActingContextClient,
      getActingContextClient,
    ]
  );

  return (
    <WorkstationLockContext.Provider value={value}>
      {children}

      {/* Don't mount this on auth pages or without a Supabase session */}
      {hasSession && !isAuthRoute(pathname) && showLockModal ? (
        <WorkstationLockScreen onClose={closeLockModal} />
      ) : null}
    </WorkstationLockContext.Provider>
  );
}

export function useWorkstation() {
  const ctx = useContext(WorkstationLockContext);
  if (!ctx) throw new Error("useWorkstation must be used within <WorkstationLockProvider>");
  return ctx;
}
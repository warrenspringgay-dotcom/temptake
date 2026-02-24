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
import { supabase } from "@/lib/supabaseBrowser";
import { getActiveOrgIdClient } from "@/lib/orgClient";
import { getActiveLocationIdClient } from "@/lib/locationClient";
import type { AuthChangeEvent, Session } from "@supabase/supabase-js";

const LS_OPERATOR = "tt_workstation_operator";
const LS_FORCED_LOCK = "tt_workstation_forced_lock";

/** This is the shape other components must use */
export type Operator = {
  teamMemberId: string;
  orgId: string;
  locationId: string;
  name: string | null;
  initials: string | null;
  role: string | null;
};

export type ActingContext = {
  acted_by_team_member_id: string | null;
  acted_by_initials: string | null;
};

type Ctx = {
  // Context
  orgId: string | null;
  locationId: string | null;
  hasSession: boolean;

  // Operator / lock state
  operator: Operator | null;
  locked: boolean;

  // Modal control
  openLockModal: () => void;
  closeLockModal: () => void;
  isLockModalOpen: boolean;

  // Actions
  setOperator: (op: Operator | null) => void;
  clearOperator: () => void;
  lockNow: () => void;
  unlockWorkstation: () => void;

  // Acting context used by logs/sign-offs
  getActingContextClient: () => ActingContext;
};

const WorkstationCtx = createContext<Ctx | null>(null);

export function useWorkstation() {
  const v = useContext(WorkstationCtx);
  if (!v) throw new Error("useWorkstation must be used within <WorkstationLockProvider>");
  return v;
}

function safeJsonParse<T>(s: string | null): T | null {
  if (!s) return null;
  try {
    return JSON.parse(s) as T;
  } catch {
    return null;
  }
}

function isAuthRoute(pathname: string) {
  // Keep this blunt and safe. You can extend it.
  return (
    pathname === "/login" ||
    pathname === "/signup" ||
    pathname.startsWith("/auth") ||
    pathname.startsWith("/reset") ||
    pathname.startsWith("/forgot")
  );
}

async function resolveMaybePromise<T>(v: T | Promise<T>): Promise<T> {
  return await Promise.resolve(v);
}

export default function WorkstationLockProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  const [orgId, setOrgId] = useState<string | null>(null);
  const [locationId, setLocationId] = useState<string | null>(null);

  const [hasSession, setHasSession] = useState(false);

  const [operator, setOperatorState] = useState<Operator | null>(null);
  const [locked, setLocked] = useState<boolean>(() => {
    // Default locked unless explicitly unlocked
    const forced = localStorage.getItem(LS_FORCED_LOCK);
    return forced === "true" || forced === null; // default true
  });

  const [isLockModalOpen, setIsLockModalOpen] = useState(false);

  const lastAutoAssignRef = useRef<string>(""); // (orgId|locationId|userId) to prevent loops

  const openLockModal = useCallback(() => setIsLockModalOpen(true), []);
  const closeLockModal = useCallback(() => setIsLockModalOpen(false), []);

  const persistOperator = useCallback((op: Operator | null) => {
    if (!op) {
      localStorage.removeItem(LS_OPERATOR);
      return;
    }
    localStorage.setItem(LS_OPERATOR, JSON.stringify(op));
  }, []);

  const setOperator = useCallback(
    (op: Operator | null) => {
      setOperatorState(op);
      persistOperator(op);
    },
    [persistOperator]
  );

  const clearOperator = useCallback(() => {
    setOperator(null);
    // lock again if operator cleared
    setLocked(true);
    localStorage.setItem(LS_FORCED_LOCK, "true");
  }, [setOperator]);

  const lockNow = useCallback(() => {
    setLocked(true);
    localStorage.setItem(LS_FORCED_LOCK, "true");
    openLockModal();
  }, [openLockModal]);

  const unlockWorkstation = useCallback(() => {
    setLocked(false);
    localStorage.setItem(LS_FORCED_LOCK, "false");
    closeLockModal();
  }, [closeLockModal]);

  // Keep org/location in sync (these helpers may be async)
  useEffect(() => {
    let cancelled = false;

    async function tick() {
      const o = await resolveMaybePromise(getActiveOrgIdClient() as any);
      const l = await resolveMaybePromise(getActiveLocationIdClient() as any);
      if (cancelled) return;
      setOrgId(o ?? null);
      setLocationId(l ?? null);
    }

    tick();
    const id = setInterval(tick, 1500);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, []);

  // Track auth session
  useEffect(() => {
    let cancelled = false;

    async function init() {
      const { data } = await supabase.auth.getSession();
      if (cancelled) return;
      setHasSession(!!data.session);
    }

    init();

    const { data: sub } = supabase.auth.onAuthStateChange(
      (_event: AuthChangeEvent, session: Session | null) => {
        setHasSession(!!session);
        // If user logs out, wipe operator + lock
        if (!session) {
          setOperator(null);
          setLocked(true);
          localStorage.setItem(LS_FORCED_LOCK, "true");
          setIsLockModalOpen(false);
        }
      }
    );

    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, [setOperator]);

  // Rehydrate operator from storage (only if it matches current org/location)
  useEffect(() => {
    const stored = safeJsonParse<Operator>(localStorage.getItem(LS_OPERATOR));
    if (!stored) return;

    // If context changed, don't keep stale operator
    if (!orgId || !locationId) return;
    if (stored.orgId !== orgId || stored.locationId !== locationId) return;

    setOperatorState(stored);
  }, [orgId, locationId]);

  // ✅ AUTO-ASSIGN OPERATOR FROM AUTH USER (fixes split lock after login)
  useEffect(() => {
    let cancelled = false;

    async function autoAssignFromAuth() {
      // only after auth + org + location exist
      if (!hasSession) return;
      if (!orgId || !locationId) return;

      // don't run on login/signup/etc
      if (isAuthRoute(pathname)) return;

      // if operator already set, nothing to do
      if (operator?.teamMemberId) return;

      const { data: userRes } = await supabase.auth.getUser();
      const userId = userRes?.user?.id ?? null;
      if (!userId) return;

      const key = `${orgId}|${locationId}|${userId}`;
      if (lastAutoAssignRef.current === key) return;
      lastAutoAssignRef.current = key;

      // Find team_member attached to this auth user.
      // IMPORTANT: keep pin_enabled separate from login_enabled. Auth login implies user_id exists.
      const { data, error } = await supabase
        .from("team_members")
        .select("id,name,initials,role,org_id,location_id,user_id,active")
        .eq("org_id", orgId)
        .eq("active", true)
        .eq("user_id", userId)
        .or(`location_id.eq.${locationId},location_id.is.null`)
        .order("location_id", { ascending: false }) // prefer exact location over null
        .limit(1);

      if (cancelled) return;
      if (error) return;

      const tm = data?.[0];
      if (!tm?.id) return;

      setOperator({
        teamMemberId: tm.id,
        orgId,
        locationId,
        name: tm.name ?? null,
        initials: (tm.initials ?? null) as any,
        role: tm.role ?? null,
      });

      // If we found an operator, unlock workstation automatically.
      unlockWorkstation();
    }

    autoAssignFromAuth();
    return () => {
      cancelled = true;
    };
  }, [hasSession, orgId, locationId, pathname, operator?.teamMemberId, setOperator, unlockWorkstation]);

  // If we are on auth routes, never show modal. Also avoid lock enforcement before org/location exists.
  const shouldAllowModal =
    hasSession && !!orgId && !!locationId && !isAuthRoute(pathname);

  // If modal got opened but route/session/context says “no”, close it.
  useEffect(() => {
    if (!shouldAllowModal && isLockModalOpen) setIsLockModalOpen(false);
  }, [shouldAllowModal, isLockModalOpen]);

  const getActingContextClient = useCallback((): ActingContext => {
    // Acting context is always derived from operator
    return {
      acted_by_team_member_id: operator?.teamMemberId ?? null,
      acted_by_initials: operator?.initials ?? null,
    };
  }, [operator]);

  const ctxValue = useMemo<Ctx>(
    () => ({
      orgId,
      locationId,
      hasSession,

      operator,
      locked,

      openLockModal,
      closeLockModal,
      isLockModalOpen: isLockModalOpen && shouldAllowModal,

      setOperator,
      clearOperator,
      lockNow,
      unlockWorkstation,

      getActingContextClient,
    }),
    [
      orgId,
      locationId,
      hasSession,
      operator,
      locked,
      openLockModal,
      closeLockModal,
      isLockModalOpen,
      shouldAllowModal,
      setOperator,
      clearOperator,
      lockNow,
      unlockWorkstation,
      getActingContextClient,
    ]
  );

  return (
    <WorkstationCtx.Provider value={ctxValue}>
      {children}
      {/* Only render the lock screen when it is actually valid to do so */}
      {ctxValue.isLockModalOpen ? (
        // NOTE: WorkstationLockScreen is imported lazily by consumer file;
        // rendering is done in ClientProviders in your setup.
        null
      ) : null}
    </WorkstationCtx.Provider>
  );
}
// src/components/workstation/WorkstationLockProvider.tsx
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

/** LocalStorage keys (do not rename) */
const LS_FORCE_LOCKED = "tt_workstation_force_locked"; // "true" | "false"
const LS_OPERATOR = "tt_workstation_operator"; // JSON Operator

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
  operator: Operator | null;
  locked: boolean;

  /** show the PIN modal */
  openLockModal: () => void;
  closeLockModal: () => void;

  /** hard lock right now */
  lockNow: () => void;

  /** unlock the workstation (operator must already be set) */
  unlockWorkstation: () => void;

  /** set/clear operator */
  setOperator: (op: Operator | null) => void;
  clearOperator: () => void;

  /** used by other UI that needs “acting by” metadata */
  getActingContextClient: () => ActingContext;
};

const Ctx = createContext<Ctx | null>(null);

function safeJsonParse<T>(s: string | null): T | null {
  if (!s) return null;
  try {
    return JSON.parse(s) as T;
  } catch {
    return null;
  }
}

function readLockedFromLS(): boolean {
  try {
    return localStorage.getItem(LS_FORCE_LOCKED) === "true";
  } catch {
    return false;
  }
}

function writeLockedToLS(v: boolean) {
  try {
    localStorage.setItem(LS_FORCE_LOCKED, v ? "true" : "false");
  } catch {}
}

function readOperatorFromLS(): Operator | null {
  if (typeof window === "undefined") return null;
  return safeJsonParse<Operator>(localStorage.getItem(LS_OPERATOR));
}

function writeOperatorToLS(op: Operator | null) {
  try {
    if (!op) localStorage.removeItem(LS_OPERATOR);
    else localStorage.setItem(LS_OPERATOR, JSON.stringify(op));
  } catch {}
}

async function readOrgAndLocation(): Promise<{ orgId: string | null; locationId: string | null }> {
  try {
    // These are async in your branch, so we await them.
    const [orgId, locationId] = await Promise.all([
      getActiveOrgIdClient(),
      getActiveLocationIdClient(),
    ]);
    return { orgId, locationId };
  } catch {
    return { orgId: null, locationId: null };
  }
}

export function WorkstationLockProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  const [hasSession, setHasSession] = useState<boolean>(false);

  const [locked, setLocked] = useState<boolean>(false);
  const [operator, setOperatorState] = useState<Operator | null>(null);

  const [showLockModal, setShowLockModal] = useState<boolean>(false);

  // ✅ org/location are async → keep in state
  const [orgId, setOrgId] = useState<string | null>(null);
  const [locationId, setLocationId] = useState<string | null>(null);

  const bootedRef = useRef(false);

  const isAuthPage =
    pathname === "/login" ||
    pathname?.startsWith("/login") ||
    pathname === "/signup" ||
    pathname?.startsWith("/signup");

  const setOperator = useCallback((op: Operator | null) => {
    setOperatorState(op);
    writeOperatorToLS(op);
  }, []);

  const clearOperator = useCallback(() => {
    setOperator(null);
  }, [setOperator]);

  const closeLockModal = useCallback(() => {
    setShowLockModal(false);
  }, []);

  // ✅ Refresh org/location when route changes (or after login redirect)
  useEffect(() => {
    let alive = true;
    (async () => {
      const { orgId: o, locationId: l } = await readOrgAndLocation();
      if (!alive) return;
      setOrgId(o);
      setLocationId(l);
    })();
    return () => {
      alive = false;
    };
  }, [pathname]);

  const openLockModal = useCallback(() => {
    if (isAuthPage) return;
    if (!hasSession) return;
    if (!orgId || !locationId) return;
    setShowLockModal(true);
  }, [hasSession, isAuthPage, orgId, locationId]);

  const lockNow = useCallback(() => {
    if (isAuthPage) return;
    if (!hasSession) return;
    if (!orgId || !locationId) return;

    writeLockedToLS(true);
    setLocked(true);
    setShowLockModal(true);
  }, [hasSession, isAuthPage, orgId, locationId]);

  const unlockWorkstation = useCallback(() => {
    writeLockedToLS(false);
    setLocked(false);
    setShowLockModal(false);
  }, []);

  const getActingContextClient = useCallback((): ActingContext => {
    const op = operator;
    return {
      acted_by_team_member_id: op?.teamMemberId ?? null,
      acted_by_initials: op?.initials ? String(op.initials).trim().toUpperCase() : null,
    };
  }, [operator]);

  /**
   * Session tracking
   */
  useEffect(() => {
    let unsub: { unsubscribe: () => void } | null = null;

    (async () => {
      const { data } = await supabase.auth.getSession();
      setHasSession(!!data.session);

      const { data: sub } = supabase.auth.onAuthStateChange(
        (_event: AuthChangeEvent, session: Session | null) => {
          setHasSession(!!session);

          if (!session) {
            // signing out: clear operator + unlock + close modal
            writeLockedToLS(false);
            setLocked(false);
            setShowLockModal(false);
            setOperator(null);
          } else {
            // signing in: refresh org/location after redirect settles
            setTimeout(async () => {
              const { orgId: o, locationId: l } = await readOrgAndLocation();
              setOrgId(o);
              setLocationId(l);
            }, 0);
          }
        }
      );

      unsub = sub.subscription;
    })();

    return () => {
      try {
        unsub?.unsubscribe();
      } catch {}
    };
  }, [setOperator]);

  /**
   * Boot: load persisted state (but never show modal on /login).
   */
  useEffect(() => {
    if (bootedRef.current) return;
    bootedRef.current = true;

    const lsLocked = readLockedFromLS();
    const lsOp = readOperatorFromLS();

    setLocked(lsLocked);
    setOperatorState(lsOp);
  }, []);

  /**
   * Auto-assign operator from auth user (kills split-lock).
   */
  useEffect(() => {
    if (isAuthPage) return;
    if (!hasSession) return;
    if (!orgId || !locationId) return;

    let alive = true;

    (async () => {
      const { data: sess } = await supabase.auth.getSession();
      const userId = sess.session?.user?.id;
      if (!userId || !alive) return;

      const { data, error } = await supabase
        .from("team_members")
        .select("id,name,initials,role,org_id,location_id,active")
        .eq("org_id", orgId)
        .eq("active", true)
        .eq("user_id", userId)
        .or(`location_id.eq.${locationId},location_id.is.null`)
        .order("location_id", { ascending: false })
        .limit(1);

      if (!alive) return;
      if (error) return;

      const row = data?.[0];
      if (!row?.id) return;

      setOperator({
        teamMemberId: row.id,
        orgId,
        locationId,
        name: row.name ?? null,
        initials: row.initials ?? null,
        role: row.role ?? null,
      });

      unlockWorkstation();
    })();

    return () => {
      alive = false;
    };
  }, [hasSession, isAuthPage, orgId, locationId, setOperator, unlockWorkstation]);

  /**
   * Modal visibility rules:
   * - Never on /login
   * - Only when locked + authed + org/location chosen
   */
  useEffect(() => {
    if (isAuthPage) {
      setShowLockModal(false);
      return;
    }
    if (!hasSession) {
      setShowLockModal(false);
      return;
    }
    if (!locked || !orgId || !locationId) {
      setShowLockModal(false);
      return;
    }
    setShowLockModal(true);
  }, [locked, hasSession, isAuthPage, orgId, locationId]);

  const value: Ctx = useMemo(
    () => ({
      operator,
      locked,

      openLockModal,
      closeLockModal,

      lockNow,
      unlockWorkstation,

      setOperator,
      clearOperator,

      getActingContextClient,
    }),
    [
      operator,
      locked,
      openLockModal,
      closeLockModal,
      lockNow,
      unlockWorkstation,
      setOperator,
      clearOperator,
      getActingContextClient,
    ]
  );

  const AUTO_LOCK_MS = 5 * 60 * 1000; // 5 minutes – tweak if needed
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // helper to clear/restart timer
  const resetInactivityTimer = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (!locked && operator) {
      timerRef.current = setTimeout(() => {
        console.log("[workstation] auto-locking after inactivity");
        setLocked(true);
        writeLockedToLS(true);
        setShowLockModal(true);
      }, AUTO_LOCK_MS);
    }
  }, [locked, operator]);

  // restart timer whenever lock state or operator changes
  useEffect(() => {
    resetInactivityTimer();
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [locked, operator, resetInactivityTimer]);

  // listen for user activity to reset timer
  useEffect(() => {
    const activity = () => resetInactivityTimer();
    window.addEventListener("mousemove", activity);
    window.addEventListener("mousedown", activity);
    window.addEventListener("keydown", activity);
    window.addEventListener("touchstart", activity);
    return () => {
      window.removeEventListener("mousemove", activity);
      window.removeEventListener("mousedown", activity);
      window.removeEventListener("keydown", activity);
      window.removeEventListener("touchstart", activity);
    };
  }, [resetInactivityTimer]);
  
  return (
    <Ctx.Provider value={value}>
      {children}
      {showLockModal ? <WorkstationLockScreen onClose={closeLockModal} /> : null}
    </Ctx.Provider>
  );
}

export function useWorkstation(): Ctx {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useWorkstation must be used within <WorkstationLockProvider>");
  return ctx;
}

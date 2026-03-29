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

/** LocalStorage keys */
const LS_FORCE_LOCKED = "tt_workstation_force_locked";
const LS_OPERATOR = "tt_workstation_operator";

// Cookies (middleware)
const CK_ACTIVE_ORG = "tt_active_org";
const CK_ACTIVE_LOCATION = "tt_active_location";
const CK_OPERATOR_ROLE = "tt_operator_role";

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

  openLockModal: () => void;
  closeLockModal: () => void;

  lockNow: () => void;
  unlockWorkstation: () => void;

  setOperator: (op: Operator | null) => void;
  clearOperator: () => void;

  getActingContextClient: () => ActingContext;
};

const Ctx = createContext<Ctx | null>(null);

/* ================= Helpers ================= */

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

function normalizeRole(role: string | null | undefined) {
  return String(role ?? "").trim().toLowerCase();
}

function setCookie(name: string, value: string, maxAgeSeconds = 60 * 60 * 24 * 365) {
  try {
    document.cookie = `${encodeURIComponent(name)}=${encodeURIComponent(
      value
    )}; Path=/; Max-Age=${maxAgeSeconds}; SameSite=Lax; Secure`;
  } catch {}
}

function clearCookie(name: string) {
  try {
    document.cookie = `${encodeURIComponent(name)}=; Path=/; Max-Age=0; SameSite=Lax; Secure`;
  } catch {}
}

function syncCookies(op: Operator | null) {
  if (!op) {
    clearCookie(CK_OPERATOR_ROLE);
    return;
  }

  setCookie(CK_ACTIVE_ORG, op.orgId);
  setCookie(CK_ACTIVE_LOCATION, op.locationId);
  setCookie(CK_OPERATOR_ROLE, normalizeRole(op.role) || "staff");
}

async function readOrgAndLocation() {
  try {
    const orgId = await getActiveOrgIdClient();
    if (!orgId) return { orgId: null, locationId: null };

    const locationId = await getActiveLocationIdClient(orgId);
    return { orgId, locationId };
  } catch {
    return { orgId: null, locationId: null };
  }
}

/* ================= Provider ================= */

export function WorkstationLockProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

 const APP_ROUTE_PREFIXES = ["/app", "/dashboard", "/manager"];

const isAppPage = APP_ROUTE_PREFIXES.some((prefix) =>
  pathname?.startsWith(prefix)
);

  const [hasSession, setHasSession] = useState(false);
  const [locked, setLocked] = useState(false);
  const [operator, setOperatorState] = useState<Operator | null>(null);
  const [showLockModal, setShowLockModal] = useState(false);

  const [orgId, setOrgId] = useState<string | null>(null);
  const [locationId, setLocationId] = useState<string | null>(null);

  const bootedRef = useRef(false);

  /* ================= Operator ================= */

  const setOperator = useCallback((op: Operator | null) => {
    setOperatorState(op);
    writeOperatorToLS(op);
    syncCookies(op);
  }, []);

  const clearOperator = useCallback(() => {
    setOperator(null);
  }, [setOperator]);

  const closeLockModal = useCallback(() => {
    setShowLockModal(false);
  }, []);

  /* ================= Org / Location ================= */

  useEffect(() => {
    if (!isAppPage) return;

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
  }, [pathname, isAppPage]);

  /* ================= Lock Controls ================= */

  const openLockModal = useCallback(() => {
    if (!isAppPage) return;
    if (!hasSession || !orgId || !locationId) return;
    setShowLockModal(true);
  }, [isAppPage, hasSession, orgId, locationId]);

  const lockNow = useCallback(() => {
    if (!isAppPage) return;
    if (!hasSession || !orgId || !locationId) return;

    writeLockedToLS(true);
    setLocked(true);
    setShowLockModal(true);
  }, [isAppPage, hasSession, orgId, locationId]);

  const unlockWorkstation = useCallback(() => {
    writeLockedToLS(false);
    setLocked(false);
    setShowLockModal(false);
  }, []);

  const getActingContextClient = useCallback((): ActingContext => {
    return {
      acted_by_team_member_id: operator?.teamMemberId ?? null,
      acted_by_initials: operator?.initials?.toUpperCase() ?? null,
    };
  }, [operator]);

  /* ================= Auth ================= */

  useEffect(() => {
    let unsub: any;

    (async () => {
      const { data } = await supabase.auth.getSession();
      setHasSession(!!data.session);

      const { data: sub } = supabase.auth.onAuthStateChange(
        (_: AuthChangeEvent, session: Session | null) => {
          setHasSession(!!session);

          if (!session) {
            writeLockedToLS(false);
            setLocked(false);
            setShowLockModal(false);
            setOperator(null);
          }
        }
      );

      unsub = sub.subscription;
    })();

    return () => unsub?.unsubscribe?.();
  }, [setOperator]);

  /* ================= Boot ================= */

  useEffect(() => {
    if (bootedRef.current) return;
    bootedRef.current = true;

    const lsLocked = readLockedFromLS();
    const lsOp = readOperatorFromLS();

    setLocked(lsLocked);
    setOperatorState(lsOp);

    syncCookies(lsOp);
  }, []);

  /* ================= Auto Operator ================= */

  useEffect(() => {
    if (!isAppPage) return;
    if (!hasSession || !orgId || !locationId) return;

    let alive = true;

    (async () => {
      const { data: sess } = await supabase.auth.getSession();
      const userId = sess.session?.user?.id;
      if (!userId || !alive) return;

      const { data } = await supabase
        .from("team_members")
        .select("id,name,initials,role")
        .eq("org_id", orgId)
        .eq("active", true)
        .eq("user_id", userId)
        .or(`location_id.eq.${locationId},location_id.is.null`)
        .limit(1);

      if (!alive) return;
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
  }, [isAppPage, hasSession, orgId, locationId, setOperator, unlockWorkstation]);

  /* ================= Modal Control ================= */

  useEffect(() => {
    if (!isAppPage) {
      setShowLockModal(false);
      return;
    }

    if (!hasSession || !locked || !orgId || !locationId) {
      setShowLockModal(false);
      return;
    }

    setShowLockModal(true);
  }, [isAppPage, hasSession, locked, orgId, locationId]);

  /* ================= Inactivity Lock ================= */

  const AUTO_LOCK_MS = 5 * 60 * 1000;
  const timerRef = useRef<any>(null);

  const resetTimer = useCallback(() => {
    if (!isAppPage) return;

    if (timerRef.current) clearTimeout(timerRef.current);

    if (!locked && operator) {
      timerRef.current = setTimeout(() => {
        setLocked(true);
        writeLockedToLS(true);
        setShowLockModal(true);
      }, AUTO_LOCK_MS);
    }
  }, [isAppPage, locked, operator]);

  useEffect(() => {
    resetTimer();
    return () => clearTimeout(timerRef.current);
  }, [locked, operator, resetTimer]);

  useEffect(() => {
    const activity = () => resetTimer();

    window.addEventListener("mousemove", activity);
    window.addEventListener("keydown", activity);
    window.addEventListener("touchstart", activity);

    return () => {
      window.removeEventListener("mousemove", activity);
      window.removeEventListener("keydown", activity);
      window.removeEventListener("touchstart", activity);
    };
  }, [resetTimer]);

  /* ================= Context ================= */

  const value = useMemo(
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

  return (
    <Ctx.Provider value={value}>
      {children}
      {showLockModal ? <WorkstationLockScreen onClose={closeLockModal} /> : null}
    </Ctx.Provider>
  );
}

export function useWorkstation(): Ctx {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useWorkstation must be used within provider");
  return ctx;
}
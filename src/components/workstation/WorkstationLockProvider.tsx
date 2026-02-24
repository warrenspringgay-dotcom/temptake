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
import type { Session } from "@supabase/supabase-js";

import { supabase } from "@/lib/supabaseBrowser";
import { getActiveOrgIdClient } from "@/lib/orgClient";
import { getActiveLocationIdClient } from "@/lib/locationClient";
import WorkstationLockScreen from "@/components/workstation/WorkstationLockScreen";

const LS_FORCE = "tt_workstation_forced";
const LS_OPERATOR = "tt_workstation_operator";

export type Operator = {
  teamMemberId: string;
  orgId: string;
  // location can be null in your data model
  locationId: string | null;
  name: string | null;
  initials: string | null;
  role: string | null;
};

type Ctx = {
  operator: Operator | null;
  locked: boolean;

  // modal control
  openLockModal: () => void;
  closeLockModal: () => void;

  // lock/unlock
  lockNow: () => void;
  unlockWorkstation: () => void;

  // operator management
  setOperator: (op: Operator | null) => void;

  // org/location context (async)
  getActiveContext: () => Promise<{ orgId: string | null; locationId: string | null }>;
};

const C = createContext<Ctx | null>(null);

function safeJsonParse<T>(s: string | null): T | null {
  if (!s) return null;
  try {
    return JSON.parse(s) as T;
  } catch {
    return null;
  }
}

function readBoolLS(key: string, fallback = false) {
  if (typeof window === "undefined") return fallback;
  const v = window.localStorage.getItem(key);
  if (v === null) return fallback;
  return v === "true";
}

function writeBoolLS(key: string, v: boolean) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(key, v ? "true" : "false");
}

function readOperatorLS(): Operator | null {
  if (typeof window === "undefined") return null;
  return safeJsonParse<Operator>(window.localStorage.getItem(LS_OPERATOR));
}

function writeOperatorLS(op: Operator | null) {
  if (typeof window === "undefined") return;
  if (!op) window.localStorage.removeItem(LS_OPERATOR);
  else window.localStorage.setItem(LS_OPERATOR, JSON.stringify(op));
}

export function WorkstationLockProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  // Never render the lock overlay on auth routes.
  const isAuthRoute =
    pathname === "/login" ||
    pathname.startsWith("/login/") ||
    pathname === "/signup" ||
    pathname.startsWith("/signup/") ||
    pathname === "/forgot-password" ||
    pathname.startsWith("/forgot-password/");

  const [operator, _setOperator] = useState<Operator | null>(() => readOperatorLS());
  const [forcedLocked, setForcedLocked] = useState<boolean>(() => readBoolLS(LS_FORCE, false));
  const [showLockModal, setShowLockModal] = useState(false);
  const [hasSession, setHasSession] = useState<boolean>(false);

  const bootedRef = useRef(false);

  const setOperator = useCallback((op: Operator | null) => {
    _setOperator(op);
    writeOperatorLS(op);
  }, []);

  const getActiveContext = useCallback(async () => {
    const orgId = await getActiveOrgIdClient();
    const locationId = await getActiveLocationIdClient();
    return { orgId, locationId };
  }, []);

  // Locked definition: either explicitly forced, or no operator set.
  // But do NOT treat as locked on auth routes or when no session exists.
  const locked = useMemo(() => {
    if (isAuthRoute) return false;
    if (!hasSession) return false;
    return forcedLocked || !operator;
  }, [forcedLocked, operator, hasSession, isAuthRoute]);

  const openLockModal = useCallback(() => {
    if (isAuthRoute) return;
    setShowLockModal(true);
  }, [isAuthRoute]);

  const closeLockModal = useCallback(() => {
    setShowLockModal(false);
  }, []);

  const lockNow = useCallback(() => {
    if (isAuthRoute) return;
    setForcedLocked(true);
    writeBoolLS(LS_FORCE, true);
    setShowLockModal(true);
  }, [isAuthRoute]);

  const unlockWorkstation = useCallback(() => {
    setForcedLocked(false);
    writeBoolLS(LS_FORCE, false);
    setShowLockModal(false);
  }, []);

  // --- Session tracking (fixes split-brain between pages/FAB) ---
  useEffect(() => {
    let mounted = true;

    async function initSession() {
      const { data } = await supabase.auth.getSession();
      if (!mounted) return;
      setHasSession(!!data.session);
    }

    initSession();

    const { data: sub } = supabase.auth.onAuthStateChange(
      (_event: string, session: Session | null) => {
        setHasSession(!!session);

        // If user logs out, nuke operator/lock so we don't block login UI.
        if (!session) {
          setOperator(null);
          setForcedLocked(false);
          writeBoolLS(LS_FORCE, false);
          setShowLockModal(false);
        }
      }
    );

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, [setOperator]);

  // --- Auto-set operator from auth user ---
  // If user is logged in and org is selected, auto assign operator to matching team_member.user_id.
  useEffect(() => {
    if (isAuthRoute) return;
    if (!hasSession) return;

    // Run once on boot, and also when org/location changes via storage.
    if (!bootedRef.current) bootedRef.current = true;

    let cancelled = false;

    async function autoAssignOperatorIfPossible() {
      // if already have operator and not forced locked, don't fight the user
      if (operator && !forcedLocked) return;

      const { data: s } = await supabase.auth.getSession();
      const userId = s.session?.user?.id;
      if (!userId) return;

      const { orgId, locationId } = await getActiveContext();
      if (!orgId) return; // can’t assign without org

      // match user -> team_member in this org, optionally for location if set
      let q = supabase
        .from("team_members")
        .select("id, name, initials, role, org_id, location_id")
        .eq("org_id", orgId)
        .eq("user_id", userId)
        .eq("active", true)
        .limit(1);

      if (locationId) q = q.eq("location_id", locationId);

      const { data, error } = await q;

      if (cancelled) return;
      if (error) return;
      const row = data?.[0];
      if (!row?.id) return;

      setOperator({
        teamMemberId: row.id,
        orgId,
        locationId: (row.location_id ?? locationId ?? null) as string | null,
        name: row.name ?? null,
        initials: (row.initials ?? null) as string | null,
        role: (row.role ?? null) as string | null,
      });

      // Auth login should feel "unlocked" unless user explicitly forced lock.
      setForcedLocked(false);
      writeBoolLS(LS_FORCE, false);
      setShowLockModal(false);
    }

    autoAssignOperatorIfPossible();

    // React to org/location changes from other tabs or your UI
    const onStorage = (e: StorageEvent) => {
      if (!e.key) return;
      if (e.key.includes("tt_active_org") || e.key.includes("tt_active_location")) {
        autoAssignOperatorIfPossible();
      }
    };
    window.addEventListener("storage", onStorage);

    return () => {
      cancelled = true;
      window.removeEventListener("storage", onStorage);
    };
  }, [hasSession, isAuthRoute, operator, forcedLocked, getActiveContext, setOperator]);

  // If locked becomes true, ensure lock modal is visible (prevents “FAB locked but no screen”)
  useEffect(() => {
    if (isAuthRoute) return;
    if (!hasSession) return;
    if (locked) setShowLockModal(true);
  }, [locked, isAuthRoute, hasSession]);

  const value: Ctx = useMemo(
    () => ({
      operator,
      locked,
      openLockModal,
      closeLockModal,
      lockNow,
      unlockWorkstation,
      setOperator,
      getActiveContext,
    }),
    [operator, locked, openLockModal, closeLockModal, lockNow, unlockWorkstation, setOperator, getActiveContext]
  );

  return (
    <C.Provider value={value}>
      {children}

      {/* Overlay lives here so it always exists when FAB triggers lock */}
      {!isAuthRoute && hasSession && showLockModal ? (
        <WorkstationLockScreen onClose={closeLockModal} />
      ) : null}
    </C.Provider>
  );
}

export function useWorkstation() {
  const ctx = useContext(C);
  if (!ctx) throw new Error("useWorkstation must be used within <WorkstationLockProvider>");
  return ctx;
}
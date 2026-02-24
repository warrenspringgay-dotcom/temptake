"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { usePathname } from "next/navigation";
import { supabase } from "@/lib/supabaseBrowser";
import { getActiveOrgIdClient } from "@/lib/orgClient";
import { getActiveLocationIdClient } from "@/lib/locationClient";
import WorkstationLockScreen from "@/components/workstation/WorkstationLockScreen";

/**
* NOTE:
* - Do NOT rename exports/imports: other files depend on these names.
* - Operator MUST NOT include orgId/locationId (that broke your builds).
*   Org/location comes from your active context helpers.
*/

export type Operator = {
  teamMemberId: string;
  name?: string | null;
  initials?: string | null;
  role?: string | null;
};

export type ActingContext = {
  acted_by_team_member_id?: string | null;
  acted_by_initials?: string | null;
};

type LockRequiredResp = { ok: boolean; lockRequired?: boolean };

type Ctx = {
  locked: boolean;

  operator: Operator | null;
  setOperator: (op: Operator | null) => void;
  clearOperator: () => void;

  openLockModal: () => void;
  closeLockModal: () => void;

  /** Used by QuickActionsFab */
  lockNow: () => void;

  /** Backwards-compat alias (if anything still calls it) */
  lockWorkstationNow?: () => void;

  getActingContextClient: () => ActingContext;
};

const WorkstationLockContext = createContext<Ctx | null>(null);

const LS_OPERATOR = "tt_operator";

function readJson<T>(key: string): T | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

function writeJson(key: string, value: any) {
  if (typeof window === "undefined") return;
  try {
    if (value === null || value === undefined) {
      window.localStorage.removeItem(key);
      return;
    }
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // ignore
  }
}

async function fetchLockRequired(orgId: string, locationId: string) {
  const res = await fetch(
    `/api/workstation/lock-required?orgId=${encodeURIComponent(
      orgId
    )}&locationId=${encodeURIComponent(locationId)}`,
    { cache: "no-store" }
  );
  const json = (await res.json().catch(() => ({}))) as LockRequiredResp;
  return { ok: !!json.ok, lockRequired: !!json.lockRequired };
}

export function WorkstationLockProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  const [operator, setOperatorState] = useState<Operator | null>(() =>
    readJson<Operator>(LS_OPERATOR)
  );

  const [showLockModal, setShowLockModal] = useState(false);

  // Active context (from your cookie helpers). We store these only for convenience.
  const [orgId, setOrgId] = useState<string | null>(null);
  const [locationId, setLocationId] = useState<string | null>(null);

  // Whether we should enforce lock at this org/location.
  const [lockRequired, setLockRequired] = useState(false);

  const setOperator = useCallback((op: Operator | null) => {
    setOperatorState(op);
    writeJson(LS_OPERATOR, op);
  }, []);

  const clearOperator = useCallback(() => {
    setOperator(null);
  }, [setOperator]);

  const openLockModal = useCallback(() => setShowLockModal(true), []);
  const closeLockModal = useCallback(() => setShowLockModal(false), []);

  const lockNow = useCallback(() => {
    clearOperator();
    setShowLockModal(true);
  }, [clearOperator]);

  const lockWorkstationNow = lockNow;

  const refreshActiveContext = useCallback(async () => {
    // Support helpers being sync OR async (this is why you got Promise<string|null> build errors)
    const o = await Promise.resolve(getActiveOrgIdClient() as any);
    const l = await Promise.resolve(getActiveLocationIdClient() as any);

    const oStr = typeof o === "string" && o ? o : null;
    const lStr = typeof l === "string" && l ? l : null;

    setOrgId(oStr);
    setLocationId(lStr);

    // If we don't have active context yet, do NOT lock the app.
    if (!oStr || !lStr) {
      setLockRequired(false);
      return;
    }

    const lr = await fetchLockRequired(oStr, lStr);
    setLockRequired(!!lr.lockRequired);

    if (lr.lockRequired && !operator) {
      setShowLockModal(true);
    }
  }, [operator]);

  // Refresh on route changes
  useEffect(() => {
    refreshActiveContext();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  // Refresh on auth changes
  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => {
      refreshActiveContext();
    });
    return () => subscription.unsubscribe();
  }, [refreshActiveContext]);

  // Single source of truth for "locked"
  const locked = !!lockRequired && !operator;

  const getActingContextClient = useCallback((): ActingContext => {
    return {
      acted_by_team_member_id: operator?.teamMemberId ?? null,
      acted_by_initials: operator?.initials ?? null,
    };
  }, [operator]);

  const value = useMemo<Ctx>(
    () => ({
      locked,
      operator,
      setOperator,
      clearOperator,
      openLockModal,
      closeLockModal,
      lockNow,
      lockWorkstationNow,
      getActingContextClient,
    }),
    [
      locked,
      operator,
      setOperator,
      clearOperator,
      openLockModal,
      closeLockModal,
      lockNow,
      lockWorkstationNow,
      getActingContextClient,
    ]
  );

  return (
    <WorkstationLockContext.Provider value={value}>
      {children}
      {showLockModal ? <WorkstationLockScreen /> : null}
    </WorkstationLockContext.Provider>
  );
}

export function useWorkstation() {
  const ctx = useContext(WorkstationLockContext);
  if (!ctx)
    throw new Error(
      "useWorkstation must be used within <WorkstationLockProvider>"
    );
  return ctx;
}

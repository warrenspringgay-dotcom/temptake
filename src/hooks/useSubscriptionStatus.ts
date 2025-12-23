// src/hooks/useSubscriptionStatus.ts
"use client";

import { useEffect, useState } from "react";

export type SubscriptionStatus =
  | "none"
  | "trialing"
  | "active"
  | "past_due"
  | "canceled";

export type SubscriptionStatusInfo = {
  loggedIn: boolean;
  status: SubscriptionStatus | null;
  active: boolean;     // active or trial or past_due
  onTrial: boolean;
  trialEndsAt: string | null;
  daysLeft: number | null;
};

type HookReturn = SubscriptionStatusInfo & { loading: boolean };

const INITIAL: HookReturn = {
  loading: true,
  loggedIn: false,
  status: null,
  active: false,
  onTrial: false,
  trialEndsAt: null,
  daysLeft: null,
};

export function useSubscriptionStatus(): HookReturn {
  const [state, setState] = useState<HookReturn>(INITIAL);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const res = await fetch("/api/billing/status", { cache: "no-store" });
        if (!res.ok) throw new Error(`status ${res.status}`);
        const json = await res.json();

        const loggedIn = !!json.loggedIn;
        const status = (json.status ?? null) as SubscriptionStatus | null;
        const trialEndsAt = (json.trialEndsAt ?? null) as string | null;

        let daysLeft: number | null = null;
        let onTrial = false;

        if (status === "trialing" && trialEndsAt) {
          const now = new Date();
          const end = new Date(trialEndsAt);
          if (!Number.isNaN(end.getTime())) {
            const diffMs = end.getTime() - now.getTime();
            daysLeft = Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
            onTrial = diffMs > 0;
          }
        }

        const active =
          status === "active" ||
          status === "trialing" ||
          status === "past_due";

        if (!cancelled) {
          setState({
            loading: false,
            loggedIn,
            status,
            active,
            onTrial,
            trialEndsAt,
            daysLeft,
          });
        }
      } catch (e) {
        console.error("[useSubscriptionStatus] failed", e);
        if (!cancelled) {
          setState(INITIAL);
        }
      }
    }

    load();

    return () => {
      cancelled = true;
    };
  }, []);

  return state;
}

export default useSubscriptionStatus;

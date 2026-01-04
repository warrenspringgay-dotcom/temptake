// src/hooks/useSubscriptionStatus.ts
"use client";

import { useEffect, useState } from "react";

export type BillingState = {
  loading: boolean;
  loggedIn: boolean;
  hasValid: boolean;
  status: string | null;
  inTrial: boolean;
  trialEndsAt: string | null;
  currentPeriodEnd: string | null;

  // convenience flags your UI already expects
  active: boolean;
  onTrial: boolean;

  error?: string | null;
};

const initial: BillingState = {
  loading: true,
  loggedIn: false,
  hasValid: false,
  status: null,
  inTrial: false,
  trialEndsAt: null,
  currentPeriodEnd: null,
  active: false,
  onTrial: false,
  error: null,
};

export function useSubscriptionStatus(): BillingState {
  const [state, setState] = useState<BillingState>(initial);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const res = await fetch("/api/billing/status", { cache: "no-store" });
        const j = await res.json();

        if (cancelled) return;

        const status = (j?.status as string | null)?.toLowerCase() ?? null;
        const inTrial = !!j?.inTrial;
        const trialEndsAt = (j?.trialEndsAt as string | null) ?? null;
        const currentPeriodEnd = (j?.currentPeriodEnd as string | null) ?? null;

        const active =
          status === "active" || status === "past_due" || status === "trialing";

        const onTrial = status === "trialing" || inTrial;

        setState({
          loading: false,
          loggedIn: !!j?.loggedIn,
          hasValid: !!j?.hasValid,
          status,
          inTrial,
          trialEndsAt,
          currentPeriodEnd,
          active,
          onTrial,
          error: null,
        });
      } catch (e: any) {
        if (cancelled) return;
        setState({
          ...initial,
          loading: false,
          error: e?.message ?? "Failed to load billing status",
        });
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  return state;
}

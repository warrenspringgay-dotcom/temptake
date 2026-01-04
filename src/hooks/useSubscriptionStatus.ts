// src/hooks/useSubscriptionStatus.ts
"use client";

import { useEffect, useState } from "react";

export type BillingState = {
  loading: boolean;
  error: string | null;

  loggedIn: boolean;

  hasValid: boolean;
  active: boolean;
  onTrial: boolean;

  status: string | null;
  trialEndsAt: string | null;
  currentPeriodEnd: string | null;
};

const initial: BillingState = {
  loading: true,
  error: null,

  loggedIn: false,

  hasValid: false,
  active: false,
  onTrial: false,

  status: null,
  trialEndsAt: null,
  currentPeriodEnd: null,
};

export function useSubscriptionStatus() {
  const [state, setState] = useState<BillingState>(initial);

  useEffect(() => {
    let cancelled = false;

    async function run() {
      try {
        const res = await fetch("/api/billing/status", { cache: "no-store" });
        const json = await res.json();

        if (cancelled) return;

        setState({
          loading: false,
          error: json?.ok === false ? json?.reason ?? "unknown_error" : null,

          loggedIn: !!json?.loggedIn,

          hasValid: !!json?.hasValid,
          active: !!json?.active,
          onTrial: !!json?.onTrial,

          status: (json?.status ?? null) as string | null,
          trialEndsAt: (json?.trialEndsAt ?? null) as string | null,
          currentPeriodEnd: (json?.currentPeriodEnd ?? null) as string | null,
        });
      } catch (e: any) {
        if (cancelled) return;
        setState({ ...initial, loading: false, error: e?.message ?? "network_error" });
      }
    }

    run();
    return () => {
      cancelled = true;
    };
  }, []);

  return state;
}

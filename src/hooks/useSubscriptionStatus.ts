"use client";

import { useEffect, useState } from "react";

type BillingState = {
  loading: boolean;
  hasValid: boolean;
  status?: string;
  reason?: string;
};

export function useSubscriptionStatus(): BillingState {
  const [state, setState] = useState<BillingState>({
    loading: true,
    hasValid: false,
  });

  useEffect(() => {
    let alive = true;

    (async () => {
      try {
        setState((s) => ({ ...s, loading: true }));

        // credentials: "include" ensures cookies go with the request
        const res = await fetch("/api/billing/status", {
          method: "GET",
          credentials: "include",
          cache: "no-store",
        });

        const json = await res.json();

        if (!alive) return;

        setState({
          loading: false,
          hasValid: !!json?.hasValid,
          status: json?.status,
          reason: json?.reason,
        });
      } catch (e: any) {
        if (!alive) return;
        setState({
          loading: false,
          hasValid: false,
          reason: e?.message ?? "fetch_failed",
        });
      }
    })();

    return () => {
      alive = false;
    };
  }, []);

  return state;
}

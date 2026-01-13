// src/hooks/useSubscriptionStatus.ts
"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseBrowser";

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
        const { data: sessionData } = await supabase.auth.getSession();
        const accessToken = sessionData?.session?.access_token ?? null;

        const res = await fetch("/api/billing/status", {
          cache: "no-store",
          headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined,
        });

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

    // initial fetch
    run();

    // refetch when auth changes
    const { data: sub } = supabase.auth.onAuthStateChange(() => {
      setState((s) => ({ ...s, loading: true }));
      run();
    });

    return () => {
      cancelled = true;
      sub?.subscription?.unsubscribe();
    };
  }, []);

  return state;
}

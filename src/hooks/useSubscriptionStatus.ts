// src/hooks/useSubscriptionStatus.ts
"use client";

import useSWR from "swr";

export type SubscriptionStatusInfo = {
  loggedIn: boolean;
  active: boolean;
  onTrial: boolean;
  status: string | null;
  currentPeriodEnd: string | null;
  trialEndsAt: string | null;
  daysLeft: number | null;
};

type HookReturn = SubscriptionStatusInfo & {
  loading: boolean;
  error: any;
  hasValid: boolean; // paid OR trial
};

const fetcher = async (url: string) => {
  const res = await fetch(url, { credentials: "include" });
  if (!res.ok) {
    throw new Error(`HTTP ${res.status}`);
  }
  return res.json();
};

export function useSubscriptionStatus(): HookReturn {
  const { data, error, isLoading } = useSWR("/api/billing/status", fetcher, {
    revalidateOnFocus: false,
    dedupingInterval: 30_000,
  });

  const base: SubscriptionStatusInfo =
    data && data.ok
      ? {
          loggedIn: !!data.loggedIn,
          active: !!data.active,
          onTrial: !!data.onTrial,
          status: data.status ?? null,
          currentPeriodEnd: data.currentPeriodEnd ?? null,
          trialEndsAt: data.trialEndsAt ?? null,
          daysLeft: data.daysLeft ?? null,
        }
      : {
          loggedIn: false,
          active: false,
          onTrial: false,
          status: null,
          currentPeriodEnd: null,
          trialEndsAt: null,
          daysLeft: null,
        };

  return {
    ...base,
    loading: isLoading,
    error,
    hasValid: base.active || base.onTrial,
  };
}

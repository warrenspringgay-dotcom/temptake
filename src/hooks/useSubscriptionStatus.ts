"use client";

import useSWR from "swr";

export type SubscriptionStatusInfo = {
  loggedIn: boolean;
  hasValid: boolean;
  status: string | null;
  currentPeriodEnd: string | null;
  trialEndsAt: string | null;
};

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export function useSubscriptionStatus(): SubscriptionStatusInfo & { loading: boolean } {
  const { data, error, isLoading } = useSWR("/api/billing/status", fetcher);

  if (error || !data) {
    return {
      loading: false,
      loggedIn: false,
      hasValid: false,
      status: null,
      currentPeriodEnd: null,
      trialEndsAt: null,
    };
  }

  return {
    loading: isLoading,
    loggedIn: !!data.loggedIn,
    hasValid: !!data.hasValid,
    status: data.status ?? null,
    currentPeriodEnd: data.currentPeriodEnd ?? null,
    trialEndsAt: data.trialEndsAt ?? null,
  };
}

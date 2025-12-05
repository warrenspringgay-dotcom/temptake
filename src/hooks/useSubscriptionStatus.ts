// src/hooks/useSubscriptionStatus.ts
"use client";

import useSWR from "swr";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export function useSubscriptionStatus() {
  const { data, error, isLoading } = useSWR(
    "/api/billing/status",
    fetcher,
    {
      refreshInterval: 60_000, // poll every 60s
    }
  );

  return {
    loading: isLoading,
    error,
    status: data?.status ?? null,
    hasValid: data?.hasValid ?? false,
    trialEndsAt: data?.trialEndsAt ?? null,
    currentPeriodEnd: data?.currentPeriodEnd ?? null,
  };
}

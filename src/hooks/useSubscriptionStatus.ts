// src/hooks/useSubscriptionStatus.ts
"use client";

import useSWR from "swr";

type StatusResponse = {
  hasValid: boolean;
  status: string | null;
  trialEndsAt: string | null;
  cancelAtPeriodEnd?: boolean | null;
  currentPeriodEnd?: string | null;
  reason?: string | null;
};

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export function useSubscriptionStatus() {
  const { data, error, isLoading } = useSWR<StatusResponse>(
    "/api/billing/status",
    fetcher,
    {
      refreshInterval: 60_000, // refresh every 60s
    }
  );

  return {
    hasValid: data?.hasValid ?? false,
    status: data?.status ?? null,
    trialEndsAt: data?.trialEndsAt ?? null,
    isLoading,
    error,
    raw: data,
  };
}

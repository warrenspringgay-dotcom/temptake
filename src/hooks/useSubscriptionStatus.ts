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

type ApiResponse = Partial<SubscriptionStatusInfo> & {
  ok?: boolean;       // tolerate either shape
  hasValid?: boolean; // optional from API
};

type HookReturn = SubscriptionStatusInfo & {
  loading: boolean;
  error: any;
  hasValid: boolean; // paid OR trial
};

const EMPTY: SubscriptionStatusInfo = {
  loggedIn: false,
  active: false,
  onTrial: false,
  status: null,
  currentPeriodEnd: null,
  trialEndsAt: null,
  daysLeft: null,
};

const fetcher = async (url: string) => {
  const res = await fetch(url, { credentials: "include" });
  if (!res.ok) {
    throw new Error(`HTTP ${res.status}`);
  }
  return (await res.json()) as ApiResponse;
};

export function useSubscriptionStatus(): HookReturn {
  const { data, error, isLoading } = useSWR<ApiResponse>(
    "/api/billing/status",
    fetcher,
    {
      revalidateOnFocus: false,
      dedupingInterval: 30_000,
    }
  );

  const base: SubscriptionStatusInfo = data
    ? {
        loggedIn: !!data.loggedIn,
        active: !!data.active,
        onTrial: !!data.onTrial,
        status: data.status ?? null,
        currentPeriodEnd: data.currentPeriodEnd ?? null,
        trialEndsAt: data.trialEndsAt ?? null,
        daysLeft: data.daysLeft ?? null,
      }
    : EMPTY;

  const hasValid =
    typeof data?.hasValid === "boolean"
      ? data.hasValid
      : base.active || base.onTrial;

  return {
    ...base,
    loading: isLoading,
    error,
    hasValid,
  };
}

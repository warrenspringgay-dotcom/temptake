// src/hooks/useSubscriptionStatus.ts
"use client";

import useSWR from "swr";

export type SubscriptionStatus =
  | "active"
  | "trialing"
  | "past_due"
  | "canceled"
  | "incomplete"
  | "incomplete_expired"
  | "unpaid"
  | "unknown"
  | null;

export type SubscriptionStatusInfo = {
  loggedIn: boolean;
  active: boolean;              // from API: `active`
  onTrial: boolean;             // derived from `trialEndsAt`
  status: SubscriptionStatus;   // from API: `status`
  currentPeriodEnd: string | null;
  trialEndsAt: string | null;   // from API: `trialEndsAt`
};

type ApiResponse = {
  loggedIn?: boolean;
  active?: boolean;
  status?: SubscriptionStatus;
  currentPeriodEnd?: string | null;
  trialEndsAt?: string | null;
  hasValid?: boolean; // legacy, we can ignore or use if you want
};

const fetcher = (url: string) =>
  fetch(url).then((r) => {
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    return r.json();
  }) as Promise<ApiResponse>;

export function useSubscriptionStatus(): SubscriptionStatusInfo & { loading: boolean } {
  const { data, error, isLoading } = useSWR<ApiResponse>("/api/billing/status", fetcher, {
    refreshInterval: 60_000,
  });

  const loggedIn = !!data?.loggedIn;

  const status: SubscriptionStatus =
    (data?.status as SubscriptionStatus | undefined) ?? null;

  const currentPeriodEnd = data?.currentPeriodEnd ?? null;
  const trialEndsAt = data?.trialEndsAt ?? null;

  const active = !!data?.active;

  let onTrial = false;
  if (trialEndsAt) {
    const now = new Date();
    const end = new Date(trialEndsAt);
    onTrial = end.getTime() > now.getTime();
  }

  return {
    loading: isLoading || (!data && !error),
    loggedIn,
    active,
    onTrial,
    status,
    currentPeriodEnd,
    trialEndsAt,
  };
}

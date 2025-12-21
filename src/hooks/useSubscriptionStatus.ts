"use client";

import useSWR from "swr";
import { useAuth } from "@/components/AuthProvider";

const fetcher = (url: string) =>
  fetch(url, { cache: "no-store" }).then((r) => r.json());

export function useSubscriptionStatus() {
  const { user, ready } = useAuth();

  // 🔑 Critical: only fetch when auth is settled AND user exists
  const shouldFetch = ready && !!user;

  const { data, error, isLoading } = useSWR(
    shouldFetch ? "/api/billing/status" : null,
    fetcher,
    {
      refreshInterval: shouldFetch ? 60_000 : 0,
      revalidateOnFocus: true,
      dedupingInterval: 10_000,
    }
  );

  return {
    loading: shouldFetch ? isLoading : false,
    error,
    status: data?.status ?? null,
    hasValid: data?.hasValid ?? false,
    trialEndsAt: data?.trialEndsAt ?? null,
    currentPeriodEnd: data?.currentPeriodEnd ?? null,
  };
}

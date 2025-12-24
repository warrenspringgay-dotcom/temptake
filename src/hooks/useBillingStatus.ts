// src/hooks/useBillingStatus.ts
"use client";

import { useSubscriptionStatus } from "./useSubscriptionStatus";

export function useBillingStatus() {
  const info = useSubscriptionStatus();

  // Old code usually did: const { data, loading } = useBillingStatus();
  return {
    data: info,
    loading: info.loading,
    error: info.error,
  };
}

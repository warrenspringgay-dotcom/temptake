// src/hooks/useBillingStatus.ts
"use client";

import { useSubscriptionStatus } from "./useSubscriptionStatus";

export function useBillingStatus() {
  const info = useSubscriptionStatus();
  return {
    data: info,
    loading: info.loading,
    error: info.error,
  };
}

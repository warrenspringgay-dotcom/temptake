// src/lib/billingClient.ts
"use client";

import { supabase } from "@/lib/supabaseBrowser";

/**
 * Shape returned by /billing/status API route.
 */
export type BillingStatus = {
  status: string | null;            // "active", "trialing", "past_due", null
  trial_ends_at: string | null;     // ISO string or null
  current_period_end: string | null;
  cancel_at_period_end: boolean | null;
  plan_name: string | null;         // e.g. "1 site", "up to 3 sites"
};

/**
 * Fetch the current organisation's billing/subscription status.
 * This calls your API route:  GET /api/billing/status
 */
export async function getBillingStatusClient(): Promise<BillingStatus | null> {
  try {
    const res = await fetch("/api/billing/status", {
      method: "GET",
      credentials: "include",
    });

    if (!res.ok) {
      console.error("[billingClient] status fetch failed:", res.status);
      return null;
    }

    const data = await res.json();
    return {
      status: data?.status ?? null,
      trial_ends_at: data?.trial_ends_at ?? null,
      current_period_end: data?.current_period_end ?? null,
      cancel_at_period_end: data?.cancel_at_period_end ?? null,
      plan_name: data?.plan_name ?? null,
    };
  } catch (err) {
    console.error("[billingClient] error:", err);
    return null;
  }
}

/**
 * Convenience helper to check if subscription is active or trialing.
 */
export async function hasValidSubscriptionClient(): Promise<boolean> {
  const status = await getBillingStatusClient();
  if (!status) return false;

  if (status.status === "active" || status.status === "trialing") {
    return true;
  }

  // Grace period: cancelled but still paid up
  if (
    status.cancel_at_period_end &&
    status.current_period_end &&
    status.current_period_end > new Date().toISOString()
  ) {
    return true;
  }

  return false;
}

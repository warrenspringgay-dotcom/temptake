// src/lib/billingClient.ts
"use client";

/**
 * Shape returned by /api/billing/status
 * API is the single source of truth.
 */
export type BillingStatus = {
  ok: boolean;
  loggedIn: boolean;
  hasValid: boolean;
  active: boolean;
  onTrial: boolean;

  status: string | null;

  // core billing fields
  priceId: string | null;

  // UI convenience (derived server-side)
  planName: string | null;

  // SOURCE OF TRUTH for gating (derived server-side)
  maxLocations: number;

  cancelAtPeriodEnd: boolean | null;

  trialEndsAt: string | null;
  currentPeriodEnd: string | null;

  reason?: string;
};

/**
 * Fetch billing status for current org/user.
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
      ok: !!data?.ok,
      loggedIn: !!data?.loggedIn,
      hasValid: !!data?.hasValid,
      active: !!data?.active,
      onTrial: !!data?.onTrial,

      status: data?.status ?? null,

      priceId: data?.priceId ?? null,
      planName: data?.planName ?? null,

      // Default to 1 if API ever omits it for some reason
      maxLocations:
        Number.isFinite(Number(data?.maxLocations)) && Number(data?.maxLocations) > 0
          ? Number(data.maxLocations)
          : 1,

      cancelAtPeriodEnd: data?.cancelAtPeriodEnd ?? null,

      trialEndsAt: data?.trialEndsAt ?? null,
      currentPeriodEnd: data?.currentPeriodEnd ?? null,

      reason: data?.reason ?? undefined,
    };
  } catch (err) {
    console.error("[billingClient] error:", err);
    return null;
  }
}

/**
 * Convenience helper: do they have a valid subscription/trial/grace access?
 * Uses server’s computed hasValid flag (and keeps a fallback).
 */
export async function hasValidSubscriptionClient(): Promise<boolean> {
  const bs = await getBillingStatusClient();
  if (!bs) return false;

  if (bs.hasValid) return true;

  // extra fallback (just in case)
  if (
    bs.cancelAtPeriodEnd &&
    bs.currentPeriodEnd &&
    bs.currentPeriodEnd > new Date().toISOString()
  ) {
    return true;
  }

  return false;
}

// src/lib/billingClient.ts
"use client";

/**
 * Shape returned by /api/billing/status
 * (make the API the single source of truth, don’t invent fields client-side).
 */
export type BillingStatus = {
  ok: boolean;
  loggedIn: boolean;
  hasValid: boolean;
  active: boolean;
  onTrial: boolean;

  status: string | null;

  // source of truth for plan gating
  priceId: string | null;

  // UI convenience (derived server-side)
  planName: string | null;

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
 * Source-of-truth gating:
 * priceId -> max locations.
 */
export function getMaxLocationsFromPriceId(priceId: string | null | undefined): number {
  // If there’s no priceId yet (trial / no sub), default to single site.
  if (!priceId) return 1;

  const single = process.env.NEXT_PUBLIC_STRIPE_PRICE_SINGLE_SITE ?? "";
  const singleAnnual = process.env.NEXT_PUBLIC_STRIPE_PRICE_SINGLE_SITE_ANNUAL ?? "";
  const upTo3 = process.env.NEXT_PUBLIC_STRIPE_PRICE_UP_TO_3 ?? "";
  const upTo5 = process.env.NEXT_PUBLIC_STRIPE_PRICE_UP_TO_5 ?? "";

  if (priceId === single) return 1;
  if (priceId === singleAnnual) return 1;
  if (priceId === upTo3) return 3;
  if (priceId === upTo5) return 5;

  // Unknown/legacy/custom: safest is restrict, not “free unlimited locations”.
  return 1;
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

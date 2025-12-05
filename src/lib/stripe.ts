// src/lib/stripe.ts
import Stripe from "stripe";

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error("STRIPE_SECRET_KEY is not set");
}

// Use the API version that matches the installed Stripe typings
export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2025-11-17.clover",
});

// OLD single-price exports (keep for now so nothing breaks)
export const STRIPE_PRICE_MONTHLY = process.env.STRIPE_PRICE_MONTHLY!;
export const STRIPE_PRICE_YEARLY = process.env.STRIPE_PRICE_YEARLY!;

// ────────────────────────────────────────────────────────────
// Multi-site plans (all monthly)
// basic  = 1 site
// plus   = up to 3 sites
// pro    = up to 5 sites (5+ = custom pricing)
// ────────────────────────────────────────────────────────────

export type PlanName = "basic" | "plus" | "pro";

// These should be set in your env on Vercel:
//   STRIPE_PRICE_BASIC
//   STRIPE_PRICE_PLUS
//   STRIPE_PRICE_PRO
//
// For now we fall back to STRIPE_PRICE_MONTHLY for "basic"
// so existing setups keep working.
export const STRIPE_PRICE_BASIC =
  process.env.STRIPE_PRICE_BASIC ?? STRIPE_PRICE_MONTHLY;

export const STRIPE_PRICE_PLUS = process.env.STRIPE_PRICE_PLUS ?? "";
export const STRIPE_PRICE_PRO = process.env.STRIPE_PRICE_PRO ?? "";

/**
 * Map a Stripe price_id to an internal plan name.
 * If we don't recognise it, return null and you can treat it as "basic" or 1 site.
 */
export function getPlanNameFromPriceId(
  priceId: string | null | undefined
): PlanName | null {
  if (!priceId) return null;

  if (priceId === STRIPE_PRICE_BASIC) return "basic";
  if (priceId === STRIPE_PRICE_PLUS) return "plus";
  if (priceId === STRIPE_PRICE_PRO) return "pro";

  // Unknown price – could be a legacy one; treat as no specific tier.
  return null;
}

/**
 * Given a plan name, return the maximum number of locations allowed.
 *
 * - "basic" → 1 location
 * - "plus"  → up to 3
 * - "pro"   → up to 5
 * - null/unknown → 1 by default (safest)
 *
 * Return type is `number | null` so you *could* use `null` to mean
 * "no limit" if you ever add an enterprise tier.
 */
export function getMaxLocationsFromPlanName(
  planName: PlanName | string | null | undefined
): number | null {
  if (!planName) {
    // default to 1 site for unknown plans
    return 1;
  }

  switch (planName) {
    case "basic":
      return 1;
    case "plus":
      return 3;
    case "pro":
      return 5;
    default:
      // Unknown label – safest to behave like basic
      return 1;
  }
}

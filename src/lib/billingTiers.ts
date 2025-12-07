// src/lib/billingTiers.ts

/**
 * Definition of the TempTake subscription bands.
 * This file is CLIENT-SAFE – it does NOT use the Stripe secret key.
 * It's fine that we inline price IDs here; they are public identifiers.
 */

export type PlanBandId = "single" | "up_to_3" | "up_to_5" | "custom";

export type PlanBand = {
  /** Identifier for logic (also used as tier) */
  id: PlanBandId;
  /** Back-compat field – same as id */
  tier: PlanBandId;
  /** Human label shown in the UI */
  label: string;
  /** Inclusive max locations this band covers (Infinity for custom) */
  maxLocations: number;
  /** Display price per month (for UI only) */
  pricePerMonth: number | null;
  /** Stripe price id for the monthly subscription, if applicable */
  stripePriceId?: string;
  /** Optional Stripe price id for the annual subscription */
  stripePriceIdAnnual?: string | null;
};

// Stripe price IDs – safe to expose publicly
const STRIPE_PRICE_SINGLE_SITE =
  process.env.STRIPE_PRICE_SINGLE_SITE ?? "";
const STRIPE_PRICE_SINGLE_SITE_ANNUAL =
  process.env.STRIPE_PRICE_SINGLE_SITE_ANNUAL ?? "";
const STRIPE_PRICE_UP_TO_3 =
  process.env.STRIPE_PRICE_UP_TO_3 ?? "";
const STRIPE_PRICE_UP_TO_5 =
  process.env.STRIPE_PRICE_UP_TO_5 ?? "";

export const PLAN_BANDS: PlanBand[] = [
  {
    id: "single",
    tier: "single",
    label: "Single site (1 location)",
    maxLocations: 1,
    pricePerMonth: 9.99,
    stripePriceId: STRIPE_PRICE_SINGLE_SITE || undefined,
    stripePriceIdAnnual: STRIPE_PRICE_SINGLE_SITE_ANNUAL || null,
  },
  {
    id: "up_to_3",
    tier: "up_to_3",
    label: "TempTake Plus (up to 3 sites)",
    maxLocations: 3,
    pricePerMonth: 19.99,
    stripePriceId: STRIPE_PRICE_UP_TO_3 || undefined,
    stripePriceIdAnnual: null,
  },
  {
    id: "up_to_5",
    tier: "up_to_5",
    label: "Pro (up to 5 sites)",
    maxLocations: 5,
    pricePerMonth: 29.99,
    stripePriceId: STRIPE_PRICE_UP_TO_5 || undefined,
    stripePriceIdAnnual: null,
  },
  {
    id: "custom",
    tier: "custom",
    label: "Custom (6+ sites)",
    maxLocations: Infinity,
    pricePerMonth: null,
    stripePriceId: undefined,
    stripePriceIdAnnual: null,
  },
];

/**
 * Given a Stripe plan/price name (from billing_subscriptions.plan_name),
 * return the max locations that plan should allow.
 *
 * This uses simple string matching so it keeps working even if Stripe IDs change
 * as long as the plan names stay roughly the same.
 */
export function getMaxLocationsFromPlanName(
  planName: string | null | undefined
): number {
  if (!planName) {
    // Default to the most restrictive band if we don't know
    return 1;
  }

  const name = planName.toLowerCase();

  if (
    name.includes("up to 5") ||
    name.includes("4-5") ||
    name.includes("4–5") ||
    name.includes("pro")
  ) {
    return 5;
  }

  if (
    name.includes("up to 3") ||
    name.includes("2-3") ||
    name.includes("2–3") ||
    name.includes("plus")
  ) {
    return 3;
  }

  if (
    name.includes("single") ||
    name.includes("basic") ||
    name.includes("1 site")
  ) {
    return 1;
  }

  // Fallback – safest is to treat as single site
  return 1;
}

/**
 * Given a location count, tell the UI which band it naturally falls into.
 * Useful for copy like “Current plan: Single site, this covers up to 1 location”.
 */
export function getBandForLocationCount(count: number): PlanBand {
  const n = Number.isFinite(count) && count > 0 ? count : 1;

  if (n <= 1) return PLAN_BANDS[0]; // single
  if (n <= 3) return PLAN_BANDS[1]; // up to 3
  if (n <= 5) return PLAN_BANDS[2]; // up to 5
  return PLAN_BANDS[3]; // custom
}

/**
 * Alias used by billing + checkout code.
 */
export function getPlanForLocationCount(count: number): PlanBand {
  return getBandForLocationCount(count);
}

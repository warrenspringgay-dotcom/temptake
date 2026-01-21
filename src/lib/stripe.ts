// src/lib/stripe.ts
import Stripe from "stripe";

// SERVER-ONLY. Do not import from client components.

const secretKey = process.env.STRIPE_SECRET_KEY;
if (!secretKey) {
  throw new Error("STRIPE_SECRET_KEY is not set");
}

// Use a real Stripe API version (date-based).
// If your Stripe dashboard is set to a newer version, match it here.
export const stripe = new Stripe(secretKey, {
  apiVersion: "2025-11-17.clover",
});

// Price IDs (keep these as env vars so you can swap test/live cleanly)
export const STRIPE_PRICSINGLE_SITE = process.env.STRIPE_PRICE_SINGLE_SITE ?? "";
export const STRIPE_PRICE_UP_TO_3 = process.env.STRIPE_PRICE_UP_TO_3 ?? "";
export const STRIPE_PRICE_UP_TO_5 = process.env.STRIPE_PRICE_UP_TO_5 ?? "";

// Optional: yearly single-site price (you referenced this elsewhere)
export const STRIPE_PRICE_SINGLE_SITE_ANNUAL =
  process.env.STRIPE_PRICE_SINGLE_SITE_ANNUAL ?? "";

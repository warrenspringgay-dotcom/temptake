// src/lib/stripe.ts
import Stripe from "stripe";

// This file is SERVER-ONLY. Do not import it from client components.

const secretKey = process.env.STRIPE_SECRET_KEY;
if (!secretKey) {
  throw new Error("STRIPE_SECRET_KEY is not set");
}

export const stripe = new Stripe(secretKey, {
  apiVersion: "2025-11-17.clover",
});

// Price IDs used by API routes when creating checkout sessions
export const STRIPE_PRICE_SINGLE_SITE =
  process.env.STRIPE_PRICE_SINGLE_SITE ?? "";

export const STRIPE_PRICE_UP_TO_3 =
  process.env.STRIPE_PRICE_UP_TO_3 ?? "";

export const STRIPE_PRICE_UP_TO_5 =
  process.env.STRIPE_PRICE_UP_TO_5 ?? "";

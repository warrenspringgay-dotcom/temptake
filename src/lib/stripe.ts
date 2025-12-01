// src/lib/stripe.ts
import Stripe from "stripe";

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error("STRIPE_SECRET_KEY is not set");
}

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2024-06-20",
});

export const STRIPE_PRICE_MONTHLY = process.env.STRIPE_PRICE_MONTHLY!;
export const STRIPE_PRICE_YEARLY = process.env.STRIPE_PRICE_YEARLY!;

if (!STRIPE_PRICE_MONTHLY || !STRIPE_PRICE_YEARLY) {
  console.warn(
    "[stripe] STRIPE_PRICE_MONTHLY or STRIPE_PRICE_YEARLY not set. Checkout will fail until these are configured."
  );
}

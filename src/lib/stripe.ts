// src/lib/stripe.ts
import Stripe from "stripe";

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error("STRIPE_SECRET_KEY is not set");
}

// Use the API version that matches the installed Stripe typings
export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2025-11-17.clover",
});

export const STRIPE_PRICE_MONTHLY = process.env.STRIPE_PRICE_MONTHLY!;
export const STRIPE_PRICE_YEARLY = process.env.STRIPE_PRICE_YEARLY!;

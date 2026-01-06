// src/app/api/stripe/webhook/route.ts
import { NextRequest, NextResponse } from "next/server";
import type Stripe from "stripe";
import { stripe } from "@/lib/stripe";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const runtime = "nodejs";

/**
 * Stripe signature verification MUST use the raw request body bytes.
 * Using req.text() can break signatures in production.
 */
async function getRawBody(req: NextRequest): Promise<Buffer> {
  const ab = await req.arrayBuffer();
  return Buffer.from(ab);
}

function toIsoFromUnixSeconds(ts?: number | null) {
  if (!ts || !Number.isFinite(ts)) return null;
  return new Date(ts * 1000).toISOString();
}

async function upsertBillingCustomer(params: {
  org_id: string;
  user_id: string | null;
  stripe_customer_id: string;
}) {
  const { org_id, user_id, stripe_customer_id } = params;

  const { error } = await supabaseAdmin
    .from("billing_customers")
    .upsert(
      {
        org_id,
        user_id,
        stripe_customer_id,
      },
      { onConflict: "org_id" }
    );

  if (error) throw error;
}

async function upsertBillingSubscription(params: {
  org_id: string;
  user_id: string | null;
  stripe_subscription_id: string;
  status: string;
  price_id: string | null;
  current_period_end: string | null;
  cancel_at_period_end: boolean;
  trial_ends_at: string | null;
}) {
  const {
    org_id,
    user_id,
    stripe_subscription_id,
    status,
    price_id,
    current_period_end,
    cancel_at_period_end,
    trial_ends_at,
  } = params;

  const { error } = await supabaseAdmin
    .from("billing_subscriptions")
    .upsert(
      {
        org_id,
        user_id,
        stripe_subscription_id,
        status,
        price_id,
        current_period_end,
        cancel_at_period_end,
        trial_ends_at,
      },
      { onConflict: "org_id" }
    );

  if (error) throw error;
}

async function resolveOrgAndUserFromEmail(email: string) {
  const { data: profile, error } = await supabaseAdmin
    .from("profiles")
    .select("id, org_id")
    .eq("email", email)
    .maybeSingle();

  if (error) {
    console.error("[stripe webhook] profiles lookup error (email fallback):", error);
    return { org_id: null as string | null, user_id: null as string | null };
  }

  return {
    org_id: profile?.org_id ? String(profile.org_id) : null,
    user_id: profile?.id ? String(profile.id) : null,
  };
}

/**
 * Handle checkout.session.completed:
 * - use metadata (best)
 * - fallback to email -> profiles lookup
 * - upsert billing_customers
 * - upsert billing_subscriptions (by retrieving subscription)
 */
async function handleCheckoutSessionCompleted(session: Stripe.Checkout.Session) {
  const customerId = typeof session.customer === "string" ? session.customer : null;
  const subscriptionId =
    typeof session.subscription === "string" ? session.subscription : null;

  const meta = session.metadata ?? {};

  let orgId = meta.org_id ? String(meta.org_id) : null;
  let userId = meta.supabase_user_id ? String(meta.supabase_user_id) : null;

  // Fallback via email if metadata missing
  if (!orgId || !userId) {
    const email =
      session.customer_details?.email ??
      (session.customer_email ? String(session.customer_email) : null);

    if (email) {
      const fallback = await resolveOrgAndUserFromEmail(email);
      if (!orgId) orgId = fallback.org_id;
      if (!userId) userId = fallback.user_id;
    }
  }

  if (!orgId) {
    console.warn("[stripe webhook] checkout.session.completed: missing org_id", {
      sessionId: session.id,
      customerId,
      subscriptionId,
      metadata: meta,
    });
    return;
  }

  // Upsert customer row (one per org)
  if (customerId) {
    await upsertBillingCustomer({
      org_id: orgId,
      user_id: userId ?? null,
      stripe_customer_id: customerId,
    });

    console.log("[stripe webhook] billing_customers upserted", orgId, customerId);
  }

  // Upsert subscription row (one per org)
  if (subscriptionId) {
    const sub = await stripe.subscriptions.retrieve(subscriptionId, {
      expand: ["items.data.price"],
    });

    const priceId =
      sub.items?.data?.[0]?.price?.id ? String(sub.items.data[0].price.id) : null;

    await upsertBillingSubscription({
      org_id: orgId,
      user_id: userId ?? null,
      stripe_subscription_id: sub.id,
      status: String(sub.status),
      price_id: priceId,
      current_period_end: toIsoFromUnixSeconds((sub as any).current_period_end),
      cancel_at_period_end: !!sub.cancel_at_period_end,
      trial_ends_at: toIsoFromUnixSeconds(sub.trial_end),
    });

    console.log("[stripe webhook] billing_subscriptions upserted", orgId, sub.id, sub.status);
  }
}

/**
 * Handle customer.subscription.*:
 * - metadata should be present because you set subscription_data.metadata in checkout
 * - upsert customer + subscription so renewals/cancellations stay in sync
 */
async function handleSubscriptionEvent(sub: Stripe.Subscription) {
  const orgId = sub.metadata?.org_id ? String(sub.metadata.org_id) : null;
  const userId = sub.metadata?.supabase_user_id ? String(sub.metadata.supabase_user_id) : null;

  if (!orgId) {
    console.warn("[stripe webhook] subscription event missing org_id metadata", {
      subId: sub.id,
      status: sub.status,
      metadata: sub.metadata,
    });
    return;
  }

  const customerId = typeof sub.customer === "string" ? sub.customer : null;

  if (customerId) {
    await upsertBillingCustomer({
      org_id: orgId,
      user_id: userId ?? null,
      stripe_customer_id: customerId,
    });
  }

  const priceId =
    sub.items?.data?.[0]?.price?.id ? String(sub.items.data[0].price.id) : null;

  await upsertBillingSubscription({
    org_id: orgId,
    user_id: userId ?? null,
    stripe_subscription_id: sub.id,
    status: String(sub.status),
    price_id: priceId,
    current_period_end: toIsoFromUnixSeconds((sub as any).current_period_end),
    cancel_at_period_end: !!sub.cancel_at_period_end,
    trial_ends_at: toIsoFromUnixSeconds(sub.trial_end),
  });

  console.log("[stripe webhook] subscription sync", orgId, sub.id, sub.status);
}

export async function POST(req: NextRequest) {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  // If this is missing in prod, NOTHING will ever write. Which is your situation.
  if (!webhookSecret) {
    console.error("[stripe webhook] STRIPE_WEBHOOK_SECRET is missing");
    return NextResponse.json({ error: "Webhook misconfigured" }, { status: 500 });
  }

  let event: Stripe.Event;

  // Verify / parse event
  try {
    const sig = req.headers.get("stripe-signature");
    if (!sig) {
      console.error("[stripe webhook] missing stripe-signature header");
      return NextResponse.json({ error: "Bad request" }, { status: 400 });
    }

    const rawBody = await getRawBody(req);
    event = stripe.webhooks.constructEvent(rawBody, sig, webhookSecret);
  } catch (err: any) {
    console.error("[stripe webhook] signature/parse error:", err?.message ?? err);
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  console.log("[stripe webhook] event type:", event.type);

  // Handle event
  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        await handleCheckoutSessionCompleted(session);
        break;
      }

      case "customer.subscription.created":
      case "customer.subscription.updated":
      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription;
        await handleSubscriptionEvent(sub);
        break;
      }

      default:
        // ignore
        break;
    }

    return NextResponse.json({ received: true });
  } catch (err: any) {
    console.error("[stripe webhook] handler crashed:", err?.message ?? err);
    // 500 => Stripe retries. That's what you want.
    return NextResponse.json(
      { error: "Webhook handler error", details: err?.message ?? null },
      { status: 500 }
    );
  }
}

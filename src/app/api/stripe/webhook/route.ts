// src/app/api/stripe/webhook/route.ts
import { NextRequest, NextResponse } from "next/server";
import type Stripe from "stripe";
import { stripe } from "@/lib/stripe";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

const isProd = process.env.NODE_ENV === "production";

/**
 * From a checkout session:
 *  - resolve org_id + user_id
 *  - upsert billing_customers (one row per org)
 *  - upsert billing_subscriptions (one row per org)
 */
async function handleCheckoutSessionCompleted(
  session: Stripe.Checkout.Session
) {
  const customerId = (session.customer ?? null) as string | null;
  const subscriptionId = (session.subscription ?? null) as string | null;
  const meta = session.metadata ?? {};

  let orgId = (meta.org_id as string | undefined) ?? null;
  let supabaseUserId = (meta.supabase_user_id as string | undefined) ?? null;

  // ---- Fallback: resolve via email if metadata missing ----
  if (!orgId || !supabaseUserId) {
    const email =
      session.customer_details?.email ??
      (session.customer_email as string | null) ??
      null;

    if (email) {
      const { data: profile, error } = await supabaseAdmin
        .from("profiles")
        .select("id, org_id")
        .eq("email", email)
        .maybeSingle();

      if (error) {
        console.error(
          "[stripe webhook] profiles lookup error (fallback via email):",
          error
        );
      }

      if (profile) {
        if (!orgId) orgId = profile.org_id ?? null;
        if (!supabaseUserId) supabaseUserId = profile.id ?? null;
      }
    }
  }

  if (!orgId) {
    console.warn(
      "[stripe webhook] checkout.session.completed: could not resolve org_id",
      {
        sessionId: session.id,
        customerId,
        metadata: meta,
      }
    );
    return;
  }

  // 1) Upsert billing_customers (keyed by org_id)
  if (customerId) {
    const { error: custErr } = await supabaseAdmin
      .from("billing_customers")
      .upsert(
        {
          org_id: orgId,
          user_id: supabaseUserId ?? null,
          stripe_customer_id: customerId,
        },
        { onConflict: "org_id" } // one customer row per org
      );

    if (custErr) {
      console.error(
        "[stripe webhook] upsert billing_customers error:",
        custErr
      );
    } else {
      console.log(
        "[stripe webhook] billing_customers upserted",
        orgId,
        "->",
        customerId
      );
    }
  }

  // 2) Upsert billing_subscriptions (keyed by org_id)
  if (subscriptionId) {
    const sub = await stripe.subscriptions.retrieve(subscriptionId);

    const status = sub.status; // 'trialing', 'active', etc.
    const trialEndsAt = sub.trial_end
      ? new Date(sub.trial_end * 1000).toISOString()
      : null;

    // TS types don’t expose this, but it’s present at runtime
    const rawCurrentPeriodEnd =
      (sub as any).current_period_end as number | null | undefined;
    const currentPeriodEnd = rawCurrentPeriodEnd
      ? new Date(rawCurrentPeriodEnd * 1000).toISOString()
      : null;

    const cancelAtPeriodEnd = !!sub.cancel_at_period_end;

    const { error: subErr } = await supabaseAdmin
      .from("billing_subscriptions")
      .upsert(
        {
          org_id: orgId,
          stripe_subscription_id: sub.id,
          status,
          trial_ends_at: trialEndsAt,
          current_period_end: currentPeriodEnd,
          cancel_at_period_end: cancelAtPeriodEnd,
        },
        { onConflict: "org_id" } // one sub row per org
      );

    if (subErr) {
      console.error(
        "[stripe webhook] upsert billing_subscriptions error:",
        subErr
      );
    } else {
      console.log(
        "[stripe webhook] upserted subscription for org",
        orgId,
        "status:",
        status,
        "trial_ends_at:",
        trialEndsAt
      );
    }
  }
}

export async function POST(req: NextRequest) {
  let event: Stripe.Event;

  // ---- Verify / parse event ----
  try {
    if (isProd) {
      const sig = req.headers.get("stripe-signature");
      const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

      if (!sig || !webhookSecret) {
        console.error(
          "[stripe webhook] missing stripe-signature or STRIPE_WEBHOOK_SECRET"
        );
        return NextResponse.json({ error: "Bad request" }, { status: 400 });
      }

      const rawBody = await req.text();
      event = stripe.webhooks.constructEvent(rawBody, sig, webhookSecret);
    } else {
      const json = await req.json();
      event = json as Stripe.Event;
    }
  } catch (err: any) {
    console.error("[stripe webhook] signature/parse error:", err?.message);
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  console.log("[stripe webhook] event type:", event.type);

  // ---- Handle event ----
  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        await handleCheckoutSessionCompleted(session);
        break;
      }

      // We don't strictly need the others any more – they’re just logged.
      default:
        console.log("[stripe webhook] ignoring event type:", event.type);
    }

    return NextResponse.json({ received: true });
  } catch (err: any) {
    console.error("[stripe webhook] handler crashed:", err);
    return NextResponse.json(
      { error: "Webhook handler error", details: err?.message ?? null },
      { status: 500 }
    );
  }
}

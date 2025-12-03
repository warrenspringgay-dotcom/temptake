// src/app/api/stripe/webhook/route.ts
import { NextRequest, NextResponse } from "next/server";
import type Stripe from "stripe";
import { stripe } from "@/lib/stripe";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

const isProd = process.env.NODE_ENV === "production";

async function upsertSubscriptionFromStripeObject(sub: Stripe.Subscription) {
  const customerId =
    typeof sub.customer === "string" ? sub.customer : sub.customer.id;

  const status = sub.status; // 'trialing', 'active', 'canceled', etc.
  const subscriptionId = sub.id;

  // Stripe's TypeScript types for Subscription don't currently expose
// `current_period_end`, but it *is* present at runtime, so we cast here.
const rawCurrentPeriodEnd =
  (sub as any).current_period_end as number | null | undefined;

const currentPeriodEnd = rawCurrentPeriodEnd
  ? new Date(rawCurrentPeriodEnd * 1000).toISOString()
  : null;


  const cancelAtPeriodEnd = !!sub.cancel_at_period_end;

  const trialEndsAt = sub.trial_end
    ? new Date(sub.trial_end * 1000).toISOString()
    : null;

  // Look up org linked to this Stripe customer
  const { data: custRows, error: custError } = await supabaseAdmin
    .from("billing_customers")
    .select("org_id")
    .eq("stripe_customer_id", customerId)
    .limit(1);

  if (custError) {
    console.error("[stripe webhook] lookup billing_customers error:", custError);
    return;
  }

  const orgId = custRows?.[0]?.org_id as string | undefined;
  if (!orgId) {
    console.warn(
      "[stripe webhook] no billing_customers row for customer",
      customerId
    );
    return;
  }

  const { error: subError } = await supabaseAdmin
    .from("billing_subscriptions")
    .upsert(
      {
        org_id: orgId,
        stripe_subscription_id: subscriptionId,
        status,
        current_period_end: currentPeriodEnd,
        cancel_at_period_end: cancelAtPeriodEnd,
        trial_ends_at: trialEndsAt,
      },
      { onConflict: "org_id" } // one sub row per org
    );

  if (subError) {
    console.error(
      "[stripe webhook] upsert billing_subscriptions error:",
      subError
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

// …keep the rest of the webhook handler as you already have…

export async function POST(req: NextRequest) {
  let event: Stripe.Event;

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

  try {
    console.log("[stripe webhook] event type:", event.type);

    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;

        const orgId = session.metadata?.org_id as string | undefined;
        const customerId = session.customer as string | null;
        const supabaseUserId =
          (session.metadata?.supabase_user_id as string | undefined) ?? null;

        console.log("[stripe webhook] checkout.session.completed payload", {
          orgId,
          customerId,
          metadata: session.metadata,
        });

        if (orgId && customerId) {
          const { error } = await supabaseAdmin
            .from("billing_customers")
            .upsert(
              {
                org_id: orgId,
                user_id: supabaseUserId ?? null,
                stripe_customer_id: customerId,
              },
              { onConflict: "org_id" }
            );

          if (error) {
            console.error(
              "[stripe webhook] upsert billing_customers error:",
              error
            );
          } else {
            console.log(
              "[stripe webhook] billing_customers upserted",
              orgId,
              "->",
              customerId
            );
          }
        } else {
          console.warn(
            "[stripe webhook] checkout.session.completed missing org or customer",
            { orgId, customerId }
          );
        }

        break;
      }

   case "invoice.payment_succeeded":
case "invoice.paid": {
  // Safety net: if for some reason we missed the subscription events,
  // grab subscription from the invoice and upsert it anyway.
  const invoice = event.data.object as Stripe.Invoice;

  // Not on the TS type, but present at runtime – cast to any.
  const subField =
    (invoice as any).subscription as string | Stripe.Subscription | null | undefined;

  if (subField) {
    const subId =
      typeof subField === "string" ? subField : subField.id;

    try {
      const sub = await stripe.subscriptions.retrieve(subId);
      await upsertSubscriptionFromStripeObject(sub);
    } catch (e: any) {
      console.error(
        "[stripe webhook] failed to retrieve subscription from invoice:",
        e?.message
      );
    }
  } else {
    console.log(
      "[stripe webhook] invoice has no subscription field, skipping"
    );
  }

  break;


      }

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

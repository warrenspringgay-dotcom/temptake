// src/app/api/stripe/webhook/route.ts
import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import type Stripe from "stripe";

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

export async function POST(req: NextRequest) {
  if (!webhookSecret) {
    console.error("[stripe] STRIPE_WEBHOOK_SECRET not set");
    return new NextResponse("Webhook not configured", { status: 500 });
  }

  const sig = req.headers.get("stripe-signature");
  if (!sig) {
    return new NextResponse("Missing Stripe signature", { status: 400 });
  }

  let event: Stripe.Event;

  try {
    const body = await req.text(); // raw body for signature verification
    event = stripe.webhooks.constructEvent(body, sig, webhookSecret);
  } catch (err: any) {
    console.error("[stripe] Webhook signature verification failed", err?.message);
    return new NextResponse(`Webhook Error: ${err?.message ?? "invalid"}`, {
      status: 400,
    });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;

        const customerId = session.customer as string | null;
        const userId = session.metadata?.supabase_user_id as string | undefined;

        if (customerId && userId) {
          // Upsert mapping user ↔ stripe customer
          const { error } = await supabaseAdmin
            .from("billing_customers")
            .upsert(
              {
                user_id: userId,
                stripe_customer_id: customerId,
              },
              {
                onConflict: "user_id",
              }
            );

          if (error) {
            console.error(
              "[stripe] Error upserting billing_customers from checkout.session.completed",
              error
            );
          }
        }
        break;
      }

      case "customer.subscription.created":
      case "customer.subscription.updated":
      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId = subscription.customer as string;

        // Find the user for this Stripe customer
        const { data: customerRow, error: customerErr } = await supabaseAdmin
          .from("billing_customers")
          .select("user_id")
          .eq("stripe_customer_id", customerId)
          .maybeSingle();

        if (customerErr) {
          console.error(
            "[stripe] Error fetching billing_customers for subscription event",
            customerErr
          );
          break;
        }

        if (!customerRow?.user_id) {
          console.warn(
            "[stripe] No billing_customers row for subscription customer",
            customerId
          );
          break;
        }

        const userId = customerRow.user_id as string;
        const price = subscription.items.data[0]?.price;
        const currentPeriodEnd = subscription.current_period_end
          ? new Date(subscription.current_period_end * 1000).toISOString()
          : null;

        const status = subscription.status; // 'active', 'trialing', 'past_due', 'canceled', etc.

        const { error: subError } = await supabaseAdmin
          .from("billing_subscriptions")
          .upsert(
            {
              user_id: userId,
              stripe_subscription_id: subscription.id,
              status,
              price_id: price?.id ?? null,
              current_period_end: currentPeriodEnd,
              cancel_at_period_end: subscription.cancel_at_period_end ?? false,
            },
            {
              onConflict: "stripe_subscription_id",
            }
          );

        if (subError) {
          console.error(
            "[stripe] Error upserting billing_subscriptions",
            subError
          );
        }

        break;
      }

      default: {
        // We don't handle this event type yet
        // console.log(`[stripe] Unhandled event type ${event.type}`);
      }
    }

    return new NextResponse("OK", { status: 200 });
  } catch (err: any) {
    console.error("[stripe] Webhook handler error", err);
    return new NextResponse("Webhook handler error", { status: 500 });
  }
}

import { NextRequest, NextResponse } from "next/server";
import type Stripe from "stripe";
import { stripe } from "@/lib/stripe";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { sendEmail } from "@/lib/email";

export const runtime = "nodejs";

/**
 * Stripe signature verification MUST use raw request body bytes.
 */
async function getRawBody(req: NextRequest): Promise<Buffer> {
  const ab = await req.arrayBuffer();
  return Buffer.from(ab);
}

function toIsoFromUnixSeconds(ts?: number | null) {
  if (!ts || !Number.isFinite(ts)) return null;
  return new Date(ts * 1000).toISOString();
}

function fmtDDMMYYYY(d: Date) {
  const dd = String(d.getUTCDate()).padStart(2, "0");
  const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
  const yyyy = d.getUTCFullYear();
  return `${dd}/${mm}/${yyyy}`;
}

function getOrigin(req: NextRequest) {
  const env =
    process.env.NEXT_PUBLIC_SITE_URL ||
    (process.env.NEXT_PUBLIC_VERCEL_URL
      ? `https://${process.env.NEXT_PUBLIC_VERCEL_URL}`
      : "");
  return (env || req.nextUrl.origin).replace(/\/$/, "");
}

async function safeSendEmail(args: { to: string; subject: string; html: string }) {
  try {
    await sendEmail(args);
    return { ok: true as const };
  } catch (e: any) {
    console.error("[email] send failed", e?.message ?? e);
    return { ok: false as const, error: e?.message ?? String(e) };
  }
}

async function upsertBillingCustomer(params: {
  org_id: string;
  user_id: string | null;
  stripe_customer_id: string;
}) {
  const { org_id, user_id, stripe_customer_id } = params;

  const { error } = await supabaseAdmin
    .from("billing_customers")
    .upsert({ org_id, user_id, stripe_customer_id }, { onConflict: "org_id" });

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

async function getAuthEmailForUserId(userId: string | null) {
  if (!userId) return null;
  const { data, error } = await supabaseAdmin.auth.admin.getUserById(userId);
  if (error) return null;
  return data?.user?.email?.trim() ?? null;
}

async function getBillingSubscriptionByOrg(orgId: string) {
  const { data, error } = await supabaseAdmin
    .from("billing_subscriptions")
    .select(
      "id, org_id, user_id, status, trial_ends_at, stripe_subscription_id, last_payment_event_id, payment_failed_sent_at, cancelled_sent_at"
    )
    .eq("org_id", orgId)
    .maybeSingle();

  if (error) throw error;
  return data ?? null;
}

async function markBillingSubEvent(orgId: string, patch: Record<string, any>) {
  const { error } = await supabaseAdmin
    .from("billing_subscriptions")
    .update(patch)
    .eq("org_id", orgId);

  if (error) throw error;
}

/**
 * Handle checkout.session.completed
 * - use metadata (best)
 * - fallback to email -> profiles lookup
 * - upsert billing_customers
 * - upsert billing_subscriptions
 */
async function handleCheckoutSessionCompleted(session: Stripe.Checkout.Session) {
  const customerId = typeof session.customer === "string" ? session.customer : null;
  const subscriptionId =
    typeof session.subscription === "string" ? session.subscription : null;

  const meta = session.metadata ?? {};

  let orgId = meta.org_id ? String(meta.org_id) : null;
  let userId = meta.supabase_user_id ? String(meta.supabase_user_id) : null;

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

  if (customerId) {
    await upsertBillingCustomer({
      org_id: orgId,
      user_id: userId ?? null,
      stripe_customer_id: customerId,
    });
  }

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
  }
}

/**
 * Handle customer.subscription.* (sync)
 */
async function handleSubscriptionEvent(sub: Stripe.Subscription) {
  const orgId = sub.metadata?.org_id ? String(sub.metadata.org_id) : null;
  const userId = sub.metadata?.supabase_user_id
    ? String(sub.metadata.supabase_user_id)
    : null;

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
}

/**
 * Resolve org/user for invoice:
 * 1) subscription metadata (best)
 * 2) billing_customers (customer -> org)
 */
async function resolveOrgUserForInvoice(invoice: Stripe.Invoice) {
  const subscriptionId =
    typeof (invoice as any).subscription === "string" ? (invoice as any).subscription : null;

  if (subscriptionId) {
    try {
      const sub = await stripe.subscriptions.retrieve(subscriptionId);
      const orgId = sub.metadata?.org_id ? String(sub.metadata.org_id) : null;
      const userId = sub.metadata?.supabase_user_id
        ? String(sub.metadata.supabase_user_id)
        : null;

      if (orgId) return { orgId, userId, subscriptionId: sub.id };
    } catch (e) {
      console.warn("[stripe webhook] invoice->subscription retrieve failed", subscriptionId);
    }
  }

  const customerId = typeof invoice.customer === "string" ? invoice.customer : null;
  if (customerId) {
    const { data, error } = await supabaseAdmin
      .from("billing_customers")
      .select("org_id, user_id")
      .eq("stripe_customer_id", customerId)
      .maybeSingle();

    if (!error && data?.org_id) {
      return {
        orgId: String(data.org_id),
        userId: data.user_id ? String(data.user_id) : null,
        subscriptionId,
      };
    }
  }

  return { orgId: null as string | null, userId: null as string | null, subscriptionId };
}

async function sendPaymentFailedEmail(params: {
  req: NextRequest;
  orgId: string;
  userId: string | null;
  eventId: string;
  invoice: Stripe.Invoice;
}) {
  const { req, orgId, userId, eventId, invoice } = params;

  const billingSub = await getBillingSubscriptionByOrg(orgId);
  if (!billingSub) return;

  // Idempotency: one Stripe event -> one email
  if (billingSub.last_payment_event_id === eventId) return;

  const email = await getAuthEmailForUserId(userId ?? billingSub.user_id ?? null);
  if (!email) return;

  const origin = getOrigin(req);
  const ctaUrl = `${origin}/billing`;

  const amountDue =
    typeof invoice.amount_due === "number" ? (invoice.amount_due / 100).toFixed(2) : null;

  await safeSendEmail({
    to: email,
    subject: "Payment failed: action needed to keep TempTake running",
    html: `
      <div style="font-family:system-ui,-apple-system,Segoe UI,Roboto,Arial,sans-serif;line-height:1.5;color:#111">
        <h2 style="margin:0 0 12px">Payment failed</h2>
        <p style="margin:0 0 12px">
          We couldn’t take your latest payment${amountDue ? ` (£${amountDue})` : ""}.
        </p>
        <p style="margin:0 0 16px">
          Update your payment details to avoid any interruption.
        </p>
        <p style="margin:0 0 18px">
          <a href="${ctaUrl}" style="display:inline-block;background:#111;color:#fff;text-decoration:none;padding:10px 14px;border-radius:10px">
            Fix payment
          </a>
        </p>
        <p style="margin:0;color:#555;font-size:12px">
          Need help? Reply to this email.
        </p>
      </div>
    `,
  });

  await markBillingSubEvent(orgId, {
    payment_failed_sent_at: new Date().toISOString(),
    last_payment_event_id: eventId,
  });
}

async function sendCancelledEmail(params: {
  req: NextRequest;
  orgId: string;
  userId: string | null;
  eventId: string;
  sub: Stripe.Subscription;
}) {
  const { req, orgId, userId, eventId, sub } = params;

  const billingSub = await getBillingSubscriptionByOrg(orgId);
  if (!billingSub) return;

  if (billingSub.last_payment_event_id === eventId) return;

  const email = await getAuthEmailForUserId(userId ?? billingSub.user_id ?? null);
  if (!email) return;

  const origin = getOrigin(req);
  const ctaUrl = `${origin}/pricing`;

  const endedAt =
    typeof (sub as any).canceled_at === "number"
      ? fmtDDMMYYYY(new Date((sub as any).canceled_at * 1000))
      : null;

  await safeSendEmail({
    to: email,
    subject: "Your TempTake subscription has been cancelled",
    html: `
      <div style="font-family:system-ui,-apple-system,Segoe UI,Roboto,Arial,sans-serif;line-height:1.5;color:#111">
        <h2 style="margin:0 0 12px">Subscription cancelled</h2>
        <p style="margin:0 0 12px">
          Your TempTake subscription has been cancelled${endedAt ? ` (${endedAt})` : ""}.
        </p>
        <p style="margin:0 0 16px">
          If that wasn’t intentional, you can restart in a couple of clicks.
        </p>
        <p style="margin:0 0 18px">
          <a href="${ctaUrl}" style="display:inline-block;background:#111;color:#fff;text-decoration:none;padding:10px 14px;border-radius:10px">
            Restart subscription
          </a>
        </p>
        <p style="margin:0;color:#555;font-size:12px">
          Need help? Reply to this email.
        </p>
      </div>
    `,
  });

  await markBillingSubEvent(orgId, {
    cancelled_sent_at: new Date().toISOString(),
    last_payment_event_id: eventId,
  });
}

export async function POST(req: NextRequest) {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!webhookSecret) {
    console.error("[stripe webhook] STRIPE_WEBHOOK_SECRET is missing");
    return NextResponse.json({ error: "Webhook misconfigured" }, { status: 500 });
  }

  let event: Stripe.Event;

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

        if (event.type === "customer.subscription.deleted") {
          const orgId = sub.metadata?.org_id ? String(sub.metadata.org_id) : null;
          const userId = sub.metadata?.supabase_user_id
            ? String(sub.metadata.supabase_user_id)
            : null;

          if (orgId) {
            await sendCancelledEmail({ req, orgId, userId, eventId: event.id, sub });
          }
        }
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        const resolved = await resolveOrgUserForInvoice(invoice);

        if (resolved.orgId) {
          await sendPaymentFailedEmail({
            req,
            orgId: resolved.orgId,
            userId: resolved.userId,
            eventId: event.id,
            invoice,
          });
        }
        break;
      }

      default:
        break;
    }

    return NextResponse.json({ received: true });
  } catch (err: any) {
    console.error("[stripe webhook] handler crashed:", err?.message ?? err);
    // 500 => Stripe retries (good)
    return NextResponse.json(
      { error: "Webhook handler error", details: err?.message ?? null },
      { status: 500 }
    );
  }
}

// src/app/api/stripe/create-checkout-session/route.ts
import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { getServerSupabaseAction } from "@/lib/supabaseServer";
import { getPlanForLocationCount } from "@/lib/billingTiers";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

async function getActiveOrgIdForUser(userId: string) {
  // Use service role so RLS cannot break billing
  const { data, error } = await supabaseAdmin
    .from("profiles")
    .select("org_id")
    .eq("id", userId)
    .maybeSingle();

  if (error) {
    console.error("[billing] profiles lookup failed", { userId, error });
    throw new Error("Failed to load profile");
  }

  if (!data?.org_id) {
    console.error("[billing] no org_id for user", { userId, data });
    throw new Error("No org linked to this user");
  }

  return String(data.org_id);
}

async function getLocationCountForOrg(orgId: string) {
  // Use service role so location counting is consistent
  const { count, error } = await supabaseAdmin
    .from("locations")
    .select("id", { count: "exact", head: true })
    .eq("org_id", orgId);

  if (error) {
    console.error("[billing] locations count error", { orgId, error });
    // fall back to 1 so tier selection doesn't explode
    return 1;
  }

  return count ?? 1;
}

async function getOrCreateStripeCustomer(params: {
  orgId: string;
  userId: string;
  email?: string | null;
}) {
  const { orgId, userId, email } = params;

  // 1) Try DB first
  const { data: existing, error: existingErr } = await supabaseAdmin
    .from("billing_customers")
    .select("stripe_customer_id")
    .eq("org_id", orgId)
    .maybeSingle();

  if (existingErr) {
    console.error("[billing] billing_customers lookup failed", { orgId, existingErr });
    throw new Error("Failed to load billing customer");
  }

  if (existing?.stripe_customer_id) {
    return String(existing.stripe_customer_id);
  }

  // 2) Create Stripe customer once
  const customer = await stripe.customers.create({
    email: email ?? undefined,
    metadata: {
      org_id: orgId,
      supabase_user_id: userId,
    },
  });

  // 3) Persist
  const { error: upsertErr } = await supabaseAdmin
    .from("billing_customers")
    .upsert(
      {
        org_id: orgId,
        user_id: userId,
        stripe_customer_id: customer.id,
      },
      { onConflict: "org_id" }
    );

  if (upsertErr) {
    console.error("[billing] billing_customers upsert failed", { orgId, upsertErr });
    // Don’t throw: Stripe customer exists, but DB failed. Still safer to stop here.
    throw new Error("Failed to save billing customer");
  }

  return customer.id;
}

export async function POST(req: NextRequest) {
  try {
    // 1) Identify the user from cookies/session
    const supabase = await getServerSupabaseAction();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    // 2) Resolve org_id via service role (no RLS flakiness)
    const orgId = await getActiveOrgIdForUser(user.id);

    // 3) Count locations via service role
    const locationCount = await getLocationCountForOrg(orgId);

    // 4) Decide monthly vs yearly
    const interval = req.nextUrl.searchParams.get("interval") || "month";
    const plan = getPlanForLocationCount(locationCount);

    let priceId = plan.stripePriceId;
    let billingInterval: "month" | "year" = "month";

    if (interval === "year") {
      if (locationCount > 1) {
        return NextResponse.json(
          { error: "Yearly billing is only available for single-site accounts" },
          { status: 400 }
        );
      }

      const annualPriceId = process.env.STRIPE_PRICE_SINGLE_SITE_ANNUAL;
      if (!annualPriceId) {
        console.error("[billing] STRIPE_PRICE_SINGLE_SITE_ANNUAL not configured");
        return NextResponse.json(
          { error: "Stripe yearly pricing not configured" },
          { status: 500 }
        );
      }

      priceId = annualPriceId;
      billingInterval = "year";
    }

    if (!priceId) {
      return NextResponse.json({ error: "Stripe pricing not configured" }, { status: 500 });
    }

    // 5) Build redirect URLs
    const origin =
      req.headers.get("origin") ??
      process.env.NEXT_PUBLIC_SITE_URL ??
      `${req.nextUrl.protocol}//${req.nextUrl.host}`;

    const successUrl = `${origin}/billing?success=1`;
    const cancelUrl = `${origin}/billing?canceled=1`;

    // 6) Ensure we always use ONE Stripe customer per org
    const customerId = await getOrCreateStripeCustomer({
      orgId,
      userId: user.id,
      email: user.email,
    });

    // 7) Create Stripe checkout session (attach to known customer)
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: customerId,
      line_items: [{ price: priceId, quantity: 1 }],

      subscription_data: {
        metadata: {
          org_id: orgId,
          plan_tier: plan.tier,
          max_locations: plan.maxLocations?.toString() ?? "",
          billing_interval: billingInterval,
          supabase_user_id: user.id,
        },
      },

      success_url: successUrl,
      cancel_url: cancelUrl,

      metadata: {
        supabase_user_id: user.id,
        org_id: orgId,
        plan_tier: plan.tier,
        billing_interval: billingInterval,
      },
    });

    if (!session.url) {
      console.error("[stripe] checkout session missing url");
      return NextResponse.json({ error: "Could not create checkout session" }, { status: 500 });
    }

    return NextResponse.redirect(session.url, { status: 303 });
  } catch (err: any) {
    console.error("[stripe] create-checkout-session error", err);
    return NextResponse.json(
      { error: "Internal server error", details: err?.message ?? null },
      { status: 500 }
    );
  }
}

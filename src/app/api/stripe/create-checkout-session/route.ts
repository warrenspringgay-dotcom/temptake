// src/app/api/stripe/create-checkout-session/route.ts
import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { getServerSupabaseAction } from "@/lib/supabaseServer";
import { getPlanForLocationCount } from "@/lib/billingTiers";

async function getActiveOrgIdForUser(supabase: any, userId: string) {
  const { data, error } = await supabase
    .from("profiles")
    .select("org_id")
    .eq("id", userId)
    .single();

  if (error || !data?.org_id) {
    console.error("[billing] no org_id for user", userId, error);
    throw new Error("No org linked to this user");
  }

  return data.org_id as string;
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await getServerSupabaseAction();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: "Not authenticated" },
        { status: 401 }
      );
    }

    const orgId = await getActiveOrgIdForUser(supabase, user.id);

    // How many locations does this org currently have?
    const { count: locCount, error: locErr } = await supabase
      .from("locations")
      .select("id", { count: "exact", head: true })
      .eq("org_id", orgId);

    if (locErr) {
      console.error("[billing] locations count error", locErr);
    }

    const locationCount = locCount ?? 1;

    // ----- Decide monthly vs yearly -----
    const interval = req.nextUrl.searchParams.get("interval") || "month";

    // Base plan (monthly) from our tiers helper
    const plan = getPlanForLocationCount(locationCount);

    let priceId = plan.stripePriceId;
    let billingInterval: "month" | "year" = "month";

    if (interval === "year") {
      // Yearly is only allowed for single-site
      if (locationCount > 1) {
        return NextResponse.json(
          { error: "Yearly billing is only available for single-site accounts" },
          { status: 400 }
        );
      }

      const annualPriceId = process.env.STRIPE_PRICE_SINGLE_SITE_ANNUAL;
      if (!annualPriceId) {
        console.error(
          "[billing] STRIPE_PRICE_SINGLE_SITE_ANNUAL is not configured"
        );
        return NextResponse.json(
          { error: "Stripe yearly pricing not configured" },
          { status: 500 }
        );
      }

      priceId = annualPriceId;
      billingInterval = "year";
    }

    if (!priceId) {
      return NextResponse.json(
        { error: "Stripe pricing not configured" },
        { status: 500 }
      );
    }

    const origin =
      req.headers.get("origin") ??
      `${req.nextUrl.protocol}//${req.nextUrl.host}`;

    const successUrl = `${origin}/billing?success=1`;
    const cancelUrl = `${origin}/billing?canceled=1`;

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer_email: user.email ?? undefined,
      line_items: [{ price: priceId, quantity: 1 }],

      subscription_data: {
        // You can keep the same trial for yearly, or set to 0 if you prefer
        trial_period_days: 14,
        metadata: {
          org_id: orgId,
          plan_tier: plan.tier,
          max_locations: plan.maxLocations?.toString() ?? "",
          billing_interval: billingInterval,
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
      return NextResponse.json(
        { error: "Could not create checkout session" },
        { status: 500 }
      );
    }

    // Important: redirect the browser straight to Stripe
    return NextResponse.redirect(session.url, { status: 303 });
  } catch (err: any) {
    console.error("[stripe] create-checkout-session error", err);
    return NextResponse.json(
      { error: "Internal server error", details: err?.message ?? null },
      { status: 500 }
    );
  }
}

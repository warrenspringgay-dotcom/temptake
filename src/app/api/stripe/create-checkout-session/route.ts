// src/app/api/stripe/create-checkout-session/route.ts
import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { getServerSupabaseAction } from "@/lib/supabaseServer";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import type { PlanBandId } from "@/lib/billingTiers";

export const runtime = "nodejs";

async function getActiveOrgIdForUser(userId: string) {
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

function getOrigin(req: NextRequest) {
  const originHeader = req.headers.get("origin"); // string | null
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL; // string | undefined

  const vercelUrl = process.env.NEXT_PUBLIC_VERCEL_URL
    ? `https://${process.env.NEXT_PUBLIC_VERCEL_URL}`
    : undefined;

  const fallback = `${req.nextUrl.protocol}//${req.nextUrl.host}`;

  const origin = originHeader || siteUrl || vercelUrl || fallback;
  return origin.replace(/\/$/, "");
}

function getPriceId(params: { band: PlanBandId; interval: "month" | "year" }) {
  const { band, interval } = params;

  const PRICE_SINGLE = process.env.STRIPE_PRICE_SINGLE_SITE;
  const PRICE_SINGLE_ANNUAL = process.env.STRIPE_PRICE_SINGLE_SITE_ANNUAL;
  const PRICE_UP_TO_3 = process.env.STRIPE_PRICE_UP_TO_3;
  const PRICE_UP_TO_5 = process.env.STRIPE_PRICE_UP_TO_5;

  if (band === "single") {
    if (interval === "year") {
      if (!PRICE_SINGLE_ANNUAL)
        throw new Error("STRIPE_PRICE_SINGLE_SITE_ANNUAL not configured");
      return { priceId: PRICE_SINGLE_ANNUAL, maxLocations: 1 };
    }
    if (!PRICE_SINGLE) throw new Error("STRIPE_PRICE_SINGLE_SITE not configured");
    return { priceId: PRICE_SINGLE, maxLocations: 1 };
  }

  if (interval === "year") {
    // Annual only for single site (your rule)
    throw new Error("Yearly billing is only available for single-site accounts");
  }

  if (band === "up_to_3") {
    if (!PRICE_UP_TO_3) throw new Error("STRIPE_PRICE_UP_TO_3 not configured");
    return { priceId: PRICE_UP_TO_3, maxLocations: 3 };
  }

  if (band === "up_to_5") {
    if (!PRICE_UP_TO_5) throw new Error("STRIPE_PRICE_UP_TO_5 not configured");
    return { priceId: PRICE_UP_TO_5, maxLocations: 5 };
  }

  // custom handled outside Stripe checkout
  throw new Error("Custom plans must be handled manually");
}

function parseBand(input: string | null): PlanBandId {
  if (input === "single" || input === "up_to_3" || input === "up_to_5" || input === "custom") {
    return input;
  }
  return "single";
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await getServerSupabaseAction();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const orgId = await getActiveOrgIdForUser(user.id);

    // /api/stripe/create-checkout-session?band=up_to_3&interval=month
    const band = parseBand(req.nextUrl.searchParams.get("band"));
    const interval =
      req.nextUrl.searchParams.get("interval") === "year" ? "year" : "month";

    if (band === "custom") {
      return NextResponse.json(
        { error: "Custom pricing: contact support at info@temptake.com" },
        { status: 400 }
      );
    }

    const { priceId, maxLocations } = getPriceId({ band, interval });

    const origin = getOrigin(req);
    const successUrl = `${origin}/billing?success=1`;
    const cancelUrl = `${origin}/billing?canceled=1`;

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer_email: user.email ?? undefined,
      line_items: [{ price: priceId, quantity: 1 }],

      subscription_data: {
        metadata: {
          org_id: orgId,
          supabase_user_id: user.id,
          plan_tier: band,
          max_locations: String(maxLocations),
          billing_interval: interval,
        },
      },

      success_url: successUrl,
      cancel_url: cancelUrl,

      metadata: {
        org_id: orgId,
        supabase_user_id: user.id,
        plan_tier: band,
        billing_interval: interval,
      },
    });

    if (!session.url) {
      console.error("[stripe] checkout session missing url");
      return NextResponse.json(
        { error: "Could not create checkout session" },
        { status: 500 }
      );
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

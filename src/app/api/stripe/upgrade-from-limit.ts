// src/app/api/stripe/upgrade-from-limit/route.ts
import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { getServerSupabaseAction } from "@/lib/supabaseServer";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { getPlanForLocationCount, type PlanBandId } from "@/lib/billingTiers";

export const runtime = "nodejs";

function getOrigin(req: NextRequest) {
  // Keep it boring and reliable. No clever nullish gymnastics.
  const headerOrigin = req.headers.get("origin");
  if (headerOrigin) return headerOrigin.replace(/\/$/, "");

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;
  if (siteUrl) return siteUrl.replace(/\/$/, "");

  const vercelUrl = process.env.NEXT_PUBLIC_VERCEL_URL;
  if (vercelUrl) return `https://${vercelUrl}`.replace(/\/$/, "");

  return `${req.nextUrl.protocol}//${req.nextUrl.host}`.replace(/\/$/, "");
}

async function getActiveOrgIdForUser(userId: string) {
  const { data, error } = await supabaseAdmin
    .from("profiles")
    .select("org_id")
    .eq("id", userId)
    .maybeSingle();

  if (error) {
    console.error("[upgrade-from-limit] profiles lookup failed", { userId, error });
    throw new Error("Failed to load profile");
  }
  if (!data?.org_id) {
    console.error("[upgrade-from-limit] no org_id for user", { userId, data });
    throw new Error("No org linked to this user");
  }

  return String(data.org_id);
}

async function getLocationCountForOrg(orgId: string) {
  const { count, error } = await supabaseAdmin
    .from("locations")
    .select("id", { count: "exact", head: true })
    .eq("org_id", orgId);

  if (error) {
    console.error("[upgrade-from-limit] locations count error", { orgId, error });
    // Fail safe: assume 1
    return 1;
  }

  return count ?? 1;
}

async function getOrgSubscriptionRow(orgId: string) {
  const { data, error } = await supabaseAdmin
    .from("billing_subscriptions")
    .select("*")
    .eq("org_id", orgId)
    .order("created_at", { ascending: false })
    .limit(1);

  if (error) {
    console.error("[upgrade-from-limit] billing_subscriptions read error", { orgId, error });
    return null;
  }

  return data?.[0] ?? null;
}

async function getOrgCustomerRow(orgId: string) {
  const { data, error } = await supabaseAdmin
    .from("billing_customers")
    .select("*")
    .eq("org_id", orgId)
    .maybeSingle();

  if (error) {
    console.error("[upgrade-from-limit] billing_customers read error", { orgId, error });
    return null;
  }

  return data ?? null;
}

function isSubManageable(status: string | null) {
  return status === "active" || status === "trialing" || status === "past_due";
}

function pickUpgradeBandId(desiredLocations: number): PlanBandId {
  // Uses your existing tier logic
  const plan = getPlanForLocationCount(desiredLocations);
  return plan.tier;
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

    const origin = getOrigin(req);
    const returnUrl =
      req.nextUrl.searchParams.get("returnUrl") || `${origin}/locations`;

    // If they were blocked trying to add a location, "desired" is current + 1 by default.
    const orgId = await getActiveOrgIdForUser(user.id);
    const currentLocations = await getLocationCountForOrg(orgId);
    const desiredLocationsRaw = req.nextUrl.searchParams.get("desiredLocations");
    const desiredLocations =
      desiredLocationsRaw && Number.isFinite(Number(desiredLocationsRaw))
        ? Math.max(1, Number(desiredLocationsRaw))
        : currentLocations + 1;

    const targetBand = getPlanForLocationCount(desiredLocations);

    // Custom tier: don’t pretend this is self-serve.
    if (targetBand.tier === "custom") {
      return NextResponse.redirect(
        `${origin}/billing?custom=1&desired=${desiredLocations}`,
        { status: 303 }
      );
    }

    const subRow = await getOrgSubscriptionRow(orgId);
    const status = (subRow?.status as string | null) ?? null;
    const stripeSubId = (subRow?.stripe_subscription_id as string | null) ?? null;

    // If they already have a real Stripe subscription, send them to portal upgrade flow.
    if (stripeSubId && isSubManageable(status)) {
      const portalSession = await stripe.billingPortal.sessions.create({
        customer: (await (async () => {
          // Portal needs customer id. We store it org-scoped.
          const custRow = await getOrgCustomerRow(orgId);
          const stripeCustomerId =
            (custRow?.stripe_customer_id as string | null) ?? null;

          if (!stripeCustomerId) {
            throw new Error("Missing Stripe customer for portal session");
          }
          return stripeCustomerId;
        })()),
        return_url: returnUrl,
        flow_data: {
          type: "subscription_update",
          subscription_update: {
            subscription: stripeSubId,
          },
        },
      });

      return NextResponse.redirect(portalSession.url, { status: 303 });
    }

    // Otherwise: they’re trial/no-sub, so create a Checkout subscription for the correct band.
    const priceId = targetBand.stripePriceId;
    if (!priceId) {
      return NextResponse.json(
        { error: "Stripe price not configured for selected tier" },
        { status: 500 }
      );
    }

    const customerRow = await getOrgCustomerRow(orgId);
    const stripeCustomerId =
      (customerRow?.stripe_customer_id as string | null) ?? null;

    const successUrl = `${origin}/locations?upgraded=1`;
    const cancelUrl = `${origin}/locations?upgradeCanceled=1`;

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      // If we already have a Stripe customer for this org, use it.
      ...(stripeCustomerId
        ? { customer: stripeCustomerId }
        : { customer_email: user.email ?? undefined }),

      line_items: [{ price: priceId, quantity: 1 }],

      subscription_data: {
        metadata: {
          org_id: orgId,
          plan_tier: targetBand.tier,
          max_locations: String(targetBand.maxLocations ?? ""),
          billing_interval: "month",
          supabase_user_id: user.id,
          upgrade_reason: "location_limit",
          desired_locations: String(desiredLocations),
          current_locations: String(currentLocations),
        },
      },

      success_url: successUrl,
      cancel_url: cancelUrl,

      metadata: {
        supabase_user_id: user.id,
        org_id: orgId,
        plan_tier: targetBand.tier,
        upgrade_reason: "location_limit",
      },
    });

    if (!session.url) {
      return NextResponse.json(
        { error: "Could not create checkout session" },
        { status: 500 }
      );
    }

    return NextResponse.redirect(session.url, { status: 303 });
  } catch (err: any) {
    console.error("[upgrade-from-limit] error", err);
    return NextResponse.json(
      { error: "Internal server error", details: err?.message ?? null },
      { status: 500 }
    );
  }
}

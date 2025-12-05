import { NextRequest, NextResponse } from "next/server";
import {
  stripe,
  STRIPE_PRICE_MONTHLY, // 👈 this is now your tiered monthly price
} from "@/lib/stripe";
import { getServerSupabaseAction } from "@/lib/supabaseServer";

/**
 * Get the org_id for the current user from profiles.
 */
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

/**
 * Count how many locations this org has.
 * We bill per-location, with Stripe handling the tiers.
 */
async function getOrgLocationCount(supabase: any, orgId: string) {
  const { count, error } = await supabase
    .from("locations")
    .select("*", { count: "exact", head: true })
    .eq("org_id", orgId);

  if (error) {
    console.error("[billing] getOrgLocationCount error", { orgId, error });
    // Fallback to 1 so they can still subscribe
    return 1;
  }

  // Minimum 1 location for billing purposes
  return Math.max(count ?? 1, 1);
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
    const locationCount = await getOrgLocationCount(supabase, orgId);

    // 🔒 6+ locations require custom pricing
    if (locationCount > 5) {
      return NextResponse.json(
        {
          error:
            "For 6+ locations please contact us for custom pricing and onboarding.",
        },
        { status: 400 }
      );
    }

    const origin =
      req.headers.get("origin") ??
      `${req.nextUrl.protocol}//${req.nextUrl.host}`;

    // Try to reuse existing Stripe customer for this org
    const { data: existingCust } = await supabase
      .from("billing_customers")
      .select("stripe_customer_id")
      .eq("org_id", orgId)
      .maybeSingle();

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",

      // Reuse Stripe customer if we already have one
      customer: existingCust?.stripe_customer_id ?? undefined,

      // Otherwise let Stripe create a new customer from the email
      customer_email: existingCust ? undefined : user.email ?? undefined,

      // 👇 KEY BIT: quantity = number of locations
      line_items: [
        {
          price: STRIPE_PRICE_MONTHLY,
          quantity: locationCount,
        },
      ],

      // 14-day free trial, org-level metadata
      subscription_data: {
        trial_period_days: 14,
        metadata: {
          org_id: orgId,
          initial_location_count: String(locationCount),
        },
      },

      success_url: `${origin}/billing?success=1`,
      cancel_url: `${origin}/billing?canceled=1`,

      metadata: {
        supabase_user_id: user.id,
        org_id: orgId,
        billing_model: "tiered_locations_monthly",
      },
    });

    return NextResponse.json({ url: session.url });
  } catch (err: any) {
    console.error("[stripe] create-checkout-session error", err);
    return NextResponse.json(
      { error: "Internal server error", details: err?.message ?? null },
      { status: 500 }
    );
  }
}

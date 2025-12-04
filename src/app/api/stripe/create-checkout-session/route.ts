// src/app/api/stripe/create-checkout-session/route.ts
import { NextRequest, NextResponse } from "next/server";
import {
  stripe,
  STRIPE_PRICE_MONTHLY,
  STRIPE_PRICE_YEARLY,
} from "@/lib/stripe";
import { getServerSupabaseAction } from "@/lib/supabaseServer";

async function getActiveOrgIdForUser(supabase: any, userId: string) {
  const { data, error } = await supabase
    .from("profiles")
    .select("org_id")
    .eq("id", userId)
    .maybeSingle();

  // Any “real” error that isn't just "no rows"
  if (error && error.code !== "PGRST116") {
    console.error("[billing] error loading org_id for user", { userId, error });
    throw new Error("Failed to load organisation");
  }

  if (!data?.org_id) {
    console.error("[billing] no org_id for user", userId, error);
    return null; // 👈 caller will handle nicely
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

    if (!orgId) {
      return NextResponse.json(
        {
          error:
            "No kitchen/organisation is linked to this account yet. Please finish setup first.",
        },
        { status: 400 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const plan = body?.plan === "annual" ? "annual" : "monthly";

    const priceId =
      plan === "annual" ? STRIPE_PRICE_YEARLY : STRIPE_PRICE_MONTHLY;

    if (!priceId) {
      return NextResponse.json(
        { error: "Stripe price id not configured" },
        { status: 500 }
      );
    }

    const origin =
      req.headers.get("origin") ??
      `${req.nextUrl.protocol}//${req.nextUrl.host}`;

    const successUrl = `${origin}/billing?success=1`;
    const cancelUrl = `${origin}/billing?canceled=1`;

    // Try to reuse existing Stripe customer for this org
    const { data: existingCust } = await supabase
      .from("billing_customers")
      .select("stripe_customer_id")
      .eq("org_id", orgId)
      .maybeSingle();

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",

      // If we already have a customer for this org, reuse it
      customer: existingCust?.stripe_customer_id ?? undefined,

      // Otherwise let Stripe create a new customer from the email
      customer_email: existingCust ? undefined : user.email ?? undefined,

      line_items: [{ price: priceId, quantity: 1 }],

      // 🔥 FREE TRIAL
      subscription_data: {
        trial_period_days: 14, // free trial length
        metadata: {
          org_id: orgId,
        },
      },

      success_url: successUrl,
      cancel_url: cancelUrl,

      // Session-level metadata (still useful for debugging / cross-checking)
      metadata: {
        supabase_user_id: user.id,
        org_id: orgId,
        plan,
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

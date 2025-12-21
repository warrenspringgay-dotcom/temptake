import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { getServerSupabaseAction } from "@/lib/supabaseServer";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string, {
  apiVersion: "2025-11-17.clover",
});

export async function POST(req: NextRequest) {
  try {
    const supabase = await getServerSupabaseAction();

    // 1) Auth
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Not signed in." }, { status: 401 });
    }

    // 2) Resolve org_id (single source of truth)
    const { data: profile, error: profileErr } = await supabase
      .from("profiles")
      .select("org_id")
      .eq("id", user.id)
      .maybeSingle();

    if (profileErr || !profile?.org_id) {
      return NextResponse.json(
        { error: "No organisation linked to this account." },
        { status: 400 }
      );
    }

    const orgId = String(profile.org_id);

    // 3) Find Stripe customer id (prefer org_id, fallback to user_id)
    const { data: customerRow, error: customerErr } = await supabase
      .from("billing_customers")
      .select("stripe_customer_id")
      .eq("org_id", orgId)
      .maybeSingle();

    if (customerErr) {
      console.error("[portal] billing_customers lookup error:", customerErr);
      return NextResponse.json(
        { error: "Could not load billing customer record." },
        { status: 400 }
      );
    }

    let stripeCustomerId = customerRow?.stripe_customer_id ?? null;

    // Fallback: older schema keyed by user_id
    if (!stripeCustomerId) {
      const { data: byUser, error: byUserErr } = await supabase
        .from("billing_customers")
        .select("stripe_customer_id")
        .eq("user_id", user.id)
        .maybeSingle();

      if (!byUserErr && byUser?.stripe_customer_id) {
        stripeCustomerId = byUser.stripe_customer_id;
      }
    }

    if (!stripeCustomerId) {
      return NextResponse.json(
        { error: "No Stripe customer is linked to this account yet." },
        { status: 400 }
      );
    }

    // 4) Create portal session
    const origin = new URL(req.url).origin;

    const portalSession = await stripe.billingPortal.sessions.create({
      customer: stripeCustomerId,
      return_url: `${origin}/billing`,
    });

    return NextResponse.redirect(portalSession.url, { status: 303 });
  } catch (err: any) {
    console.error("[portal] create portal session error:", err);
    return NextResponse.json(
      { error: "Internal error creating billing portal session." },
      { status: 500 }
    );
  }
}

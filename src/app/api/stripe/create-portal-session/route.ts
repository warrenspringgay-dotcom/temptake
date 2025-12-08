// src/app/api/stripe/create-portal-session/route.ts
import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { getServerSupabase } from "@/lib/supabaseServer";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string, {
  // Must match your Stripe dashboard API version
  apiVersion: "2025-11-17.clover",
});

export async function POST(req: NextRequest) {
  try {
    const supabase = await getServerSupabase();

    // 1) Get logged-in user
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: "Not signed in." }, { status: 401 });
    }

    // 2) Look up Stripe customer id
    const { data: customerRow, error: customerError } = await supabase
      .from("billing_customers")
      .select("stripe_customer_id")
      .eq("user_id", user.id)
      .maybeSingle();

    if (customerError) {
      console.error("billing_customers error:", customerError);
      return NextResponse.json(
        { error: "Could not find billing record for this user." },
        { status: 400 }
      );
    }

    if (!customerRow?.stripe_customer_id) {
      return NextResponse.json(
        { error: "No Stripe customer is linked to this account yet." },
        { status: 400 }
      );
    }

    // 3) Create portal session
    const origin = new URL(req.url).origin;

    const portalSession = await stripe.billingPortal.sessions.create({
      customer: customerRow.stripe_customer_id,
      return_url: `${origin}/billing`,
    });

    // 4) Redirect to Stripe's billing portal
    return NextResponse.redirect(portalSession.url, { status: 303 });
  } catch (err) {
    console.error("Error creating Stripe billing portal session:", err);
    return NextResponse.json(
      { error: "Internal error creating billing portal session." },
      { status: 500 }
    );
  }
}

// src/app/api/stripe/create-portal-session/route.ts
import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { getServerSupabase } from "@/lib/supabaseServer";

// Use your secret key; don't override apiVersion to avoid TS literal issues
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string);

export async function POST(req: NextRequest) {
  try {
    const supabase = await getServerSupabase();

    // 1) Get the current logged-in user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: "Not authenticated." },
        { status: 401 }
      );
    }

    // 2) Look up Stripe customer row for this user
    const { data: customerRow, error: customerError } = await supabase
      .from("billing_customers")
      .select("stripe_customer_id")
      .eq("user_id", user.id)
      .maybeSingle();

    if (customerError) {
      console.error("Error loading billing_customers row:", customerError);
      return NextResponse.json(
        { error: "Could not load billing information." },
        { status: 500 }
      );
    }

    if (!customerRow?.stripe_customer_id) {
      return NextResponse.json(
        { error: "No Stripe customer is linked to this account yet." },
        { status: 400 }
      );
    }

    // 3) Create a Stripe Billing Portal session
    const origin = new URL(req.url).origin;

    const portalSession = await stripe.billingPortal.sessions.create({
      customer: customerRow.stripe_customer_id,
      return_url: `${origin}/billing`,
    });

    // 4) Redirect the browser to Stripe's portal URL
    return NextResponse.redirect(portalSession.url, { status: 303 });
  } catch (err: any) {
    console.error("Error creating Stripe billing portal session:", err);
    return NextResponse.json(
      { error: "Internal error creating billing portal session." },
      { status: 500 }
    );
  }
}

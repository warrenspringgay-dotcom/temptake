import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { getServerSupabase } from "@/lib/supabaseServer";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string, {
  apiVersion: "2025-11-17.clover",
});

export async function POST(req: NextRequest) {
  try {
    const supabase = await getServerSupabase();

    // 1) Get logged-in user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Not signed in." }, { status: 401 });
    }

    // 2) Resolve org_id from profiles (SOURCE OF TRUTH)
    const { data: profile, error: profileErr } = await supabase
      .from("profiles")
      .select("org_id")
      .eq("id", user.id)
      .single();

    if (profileErr || !profile?.org_id) {
      console.error("[billing] profile missing org_id", profileErr);
      return NextResponse.json(
        { error: "No organisation linked to this account." },
        { status: 400 }
      );
    }

    const orgId = profile.org_id;

    // 3) Look up Stripe customer by org_id (NOT user_id)
    const { data: customerRow, error: customerErr } = await supabase
      .from("billing_customers")
      .select("stripe_customer_id")
      .eq("org_id", orgId)
      .maybeSingle();

    if (customerErr) {
      console.error("[billing] billing_customers error", customerErr);
      return NextResponse.json(
        { error: "Failed to load billing customer." },
        { status: 500 }
      );
    }

    if (!customerRow?.stripe_customer_id) {
      return NextResponse.json(
        { error: "No Stripe customer linked to this organisation yet." },
        { status: 400 }
      );
    }

    // 4) Create Stripe billing portal session
    const origin = new URL(req.url).origin;

    const portalSession = await stripe.billingPortal.sessions.create({
      customer: customerRow.stripe_customer_id,
      return_url: `${origin}/billing`,
    });

    // 5) Redirect user to Stripe portal
    return NextResponse.redirect(portalSession.url, { status: 303 });
  } catch (err: any) {
    console.error("[billing] portal session error", err);
    return NextResponse.json(
      { error: "Internal error creating billing portal session." },
      { status: 500 }
    );
  }
}

// src/app/api/stripe/create-portal-session/route.ts
import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { getServerSupabaseAction } from "@/lib/supabaseServer";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function POST(req: NextRequest) {
  try {
    const supabase = await getServerSupabaseAction();

    // 1) Get logged-in user
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

    // 2) Look up Stripe customer for this user
    const { data: customerRow, error: custError } = await supabaseAdmin
      .from("billing_customers")
      .select("stripe_customer_id")
      .eq("user_id", user.id)
      .single();

    if (custError || !customerRow?.stripe_customer_id) {
      console.error("[stripe portal] no billing_customers row for user", {
        userId: user.id,
        custError,
      });
      return NextResponse.json(
        { error: "No Stripe customer found for this user" },
        { status: 400 }
      );
    }

    const customerId = customerRow.stripe_customer_id as string;

    // 3) Build a return URL back to /billing
    const origin =
      req.headers.get("origin") ??
      `${req.nextUrl.protocol}//${req.nextUrl.host}`;

    // 4) Create Stripe billing portal session
    const portalSession = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: `${origin}/billing`,
    });

    if (!portalSession.url) {
      return NextResponse.json(
        { error: "Unable to create billing portal session" },
        { status: 500 }
      );
    }

    return NextResponse.json({ url: portalSession.url });
  } catch (err: any) {
    console.error("[stripe portal] error", err);
    return NextResponse.json(
      { error: "Internal server error", details: err?.message ?? null },
      { status: 500 }
    );
  }
}

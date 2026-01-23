// src/app/api/stripe/create-portal-session/route.ts
import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { getServerSupabaseAction } from "@/lib/supabaseServer";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const runtime = "nodejs";

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

    // Find org_id
    const { data: profile, error: profErr } = await supabaseAdmin
      .from("profiles")
      .select("org_id")
      .eq("id", user.id)
      .maybeSingle();

    if (profErr || !profile?.org_id) {
      return NextResponse.json({ error: "No org for user" }, { status: 400 });
    }

    const orgId = String(profile.org_id);

    // Require a Stripe customer
    const { data: bc, error: bcErr } = await supabaseAdmin
      .from("billing_customers")
      .select("stripe_customer_id")
      .eq("org_id", orgId)
      .maybeSingle();

    if (bcErr || !bc?.stripe_customer_id) {
      return NextResponse.json(
        { error: "No Stripe customer for org" },
        { status: 400 }
      );
    }

    // Require a Stripe subscription (so portal isn’t pointless)
    const { data: sub, error: subErr } = await supabaseAdmin
      .from("billing_subscriptions")
      .select("stripe_subscription_id,status")
      .eq("org_id", orgId)
      .maybeSingle();

    if (subErr || !sub?.stripe_subscription_id) {
      // redirect back to billing with a useful message
      const origin =
        req.headers.get("origin") ??
        process.env.NEXT_PUBLIC_SITE_URL ??
        `${req.nextUrl.protocol}//${req.nextUrl.host}`;

      return NextResponse.redirect(`${origin}/billing?portal=nosub`, { status: 303 });
    }

    const origin =
      req.headers.get("origin") ??
      process.env.NEXT_PUBLIC_SITE_URL ??
      `${req.nextUrl.protocol}//${req.nextUrl.host}`;

    const session = await stripe.billingPortal.sessions.create({
      customer: bc.stripe_customer_id,
      return_url: `${origin}/billing`,
    });

    return NextResponse.redirect(session.url, { status: 303 });
  } catch (err: any) {
    console.error("[stripe] create-portal-session error", err);
    return NextResponse.json(
      { error: "Internal error creating billing portal session." },
      { status: 500 }
    );
  }
}

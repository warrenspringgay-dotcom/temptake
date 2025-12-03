// src/app/api/stripe/create-portal-session/route.ts
import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { getServerSupabaseAction } from "@/lib/supabaseServer";
import { createClient } from "@supabase/supabase-js";

// Lazy admin client so we don't touch env vars at module load
function getSupabaseAdmin() {
  const url = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    throw new Error("supabaseAdmin: SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY is missing");
  }

  return createClient(url, serviceKey, {
    auth: { persistSession: false },
  });
}

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

    // 2) Resolve user's org_id
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("org_id")
      .eq("id", user.id)
      .single();

    if (profileError || !profile?.org_id) {
      console.error("[stripe portal] no org_id for user", {
        userId: user.id,
        profileError,
      });
      return NextResponse.json(
        { error: "No organisation linked to this user" },
        { status: 400 }
      );
    }

    const orgId = profile.org_id as string;

    // 3) Look up Stripe customer for this org (org-level billing)
    const supabaseAdmin = getSupabaseAdmin();
    const { data: customerRow, error: custError } = await supabaseAdmin
      .from("billing_customers")
      .select("stripe_customer_id")
      .eq("org_id", orgId)
      .single();

    if (custError || !customerRow?.stripe_customer_id) {
      console.error("[stripe portal] no billing_customers row for org", {
        orgId,
        custError,
      });
      return NextResponse.json(
        { error: "No Stripe customer found for this organisation" },
        { status: 400 }
      );
    }

    const customerId = customerRow.stripe_customer_id as string;

    // 4) Build a return URL back to /billing
    const origin =
      req.headers.get("origin") ??
      `${req.nextUrl.protocol}//${req.nextUrl.host}`;

    // 5) Create Stripe billing portal session
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

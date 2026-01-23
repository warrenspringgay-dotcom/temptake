// src/app/api/stripe/create-portal-session/route.ts
import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { getServerSupabase } from "@/lib/supabaseServer";
import { getActiveOrgIdServer } from "@/lib/orgServer";

export const runtime = "nodejs";

function originFromReq(req: NextRequest) {
  const env =
    process.env.NEXT_PUBLIC_SITE_URL ||
    (process.env.NEXT_PUBLIC_VERCEL_URL
      ? `https://${process.env.NEXT_PUBLIC_VERCEL_URL}`
      : "");
  return (env || req.nextUrl.origin).replace(/\/$/, "");
}

async function readReturnUrl(req: NextRequest) {
  // 1) querystring (best for <form method="POST">)
  const fromQuery = req.nextUrl.searchParams.get("returnUrl");
  if (fromQuery) return fromQuery;

  // 2) JSON body (best for fetch())
  const body = (await req.json().catch(() => null)) as { returnUrl?: string } | null;
  if (body?.returnUrl) return body.returnUrl;

  // 3) fallback
  return `${originFromReq(req)}/billing`;
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await getServerSupabase();

    const {
      data: { user },
      error: userErr,
    } = await supabase.auth.getUser();

    if (userErr || !user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    // org
    let orgId: string | null = null;
    try {
      orgId = await getActiveOrgIdServer();
    } catch {
      orgId = null;
    }

    if (!orgId) {
      const { data: prof } = await supabaseAdmin
        .from("profiles")
        .select("org_id")
        .eq("id", user.id)
        .maybeSingle();

      if (!prof?.org_id) {
        return NextResponse.json({ error: "No active org" }, { status: 400 });
      }
      orgId = String(prof.org_id);
    }

    const returnUrl = await readReturnUrl(req);

    // load customer id
    const { data: bc, error: bcErr } = await supabaseAdmin
      .from("billing_customers")
      .select("stripe_customer_id")
      .eq("org_id", orgId)
      .maybeSingle();

    if (bcErr) {
      return NextResponse.json(
        { error: "Failed to load billing customer", detail: bcErr.message },
        { status: 500 }
      );
    }

    let stripeCustomerId = bc?.stripe_customer_id
      ? String(bc.stripe_customer_id)
      : null;

    // create if missing (this is what fixes your trial case)
    if (!stripeCustomerId) {
      const customer = await stripe.customers.create({
        email: user.email ?? undefined,
        metadata: {
          org_id: orgId,
          supabase_user_id: user.id,
        },
      });

      stripeCustomerId = customer.id;

      const { error: upsertErr } = await supabaseAdmin
        .from("billing_customers")
        .upsert(
          {
            org_id: orgId,
            user_id: user.id,
            stripe_customer_id: stripeCustomerId,
          },
          { onConflict: "org_id" }
        );

      if (upsertErr) {
        return NextResponse.json(
          { error: "Created Stripe customer but failed to save", detail: upsertErr.message },
          { status: 500 }
        );
      }
    }

    const session = await stripe.billingPortal.sessions.create({
      customer: stripeCustomerId,
      return_url: returnUrl,
    });

    // If this was a <form>, redirect nicely.
    return NextResponse.redirect(session.url!, { status: 303 });
  } catch (err: any) {
    console.error("[create-portal-session] error", err?.message ?? err);
    return NextResponse.json(
      { error: "Internal error creating billing portal session." },
      { status: 500 }
    );
  }
}

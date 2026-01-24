// src/app/api/stripe/create-portal-session/route.ts
import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { getServerSupabaseAction } from "@/lib/supabaseServer";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function getOrigin(req: NextRequest) {
  const origin =
    req.headers.get("origin") ||
    process.env.NEXT_PUBLIC_SITE_URL ||
    (process.env.NEXT_PUBLIC_VERCEL_URL
      ? `https://${process.env.NEXT_PUBLIC_VERCEL_URL}`
      : `${req.nextUrl.protocol}//${req.nextUrl.host}`);

  return origin.replace(/\/$/, "");
}

export async function POST(req: NextRequest) {
  try {
    const origin = getOrigin(req);

    // Allow an optional returnUrl query param, else default to /billing
    const returnUrlParam = req.nextUrl.searchParams.get("returnUrl");
    const returnUrl =
      (returnUrlParam && returnUrlParam.startsWith("http") && returnUrlParam) ||
      `${origin}/billing`;

    // Auth user (cookies/session)
    const supabase = await getServerSupabaseAction();
    const {
      data: { user },
      error: authErr,
    } = await supabase.auth.getUser();

    if (authErr || !user) {
      return NextResponse.redirect(`${origin}/login?next=/billing`, { status: 303 });
    }

    // Resolve org_id
    const { data: profile, error: profErr } = await supabaseAdmin
      .from("profiles")
      .select("org_id")
      .eq("id", user.id)
      .maybeSingle();

    if (profErr) {
      console.error("[create-portal-session] profile lookup error", profErr);
      return NextResponse.redirect(`${origin}/billing?portal_error=profile`, { status: 303 });
    }

    const orgId = profile?.org_id ? String(profile.org_id) : null;
    if (!orgId) {
      return NextResponse.redirect(`${origin}/billing?portal_error=no_org`, { status: 303 });
    }

    // Get Stripe customer id for org (org-scoped)
    const { data: custRow, error: custErr } = await supabaseAdmin
      .from("billing_customers")
      .select("stripe_customer_id")
      .eq("org_id", orgId)
      .maybeSingle();

    if (custErr) {
      console.error("[create-portal-session] billing_customers lookup error", custErr);
      return NextResponse.redirect(`${origin}/billing?portal_error=customer_lookup`, {
        status: 303,
      });
    }

    let stripeCustomerId = custRow?.stripe_customer_id
      ? String(custRow.stripe_customer_id)
      : null;

    // If none exists yet, create one now (so portal works during trial)
    if (!stripeCustomerId) {
      const created = await stripe.customers.create({
        email: user.email ?? undefined,
        metadata: {
          org_id: orgId,
          supabase_user_id: user.id,
        },
      });

      stripeCustomerId = created.id;

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
        console.error("[create-portal-session] billing_customers upsert error", upsertErr);
        // Customer exists in Stripe now, but we can't persist it. Still let them in.
      }
    }

    // Create billing portal session
    const session = await stripe.billingPortal.sessions.create({
      customer: stripeCustomerId,
      return_url: returnUrl,
    });

    // IMPORTANT: redirect to the portal session URL
    return NextResponse.redirect(session.url, { status: 303 });
  } catch (err: any) {
    console.error("[create-portal-session] crashed", err?.message ?? err);
    const origin =
      process.env.NEXT_PUBLIC_SITE_URL ||
      (process.env.NEXT_PUBLIC_VERCEL_URL
        ? `https://${process.env.NEXT_PUBLIC_VERCEL_URL}`
        : "https://temptake.com");

    // Make the failure visible instead of doing a “nothing happened” refresh
    return NextResponse.redirect(
      `${origin.replace(/\/$/, "")}/billing?portal_error=exception`,
      { status: 303 }
    );
  }
}

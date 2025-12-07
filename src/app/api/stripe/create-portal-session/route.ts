// src/app/api/stripe/create-portal-session/route.ts
import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { getServerSupabaseAction } from "@/lib/supabaseServer";

export async function POST(req: NextRequest) {
  const supabase = await getServerSupabaseAction();

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    const loginUrl = new URL("/login?next=/billing", req.url);
    return NextResponse.redirect(loginUrl);
  }

  const { data: customerRow } = await supabase
    .from("billing_customers")
    .select("stripe_customer_id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!customerRow?.stripe_customer_id) {
    const backToBilling = new URL("/billing?error=no_customer", req.url);
    return NextResponse.redirect(backToBilling);
  }

  const portalSession = await stripe.billingPortal.sessions.create({
    customer: customerRow.stripe_customer_id,
    return_url: new URL("/billing", req.url).toString(),
  });

  // 👇 use 303 so POST -> GET when hitting Stripe
  return NextResponse.redirect(portalSession.url, { status: 303 });
}

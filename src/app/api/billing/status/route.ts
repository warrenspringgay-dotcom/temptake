// src/app/api/billing/status/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getServerSupabase } from "@/lib/supabaseServer";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

type StatusJson = {
  ok: boolean;
  loggedIn: boolean;
  hasValid: boolean;
  active: boolean;
  onTrial: boolean;

  status?: string | null;

  // core billing fields
  priceId?: string | null;
  planName?: string | null; // derived from priceId (UI convenience)
  maxLocations?: number; // SOURCE OF TRUTH for gating (server-derived)
  cancelAtPeriodEnd?: boolean | null;

  trialEndsAt?: string | null;
  currentPeriodEnd?: string | null;

  reason?: string;
};

function addDays(date: Date, days: number) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

/**
 * Server-side mapping: Stripe price_id -> max locations
 * IMPORTANT: keep this on the server so the client isn't tied to env injection.
 */
function maxLocationsFromPriceId(priceId: string | null): number {
  // Trial / no Stripe subscription yet -> single site gating
  if (!priceId) return 1;

  const single = process.env.STRIPE_PRICE_SINGLE_SITE ?? "";
  const singleAnnual = process.env.STRIPE_PRICE_SINGLE_SITE_ANNUAL ?? "";
  const upTo3 = process.env.STRIPE_PRICE_UP_TO_3 ?? "";
  const upTo5 = process.env.STRIPE_PRICE_UP_TO_5 ?? "";

  if (priceId === single) return 1;
  if (priceId === singleAnnual) return 1;
  if (priceId === upTo3) return 3;
  if (priceId === upTo5) return 5;

  // Unknown/legacy/custom: safest is restrict, not “unlimited”.
  return 1;
}

/**
 * Map Stripe price_id -> plan name (UI only).
 */
function planNameFromPriceId(priceId: string | null): string | null {
  if (!priceId) return "Free trial";

  const single = process.env.STRIPE_PRICE_SINGLE_SITE ?? "";
  const singleAnnual = process.env.STRIPE_PRICE_SINGLE_SITE_ANNUAL ?? "";
  const upTo3 = process.env.STRIPE_PRICE_UP_TO_3 ?? "";
  const upTo5 = process.env.STRIPE_PRICE_UP_TO_5 ?? "";

  if (priceId === single) return "Single site (monthly)";
  if (priceId === singleAnnual) return "Single site (annual)";
  if (priceId === upTo3) return "Up to 3 sites (monthly)";
  if (priceId === upTo5) return "Up to 5 sites (monthly)";

  return "Custom / legacy";
}

export async function GET(req: Request) {
  try {
    // 1) Prefer Bearer token if provided (client -> server)
    const authHeader =
      req.headers.get("authorization") || req.headers.get("Authorization");
    const bearer = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;

    let userId: string | null = null;

    if (bearer) {
      const supabaseTokenClient = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        { global: { headers: { Authorization: `Bearer ${bearer}` } } }
      );

      const { data, error } = await supabaseTokenClient.auth.getUser();
      if (!error && data?.user) userId = data.user.id;
    }

    // 2) Fallback to cookie-based auth (server)
    if (!userId) {
      const supabase = await getServerSupabase();
      const {
        data: { user },
        error: userErr,
      } = await supabase.auth.getUser();

      if (userErr || !user) {
        const out: StatusJson = {
          ok: true,
          loggedIn: false,
          hasValid: false,
          active: false,
          onTrial: false,
          reason: "not_authenticated",
        };
        return NextResponse.json(out, { status: 200 });
      }

      userId = user.id;
    }

    // 3) Get org_id (use admin so RLS can’t block it)
    const { data: profile, error: profileErr } = await supabaseAdmin
      .from("profiles")
      .select("org_id")
      .eq("id", userId)
      .maybeSingle();

    const orgId = profile?.org_id ?? null;

    if (profileErr || !orgId) {
      const out: StatusJson = {
        ok: true,
        loggedIn: true,
        hasValid: false,
        active: false,
        onTrial: false,
        reason: "no_org",
      };
      return NextResponse.json(out, { status: 200 });
    }

    // 4) Read subscription using admin (RLS-proof)
    let { data: sub, error: subErr } = await supabaseAdmin
      .from("billing_subscriptions")
      .select(
        "status, price_id, trial_ends_at, current_period_end, cancel_at_period_end, created_at"
      )
      .eq("org_id", orgId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (subErr) {
      const out: StatusJson = {
        ok: false,
        loggedIn: true,
        hasValid: false,
        active: false,
        onTrial: false,
        reason: `billing_lookup_failed:${subErr.message}`,
      };
      return NextResponse.json(out, { status: 200 });
    }

    // 5) Self-heal: if missing, create a 14-day trial row
    if (!sub) {
      const trialEndsAt = addDays(new Date(), 14);
      const trialIso = trialEndsAt.toISOString();

      const { error: insErr } = await supabaseAdmin
        .from("billing_subscriptions")
        .insert({
          org_id: orgId,
          user_id: userId,
          status: "trialing",
          price_id: null, // trial has no Stripe price yet
          trial_ends_at: trialIso,
          current_period_end: trialIso,
          cancel_at_period_end: false,
        });

      if (insErr) {
        const out: StatusJson = {
          ok: false,
          loggedIn: true,
          hasValid: false,
          active: false,
          onTrial: false,
          reason: `trial_insert_failed:${insErr.message}`,
        };
        return NextResponse.json(out, { status: 200 });
      }

      // Re-read after insert
      const reread = await supabaseAdmin
        .from("billing_subscriptions")
        .select(
          "status, price_id, trial_ends_at, current_period_end, cancel_at_period_end, created_at"
        )
        .eq("org_id", orgId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      sub = reread.data ?? null;
    }

    if (!sub) {
      const out: StatusJson = {
        ok: true,
        loggedIn: true,
        hasValid: false,
        active: false,
        onTrial: false,
        reason: "no_subscription_row",
      };
      return NextResponse.json(out, { status: 200 });
    }

    const status = String(sub.status ?? "").toLowerCase();

    const trialEndsAt = sub.trial_ends_at
      ? new Date(sub.trial_ends_at).toISOString()
      : null;

    const currentPeriodEnd = sub.current_period_end
      ? new Date(sub.current_period_end).toISOString()
      : null;

    const now = Date.now();

    const trialMs = sub.trial_ends_at ? new Date(sub.trial_ends_at).getTime() : null;
    const inTrialWindow = trialMs ? trialMs > now : false;

    // Treat these as “valid” for access
    const isActiveish =
      status === "active" || status === "trialing" || status === "past_due";

    const onTrial = status === "trialing" || inTrialWindow;

    const periodEndMs = sub.current_period_end
      ? new Date(sub.current_period_end).getTime()
      : null;

    const stillInPaidPeriod =
      status === "canceled" && periodEndMs ? periodEndMs > now : false;

    const hasValid = isActiveish || onTrial || stillInPaidPeriod;

    const priceId = (sub.price_id as string | null) ?? null;
    const planName = planNameFromPriceId(priceId);
    const maxLocations = maxLocationsFromPriceId(priceId);

    const out: StatusJson = {
      ok: true,
      loggedIn: true,
      hasValid,
      active: isActiveish || stillInPaidPeriod,
      onTrial,
      status,

      priceId,
      planName,
      maxLocations,
      cancelAtPeriodEnd: (sub.cancel_at_period_end as boolean | null) ?? null,

      trialEndsAt,
      currentPeriodEnd,
      reason: "ok",
    };

    return NextResponse.json(out, { status: 200 });
  } catch (e: any) {
    const out: StatusJson = {
      ok: false,
      loggedIn: false,
      hasValid: false,
      active: false,
      onTrial: false,
      reason: e?.message ?? "unknown_error",
    };
    return NextResponse.json(out, { status: 200 });
  }
}

// src/app/api/billing/status/route.ts
import { NextResponse } from "next/server";
import { getServerSupabaseAction } from "@/lib/supabaseServer";

export async function GET() {
  try {
    const supabase = await getServerSupabaseAction();

    // Authenticated user (real check)
    const {
      data: { user },
      error: userErr,
    } = await supabase.auth.getUser();

    if (userErr || !user) {
      return NextResponse.json(
        {
          ok: true,
          loggedIn: false,
          hasValid: false,
          status: null,
          inTrial: false,
          trialEndsAt: null,
          currentPeriodEnd: null,
          reason: "not_authenticated",
        },
        { status: 200 }
      );
    }

    // Resolve org_id
    const { data: profile, error: profileErr } = await supabase
      .from("profiles")
      .select("org_id")
      .eq("id", user.id)
      .maybeSingle();

    const orgId = (profile?.org_id as string | null) ?? null;

    if (profileErr || !orgId) {
      return NextResponse.json(
        {
          ok: true,
          loggedIn: true,
          hasValid: false,
          status: null,
          inTrial: false,
          trialEndsAt: null,
          currentPeriodEnd: null,
          reason: "no_org",
        },
        { status: 200 }
      );
    }

    // ✅ Match billing page: latest row from billing_subscriptions
    const { data: subRows, error: subErr } = await supabase
      .from("billing_subscriptions")
      .select("status, trial_ends_at, current_period_end, created_at")
      .eq("org_id", orgId)
      .order("created_at", { ascending: false })
      .limit(1);

    if (subErr) {
      return NextResponse.json(
        {
          ok: true,
          loggedIn: true,
          hasValid: false,
          status: null,
          inTrial: false,
          trialEndsAt: null,
          currentPeriodEnd: null,
          reason: "subscription_lookup_error",
        },
        { status: 200 }
      );
    }

    const sub = subRows?.[0] ?? null;
    const status = (sub?.status as string | null)?.toLowerCase() ?? null;

    const trialEndsAt = (sub?.trial_ends_at as string | null) ?? null;
    const currentPeriodEnd = (sub?.current_period_end as string | null) ?? null;

    const now = Date.now();
    const trialMs = trialEndsAt ? new Date(trialEndsAt).getTime() : null;
    const inTrial = !!trialMs && trialMs > now;

    // treat these as valid for gating
    const hasValid =
      status === "active" ||
      status === "trialing" ||
      status === "past_due" ||
      inTrial;

    return NextResponse.json(
      {
        ok: true,
        loggedIn: true,
        hasValid,
        status,
        inTrial,
        trialEndsAt,
        currentPeriodEnd,
      },
      { status: 200 }
    );
  } catch (e: any) {
    return NextResponse.json(
      {
        ok: false,
        loggedIn: false,
        hasValid: false,
        status: null,
        inTrial: false,
        trialEndsAt: null,
        currentPeriodEnd: null,
        reason: e?.message ?? "unknown_error",
      },
      { status: 200 }
    );
  }
}

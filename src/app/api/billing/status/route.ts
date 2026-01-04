// src/app/api/billing/status/route.ts
import { NextResponse } from "next/server";
import { getServerSupabaseAction } from "@/lib/supabaseServer";

type StatusJson = {
  ok: boolean;
  loggedIn: boolean;
  hasValid: boolean;
  active: boolean;
  onTrial: boolean;
  status?: string | null;
  trialEndsAt?: string | null;
  currentPeriodEnd?: string | null;
  reason?: string;
};

export async function GET() {
  try {
    const supabase = await getServerSupabaseAction();

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

    // org_id from profiles
    const { data: profile, error: profileErr } = await supabase
      .from("profiles")
      .select("org_id")
      .eq("id", user.id)
      .single();

    if (profileErr || !profile?.org_id) {
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

    // ✅ Source of truth: billing_subscriptions (unique per org)
    const { data: sub, error: subErr } = await supabase
      .from("billing_subscriptions")
      .select("status, trial_ends_at, current_period_end, cancel_at_period_end")
      .eq("org_id", profile.org_id)
      .maybeSingle();

    if (subErr || !sub) {
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

    const trialEndsAt = sub.trial_ends_at ? new Date(sub.trial_ends_at).toISOString() : null;
    const currentPeriodEnd = sub.current_period_end
      ? new Date(sub.current_period_end).toISOString()
      : null;

    const now = Date.now();
    const trialMs = sub.trial_ends_at ? new Date(sub.trial_ends_at).getTime() : null;
    const inTrial = trialMs ? trialMs > now : false;

    // Active status values can vary. These are the ones that typically mean “valid”.
    const active =
      status === "active" ||
      status === "trialing"; // some systems store trialing explicitly

    const onTrial = status === "trialing" || inTrial;

    // If it’s “active” we treat it valid even if cancel_at_period_end is true (still valid until end)
    // If you store “canceled” but keep current_period_end in the future, treat as valid too:
    const periodEndMs = sub.current_period_end ? new Date(sub.current_period_end).getTime() : null;
    const stillInPaidPeriod = status === "canceled" && periodEndMs ? periodEndMs > now : false;

    const hasValid = active || onTrial || stillInPaidPeriod;

    const out: StatusJson = {
      ok: true,
      loggedIn: true,
      hasValid,
      active: active || stillInPaidPeriod,
      onTrial,
      status,
      trialEndsAt,
      currentPeriodEnd,
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

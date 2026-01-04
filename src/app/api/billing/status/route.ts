import { NextResponse } from "next/server";
import { getServerSupabaseAction } from "@/lib/supabaseServer"; // your correct helper naming

export async function GET() {
  try {
    const supabase = await getServerSupabaseAction();

    // IMPORTANT: use getUser() not getSession()
    const {
      data: { user },
      error: userErr,
    } = await supabase.auth.getUser();

    if (userErr || !user) {
      return NextResponse.json(
        { ok: false, hasValid: false, reason: "not_authenticated" },
        { status: 200 }
      );
    }

    // Resolve org from profiles
    const { data: profile, error: profileErr } = await supabase
      .from("profiles")
      .select("org_id")
      .eq("id", user.id)
      .single();

    if (profileErr || !profile?.org_id) {
      return NextResponse.json(
        { ok: false, hasValid: false, reason: "no_org" },
        { status: 200 }
      );
    }

    // You need SOME canonical subscription source.
    // If you already have a table storing org subscription state, read it here.
    // Common pattern: org_subscriptions(org_id, status, trial_ends_at, current_period_end)
    const { data: sub, error: subErr } = await supabase
      .from("org_subscriptions")
      .select("status, trial_ends_at, current_period_end")
      .eq("org_id", profile.org_id)
      .single();

    // If you don’t have this table, your current status endpoint is guessing.
    // But we still handle "no row" safely.
    if (subErr || !sub) {
      return NextResponse.json(
        { ok: true, hasValid: false, reason: "no_subscription_row" },
        { status: 200 }
      );
    }

    const status = String(sub.status ?? "").toLowerCase();
    const trialEnds = sub.trial_ends_at ? new Date(sub.trial_ends_at).getTime() : null;

    const now = Date.now();
    const inTrial = trialEnds ? trialEnds > now : false;

    // Treat active/trialing as valid. Add whatever statuses you use.
    const hasValid =
      status === "active" || status === "trialing" || inTrial;

    return NextResponse.json(
      {
        ok: true,
        hasValid,
        status,
        inTrial,
      },
      { status: 200 }
    );
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, hasValid: false, reason: e?.message ?? "unknown_error" },
      { status: 200 }
    );
  }
}

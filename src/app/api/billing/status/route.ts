// src/app/api/billing/status/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSupabaseAction } from "@/lib/supabaseServer";
import { getOrgSubscriptionStatus } from "@/lib/billing";

export async function GET(_req: NextRequest) {
  try {
    const supabase = await getServerSupabaseAction();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    // Not logged in
    if (authError || !user) {
      return NextResponse.json(
        {
          hasValid: false,
          status: null,
          reason: "not-authenticated",
        },
        { status: 200 }
      );
    }

    // Look up org_id for this user
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("org_id")
      .eq("id", user.id)
      .maybeSingle();

    if (profileError || !profile?.org_id) {
      console.error("[billing/status] no org_id for user", user.id, profileError);
      return NextResponse.json(
        {
          hasValid: false,
          status: null,
          reason: "no-org",
        },
        { status: 200 }
      );
    }

    const orgId = profile.org_id as string;

    const { hasValid, row } = await getOrgSubscriptionStatus(orgId);

    return NextResponse.json(
      {
        hasValid,
        status: row?.status ?? null,
        trialEndsAt: row?.trial_ends_at ?? null,
        cancelAtPeriodEnd: row?.cancel_at_period_end ?? null,
        currentPeriodEnd: row?.current_period_end ?? null,
      },
      { status: 200 }
    );
  } catch (err) {
    console.error("[billing/status] unexpected error", err);
    return NextResponse.json(
      {
        hasValid: false,
        status: null,
        reason: "error",
      },
      { status: 200 }
    );
  }
}

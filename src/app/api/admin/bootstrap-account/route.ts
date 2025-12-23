// src/app/api/signup/bootstrap/route.ts
import { NextRequest, NextResponse } from "next/server";
import { ensureOrgForCurrentUser } from "@/lib/ensureOrg";
import { getServerSupabase } from "@/lib/supabaseServer";

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json().catch(() => null)) as
      | { ownerName?: string; businessName?: string }
      | null;

    const ownerName = body?.ownerName ?? "";
    const businessName = body?.businessName ?? "";

    // 1) Create org / team / location etc
    const result = await ensureOrgForCurrentUser({
      ownerName,
      businessName,
    });

    if (!result.ok) {
      return NextResponse.json(result, { status: 500 });
    }

    // 2) Ensure a trial subscription row exists for this org
    try {
      const supabase = await getServerSupabase();

      const {
        data: { user },
      } = await supabase.auth.getUser();

      // Adjust this if your ensureOrgForCurrentUser returns a different key
      const orgId: string | undefined =
        (result as any).orgId ?? (result as any).org_id;

      if (user && orgId) {
        // Check if there is already a subscription row for this org
        const { data: existing, error: existingErr } = await supabase
          .from("billing_subscriptions")
          .select("id")
          .eq("org_id", orgId)
          .maybeSingle();

        if (!existingErr && !existing) {
          const trialDays = 14;
          const trialEndsAt = new Date();
          trialEndsAt.setDate(trialEndsAt.getDate() + trialDays);

          await supabase.from("billing_subscriptions").insert({
            org_id: orgId,
            user_id: user.id,
            status: "trialing",
            trial_ends_at: trialEndsAt.toISOString(),
            current_period_end: trialEndsAt.toISOString(),
            cancel_at_period_end: false,
          });
        }
      }
    } catch (e) {
      // Don’t brick signup if billing insert falls over
      console.error("[signup/bootstrap] failed to create trial subscription", e);
    }

    // 3) Return the original bootstrap result to the client
    return NextResponse.json(result);
  } catch (err) {
    console.error("[signup/bootstrap] unexpected error", err);
    return NextResponse.json(
      { ok: false as const, reason: "exception" },
      { status: 500 }
    );
  }
}

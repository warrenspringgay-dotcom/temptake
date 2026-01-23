// src/app/api/billing/ensure-trial/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSupabaseAction } from "@/lib/supabaseServer";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

function addDaysUTC(d: Date, days: number) {
  const x = new Date(d);
  x.setUTCDate(x.getUTCDate() + days);
  return x;
}

/**
 * Ensures a billing_subscriptions row exists for the user's active org.
 * Creates an APP-TRIAL row only (no Stripe subscription).
 *
 * Returns:
 * - 401 if not authenticated
 * - { ok:false, reason:"no_org" } if org can't be resolved
 * - { ok:true, created:false } if already exists
 * - { ok:true, created:true } if created
 */
export async function POST(req: NextRequest) {
  try {
    const supabase = await getServerSupabaseAction();

    const {
      data: { user },
      error: userErr,
    } = await supabase.auth.getUser();

    if (userErr || !user) {
      return NextResponse.json({ ok: false, reason: "not_authed" }, { status: 401 });
    }

    // Resolve org_id via service role (so RLS can’t break billing)
    const { data: prof, error: profErr } = await supabaseAdmin
      .from("profiles")
      .select("org_id")
      .eq("id", user.id)
      .maybeSingle();

    if (profErr) {
      console.error("[ensure-trial] profiles lookup error", profErr);
      return NextResponse.json({ ok: false, reason: "profile_lookup_failed" }, { status: 500 });
    }

    const orgId = prof?.org_id ? String(prof.org_id) : null;
    if (!orgId) {
      return NextResponse.json({ ok: false, reason: "no_org" }, { status: 200 });
    }

    // If subscription exists, we're done
    const { data: existing, error: exErr } = await supabaseAdmin
      .from("billing_subscriptions")
      .select("id,status,stripe_subscription_id")
      .eq("org_id", orgId)
      .order("created_at", { ascending: false })
      .limit(1);

    if (exErr) {
      console.error("[ensure-trial] existing lookup error", exErr);
      return NextResponse.json({ ok: false, reason: "lookup_failed" }, { status: 500 });
    }

    if (existing && existing.length > 0) {
      return NextResponse.json(
        { ok: true, created: false, orgId, subscription: existing[0] },
        { status: 200 }
      );
    }

    // Create a trial row (APP TRIAL)
    const now = new Date();
    const trialEnds = addDaysUTC(now, 14).toISOString();

    const insertPayload = {
      org_id: orgId,
      user_id: user.id,
      status: "trialing",
      trial_ends_at: trialEnds,
      cancel_at_period_end: false,
      // IMPORTANT: no stripe_subscription_id here (this is app-only trial)
      trial_reminder_sent_at: null,
    };

    const { error: insErr } = await supabaseAdmin
      .from("billing_subscriptions")
      .insert(insertPayload);

    if (insErr) {
      console.error("[ensure-trial] insert_failed", insErr);
      return NextResponse.json(
        { ok: false, reason: "insert_failed", message: insErr.message },
        { status: 200 }
      );
    }

    return NextResponse.json({ ok: true, created: true, orgId }, { status: 200 });
  } catch (e: any) {
    console.error("[ensure-trial] exception", e?.message ?? e);
    return NextResponse.json(
      { ok: false, reason: "exception", detail: e?.message ?? String(e) },
      { status: 500 }
    );
  }
}

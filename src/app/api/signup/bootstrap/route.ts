// src/app/api/signup/bootstrap/route.ts
import { NextRequest, NextResponse } from "next/server";
import { ensureOrgForCurrentUser } from "@/lib/ensureOrg";
import { getServerSupabase } from "@/lib/supabaseServer";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { sendEmail } from "@/lib/email";

function addDays(date: Date, days: number) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json().catch(() => null)) as
      | { ownerName?: string; businessName?: string }
      | null;

    const ownerName = body?.ownerName ?? "";
    const businessName = body?.businessName ?? "";

    // 1) Create org/team/location etc
    const result = await ensureOrgForCurrentUser({ ownerName, businessName });
    if (!result.ok) {
      return NextResponse.json(result, { status: 500 });
    }

    // Must have a logged-in user (cookie session) for userId
    const supabase = await getServerSupabase();
    const {
      data: { user },
      error: userErr,
    } = await supabase.auth.getUser();

    if (userErr || !user) {
      return NextResponse.json(
        { ok: false as const, reason: "no-auth-session-for-billing" },
        { status: 401 }
      );
    }

    const orgId: string | undefined =
      (result as any).orgId ?? (result as any).org_id;

    if (!orgId) {
      return NextResponse.json(
        { ok: false as const, reason: "missing-org-id" },
        { status: 500 }
      );
    }

    // 2) Ensure trial subscription row exists for this org
    const { data: existingSub, error: existingErr } = await supabaseAdmin
      .from("billing_subscriptions")
      .select("id,status,trial_ends_at,current_period_end")
      .eq("org_id", orgId)
      .maybeSingle();

    if (existingErr) {
      return NextResponse.json(
        {
          ok: false as const,
          reason: "billing-subscriptions-lookup-failed",
          detail: existingErr.message,
        },
        { status: 500 }
      );
    }

    if (!existingSub) {
      const trialEndsAt = addDays(new Date(), 14);

      const { error: insertErr } = await supabaseAdmin
        .from("billing_subscriptions")
        .insert({
          org_id: orgId,
          user_id: user.id,
          status: "trialing",
          trial_ends_at: trialEndsAt.toISOString(),
          current_period_end: trialEndsAt.toISOString(),
          cancel_at_period_end: false,
        });

      if (insertErr) {
        return NextResponse.json(
          {
            ok: false as const,
            reason: "billing-subscriptions-insert-failed",
            detail: insertErr.message,
          },
          { status: 500 }
        );
      }
    }

    // 3) Send welcome email (do not block signup if email fails)
    try {
      const to = user.email?.trim();
      if (to) {
        await sendEmail({
          to,
          subject: "Welcome to TempTake",
          html: `
            <div style="font-family:system-ui,-apple-system,Segoe UI,Roboto,Arial,sans-serif;line-height:1.5">
              <h2 style="margin:0 0 12px">Welcome to TempTake</h2>
              <p style="margin:0 0 12px">
                Your account is set up and your 14-day trial is active.
              </p>
              <p style="margin:0 0 12px">
                Next step: add your first location and run today’s checks.
              </p>
              <p style="margin:0">
                Need help? Reply to this email.
              </p>
            </div>
          `,
        });
      }
    } catch (emailErr) {
      console.error("[signup/bootstrap] welcome email failed", emailErr);
      // Intentionally NOT failing signup for email issues.
    }

    // NOTE: We are NOT inserting billing_customers here because
    // stripe_customer_id is NOT NULL in your schema.
    // Create billing_customers ONLY when you have a real Stripe customer id.

    return NextResponse.json({ ...result, billingOk: true });
  } catch (err: any) {
    console.error("[signup/bootstrap] unexpected error", err);
    return NextResponse.json(
      {
        ok: false as const,
        reason: "exception",
        detail: err?.message ?? String(err),
      },
      { status: 500 }
    );
  }
}

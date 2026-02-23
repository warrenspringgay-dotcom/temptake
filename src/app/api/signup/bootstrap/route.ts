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
type UserVia = "cookie" | "bearer" | null;

async function getUserFromRequest(
  req: NextRequest
): Promise<{ user: any | null; via: UserVia }> {
  const supabase = await getServerSupabase();

  // 1) Cookie session
  const { data: cookieAuth, error: cookieErr } = await supabase.auth.getUser();
  if (!cookieErr && cookieAuth?.user) {
    return { user: cookieAuth.user, via: "cookie" };
  }

  // 2) Bearer token fallback
  const auth = req.headers.get("authorization") || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7).trim() : null;

  if (token) {
    const { data: tokenAuth, error: tokenErr } = await supabase.auth.getUser(token);
    if (!tokenErr && tokenAuth?.user) {
      return { user: tokenAuth.user, via: "bearer" };
    }
  }

  return { user: null, via: null };
}

export async function POST(req: NextRequest) {
  try {
    // ✅ DO NOT create orgs/billing rows unless we know who the user is.
    const { user } = await getUserFromRequest(req);

    if (!user) {
      return NextResponse.json(
        { ok: false as const, reason: "no-auth-session-for-billing" },
        { status: 401 }
      );
    }

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

    const orgId: string | undefined = (result as any).orgId ?? (result as any).org_id;

    if (!orgId) {
      return NextResponse.json(
        { ok: false as const, reason: "missing-org-id" },
        { status: 500 }
      );
    }

    // 2) Ensure trial subscription row exists for this org (idempotent)
    //    NOTE: Requires a UNIQUE constraint on billing_subscriptions.org_id to be perfect.
    //    If you don't have one, add it. Otherwise, race conditions can double insert.
    const trialEndsAt = addDays(new Date(), 14).toISOString();

    const { error: upsertErr } = await supabaseAdmin
      .from("billing_subscriptions")
      .upsert(
        {
          org_id: orgId,
          user_id: user.id,
          status: "trialing",
          trial_ends_at: trialEndsAt,
          current_period_end: trialEndsAt,
          cancel_at_period_end: false,
        },
        { onConflict: "org_id" }
      );

    if (upsertErr) {
      return NextResponse.json(
        {
          ok: false as const,
          reason: "billing-subscriptions-upsert-failed",
          detail: upsertErr.message,
        },
        { status: 500 }
      );
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
    }

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
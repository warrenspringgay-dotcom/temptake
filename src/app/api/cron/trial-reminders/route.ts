// src/app/api/cron/trial-reminders/route.ts
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { sendEmail } from "@/lib/email";

function assertCronAuth(req: NextRequest) {
  const expected = process.env.CRON_SECRET;
  if (!expected) throw new Error("CRON_SECRET is not set");

  const auth = req.headers.get("authorization") || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
  if (token !== expected) {
    return false;
  }
  return true;
}

function addDays(d: Date, days: number) {
  const x = new Date(d);
  x.setUTCDate(x.getUTCDate() + days);
  return x;
}

function fmtDDMMYYYY(d: Date) {
  const dd = String(d.getUTCDate()).padStart(2, "0");
  const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
  const yyyy = d.getUTCFullYear();
  return `${dd}/${mm}/${yyyy}`;
}

function getOrigin(req: NextRequest) {
  const env =
    process.env.NEXT_PUBLIC_SITE_URL ||
    (process.env.NEXT_PUBLIC_VERCEL_URL
      ? `https://${process.env.NEXT_PUBLIC_VERCEL_URL}`
      : "");
  return (env || req.nextUrl.origin).replace(/\/$/, "");
}

export async function GET(req: NextRequest) {
  try {
    if (!assertCronAuth(req)) {
      return NextResponse.json({ ok: false, reason: "unauthorized" }, { status: 401 });
    }

    const now = new Date();

    // We’ll send "ending soon" when trial ends in ~2 days (48-72h window).
    const windowStart = addDays(now, 2);
    const windowEnd = addDays(now, 3);

    const { data: subs, error } = await supabaseAdmin
      .from("billing_subscriptions")
      .select("id, org_id, user_id, trial_ends_at, status")
      .eq("status", "trialing")
      .gte("trial_ends_at", windowStart.toISOString())
      .lt("trial_ends_at", windowEnd.toISOString())
      .is("trial_reminder_sent_at", null);

    if (error) {
      return NextResponse.json(
        { ok: false, reason: "query-failed", detail: error.message },
        { status: 500 }
      );
    }

    const origin = getOrigin(req);

    let sent = 0;
    let skipped = 0;
    const failures: Array<{ id: string; reason: string }> = [];

    for (const s of subs ?? []) {
      try {
        if (!s.user_id || !s.trial_ends_at) {
          skipped++;
          continue;
        }

        // Pull email from auth user
        const { data: userData, error: userErr } = await supabaseAdmin.auth.admin.getUserById(
          s.user_id
        );

        const email = userData?.user?.email?.trim();
        if (userErr || !email) {
          skipped++;
          continue;
        }

        const trialEnds = new Date(s.trial_ends_at);
        const trialEndsFmt = fmtDDMMYYYY(trialEnds);

        // Keep it simple: point them to billing/pricing
        const ctaUrl = `${origin}/pricing`;

        await sendEmail({
          to: email,
          subject: "Your TempTake trial ends soon",
          html: `
            <div style="font-family:system-ui,-apple-system,Segoe UI,Roboto,Arial,sans-serif;line-height:1.5;color:#111">
              <h2 style="margin:0 0 12px">Your trial ends soon</h2>
              <p style="margin:0 0 12px">
                Your TempTake trial is due to end on <strong>${trialEndsFmt}</strong>.
              </p>
              <p style="margin:0 0 16px">
                To avoid interruption, pick a plan before then.
              </p>
              <p style="margin:0 0 18px">
                <a href="${ctaUrl}" style="display:inline-block;background:#111;color:#fff;text-decoration:none;padding:10px 14px;border-radius:10px">
                  Choose a plan
                </a>
              </p>
              <p style="margin:0;color:#555;font-size:12px">
                Need help? Reply to this email.
              </p>
            </div>
          `,
        });

        // Mark as sent (idempotency)
        const { error: updErr } = await supabaseAdmin
          .from("billing_subscriptions")
          .update({ trial_reminder_sent_at: new Date().toISOString() })
          .eq("id", s.id);

        if (updErr) {
          failures.push({ id: s.id, reason: `sent-but-update-failed: ${updErr.message}` });
        } else {
          sent++;
        }
      } catch (e: any) {
        failures.push({ id: String(s.id), reason: e?.message ?? "unknown" });
      }
    }

    return NextResponse.json({
      ok: true,
      window: {
        start: windowStart.toISOString(),
        end: windowEnd.toISOString(),
      },
      totals: {
        candidates: subs?.length ?? 0,
        sent,
        skipped,
        failures: failures.length,
      },
      failures,
    });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, reason: "exception", detail: e?.message ?? String(e) },
      { status: 500 }
    );
  }
}

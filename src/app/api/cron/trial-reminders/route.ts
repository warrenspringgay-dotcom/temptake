// src/app/api/cron/trial-reminders/route.ts
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { sendEmail } from "@/lib/email";

function assertCronAuth(req: NextRequest) {
  const expected = process.env.CRON_SECRET;
  if (!expected) throw new Error("CRON_SECRET is not set");

  const auth = req.headers.get("authorization") || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
  return token === expected;
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

/**
 * Prefer the app origin for deep links inside emails.
 * Set NEXT_PUBLIC_APP_URL in env (e.g. https://app.temptake.com).
 * Fallbacks are kept for safety.
 */
function appOriginFromEnv(req: NextRequest) {
  const app = process.env.NEXT_PUBLIC_APP_URL;
  if (app) return app.replace(/\/$/, "");

  const site = process.env.NEXT_PUBLIC_SITE_URL;
  if (site) return site.replace(/\/$/, "");

  const vercel = process.env.NEXT_PUBLIC_VERCEL_URL;
  if (vercel) {
    const base = vercel.startsWith("http") ? vercel : `https://${vercel}`;
    return base.replace(/\/$/, "");
  }

  return req.nextUrl.origin.replace(/\/$/, "");
}

type SubRow = {
  id: string;
  org_id: string;
  user_id: string | null;
  trial_ends_at: string | null;
  status: string;
  trial_reminders: any | null; // jsonb
};

export async function GET(req: NextRequest) {
  try {
    if (!assertCronAuth(req)) {
      return NextResponse.json({ ok: false, reason: "unauthorized" }, { status: 401 });
    }

    const now = new Date();

    // Send "ending soon" when trial ends in ~2 days (48–72h window).
    const windowStart = addDays(now, 2);
    const windowEnd = addDays(now, 3);

    const { data, error } = await supabaseAdmin
      .from("billing_subscriptions")
      .select("id, org_id, user_id, trial_ends_at, status, trial_reminders")
      .eq("status", "trialing")
      .gte("trial_ends_at", windowStart.toISOString())
      .lt("trial_ends_at", windowEnd.toISOString())
      .limit(500);

    if (error) {
      return NextResponse.json(
        { ok: false, reason: "query-failed", detail: error.message },
        { status: 500 }
      );
    }

    const subs = (data ?? []) as SubRow[];

    // Only those we haven't already emailed for the "soon" reminder
    const candidates = subs.filter((s) => {
      const r = s.trial_reminders || {};
      return !r.soon;
    });

    const origin = appOriginFromEnv(req);
    const ctaUrl = `${origin}/settings/billing`;

    let sent = 0;
    let skipped = 0;
    const failures: Array<{ id: string; reason: string }> = [];

    for (const s of candidates) {
      try {
        if (!s.user_id || !s.trial_ends_at) {
          skipped++;
          continue;
        }

        // Pull email from auth user
        const { data: userData, error: userErr } =
          await supabaseAdmin.auth.admin.getUserById(s.user_id);

        const email = userData?.user?.email?.trim();
        if (userErr || !email) {
          skipped++;
          continue;
        }

        const trialEnds = new Date(s.trial_ends_at);
        const trialEndsFmt = fmtDDMMYYYY(trialEnds);

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
                To avoid interruption, add your payment details now.
              </p>
              <p style="margin:0 0 18px">
                <a href="${ctaUrl}" style="display:inline-block;background:#111;color:#fff;text-decoration:none;padding:10px 14px;border-radius:10px">
                  Add payment details
                </a>
              </p>
              <p style="margin:0;color:#555;font-size:12px">
                Need help? Reply to this email.
              </p>
            </div>
          `,
        });

        // ✅ Mark as sent using jsonb
        const reminders = s.trial_reminders || {};
        reminders.soon = new Date().toISOString();

        const { error: updErr } = await supabaseAdmin
          .from("billing_subscriptions")
          .update({ trial_reminders: reminders })
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
        candidates: candidates.length,
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

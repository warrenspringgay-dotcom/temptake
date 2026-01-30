// src/app/api/cron/trial-expiring-tomorrow/route.ts
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { sendEmail } from "@/lib/email";

function getBearerToken(req: NextRequest) {
  const auth = req.headers.get("authorization") || "";
  const m = auth.match(/^Bearer\s+(.+)$/i);
  return m?.[1] ?? null;
}

/**
 * Prefer the app origin for deep links inside emails.
 * Set NEXT_PUBLIC_APP_URL in env (e.g. https://app.temptake.com).
 * Fallbacks are kept for safety.
 */
function appOriginFromEnv() {
  const app = process.env.NEXT_PUBLIC_APP_URL;
  if (app) return app.replace(/\/$/, "");

  const site = process.env.NEXT_PUBLIC_SITE_URL;
  if (site) return site.replace(/\/$/, "");

  const vercel = process.env.NEXT_PUBLIC_VERCEL_URL;
  if (vercel) {
    const base = vercel.startsWith("http") ? vercel : `https://${vercel}`;
    return base.replace(/\/$/, "");
  }

  // Last resort: do NOT send users to marketing for billing actions.
  // If you don’t have an app domain, change this to your actual app URL.
  return "https://app.temptake.com";
}

type SubRow = {
  id: string;
  org_id: string;
  user_id: string | null;
  status: string;
  trial_ends_at: string | null;
  trial_reminders: any | null; // jsonb
};

export async function GET(req: NextRequest) {
  try {
    // ✅ Auth gate (Vercel cron + manual curl)
    const expected = process.env.CRON_SECRET;
    if (!expected) {
      return NextResponse.json(
        { ok: false, reason: "missing-cron-secret-env" },
        { status: 500 }
      );
    }

    const token = getBearerToken(req);
    if (token !== expected) {
      return NextResponse.json({ ok: false, reason: "unauthorized" }, { status: 401 });
    }

    const now = new Date();
    const in24h = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    // Pull “trialing” subs with a trial end in the next 24h.
    // We filter the jsonb “already sent” in JS to keep it simple/portable.
    const { data, error } = await supabaseAdmin
      .from("billing_subscriptions")
      .select("id,org_id,user_id,status,trial_ends_at,trial_reminders")
      .eq("status", "trialing")
      .not("trial_ends_at", "is", null)
      .lte("trial_ends_at", in24h.toISOString())
      .gt("trial_ends_at", now.toISOString())
      .limit(500);

    if (error) {
      return NextResponse.json(
        { ok: false, reason: "query-failed", detail: error.message },
        { status: 500 }
      );
    }

    const rows = (data ?? []) as SubRow[];

    // Filter out anyone we already emailed for the “24h” reminder.
    const candidates = rows.filter((r) => {
      const reminders = r.trial_reminders || {};
      return !reminders?.t24; // not sent yet
    });

    const appOrigin = appOriginFromEnv();
    const billingUrl = `${appOrigin}/settings/billing`;

    let sent = 0;
    let skipped = 0;
    const failures: Array<{ id: string; error: string }> = [];

    for (const sub of candidates) {
      try {
        if (!sub.user_id) {
          skipped++;
          continue;
        }

        // Pull email from auth (most reliable)
        const { data: userData, error: userErr } =
          await supabaseAdmin.auth.admin.getUserById(sub.user_id);

        const to = userData?.user?.email?.trim();
        if (userErr || !to) {
          skipped++;
          continue;
        }

        const trialEnd = sub.trial_ends_at ? new Date(sub.trial_ends_at) : null;

        // Keep wording simple, UK-friendly, no cringe.
        await sendEmail({
          to,
          subject: "Your TempTake trial ends tomorrow",
          html: `
            <div style="font-family:system-ui,-apple-system,Segoe UI,Roboto,Arial,sans-serif;line-height:1.5">
              <h2 style="margin:0 0 12px">Your TempTake trial ends tomorrow</h2>
              <p style="margin:0 0 12px">
                Your trial is due to end ${
                  trialEnd
                    ? `on <b>${trialEnd.toLocaleString("en-GB", {
                        day: "2-digit",
                        month: "2-digit",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}</b>.`
                    : "tomorrow."
                }
              </p>
              <p style="margin:0 0 12px">
                To avoid interruption, add your payment details now.
              </p>
              <p style="margin:16px 0">
                <a href="${billingUrl}"
                   style="display:inline-block;background:#111827;color:#fff;text-decoration:none;padding:10px 14px;border-radius:12px;font-weight:600">
                  Add payment details
                </a>
              </p>
              <p style="margin:0;color:#6b7280;font-size:12px">
                If you have any issues, reply to this email.
              </p>
            </div>
          `,
        });

        // Mark as sent (jsonb)
        const reminders = sub.trial_reminders || {};
        reminders.t24 = new Date().toISOString();

        const { error: updErr } = await supabaseAdmin
          .from("billing_subscriptions")
          .update({ trial_reminders: reminders })
          .eq("id", sub.id);

        if (updErr) {
          failures.push({ id: sub.id, error: `sent-but-update-failed: ${updErr.message}` });
        } else {
          sent++;
        }
      } catch (e: any) {
        failures.push({ id: sub.id, error: e?.message ?? String(e) });
      }
    }

    return NextResponse.json({
      ok: true,
      window: { start: now.toISOString(), end: in24h.toISOString() },
      totals: { candidates: candidates.length, sent, skipped, failures: failures.length },
      failures,
    });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, reason: "exception", detail: e?.message ?? String(e) },
      { status: 500 }
    );
  }
}

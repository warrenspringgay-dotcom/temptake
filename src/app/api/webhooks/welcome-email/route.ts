// src/app/api/webhooks/welcome-email/route.ts
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { sendEmail } from "@/lib/email";
import { getOriginFromEnv, wrapHtml, ctaButton } from "@/lib/emailTemplates";

type SupabaseDbWebhookPayload = {
  type: "INSERT" | "UPDATE" | "DELETE";
  table: string;
  schema: string;
  record: Record<string, any> | null;
  old_record: Record<string, any> | null;
};

function json(status: number, body: any) {
  return NextResponse.json(body, { status });
}

function getHeader(req: NextRequest, name: string) {
  return req.headers.get(name) ?? req.headers.get(name.toLowerCase());
}

export async function POST(req: NextRequest) {
  try {
    // 1) Verify secret
    const expected = process.env.TT_DB_WEBHOOK_SECRET;
    const received = getHeader(req, "x-tt-webhook-secret");

    if (!expected || !received || received !== expected) {
      return json(401, { ok: false, reason: "unauthorized" });
    }

    // 2) Parse payload
    const payload = (await req.json()) as SupabaseDbWebhookPayload;

    if (payload.type !== "INSERT") return json(200, { ok: true, ignored: "not_insert" });
    if (payload.table !== "billing_subscriptions") return json(200, { ok: true, ignored: "wrong_table" });
    if (!payload.record) return json(200, { ok: true, ignored: "no_record" });

    const sub = payload.record as {
      id: string;
      org_id: string;
      user_id?: string | null;
      status?: string | null;
      welcome_email_sent_at?: string | null;
    };

    if (!sub.id || !sub.org_id) return json(200, { ok: true, ignored: "missing_ids" });

    // Optional: only trialing
    if (sub.status && sub.status !== "trialing") {
      return json(200, { ok: true, ignored: "not_trialing" });
    }

    // 3) Idempotency lock WITHOUT marking as sent:
    // Claim the right to send by setting a "lock" timestamp if sent_at is null
    // We'll use welcome_email_sent_at as a lock but revert if send fails.
    // Better long-term: add welcome_email_lock_at + welcome_email_sent_at.
    const lockStamp = new Date().toISOString();

    const { data: locked, error: lockError } = await supabaseAdmin
      .from("billing_subscriptions")
      .update({ welcome_email_sent_at: lockStamp }) // temporary lock
      .eq("id", sub.id)
      .is("welcome_email_sent_at", null)
      .select("id, org_id, user_id")
      .maybeSingle();

    if (lockError) {
      console.error("welcome-email: lock failed", lockError);
      return json(500, { ok: false, reason: "db_lock_failed" });
    }

    if (!locked) return json(200, { ok: true, ignored: "already_sent_or_locked" });

    // 4) Resolve recipient email
    let toEmail: string | null = null;

    if (locked.user_id) {
      const { data: userRes, error: userErr } =
        await supabaseAdmin.auth.admin.getUserById(locked.user_id);

      if (userErr) console.error("welcome-email: getUser error", userErr);
      toEmail = userRes?.user?.email ?? null;
    }

    if (!toEmail) {
      const { data: org } = await supabaseAdmin
        .from("organisations")
        .select("owner_email")
        .eq("id", locked.org_id)
        .maybeSingle();

      if (org?.owner_email) toEmail = org.owner_email;
    }

    if (!toEmail) {
      console.warn("welcome-email: no recipient found", { org_id: locked.org_id });

      // Release lock so it can be retried later if email gets populated
      await supabaseAdmin
        .from("billing_subscriptions")
        .update({ welcome_email_sent_at: null })
        .eq("id", locked.id)
        .eq("welcome_email_sent_at", lockStamp);

      return json(200, { ok: true, ignored: "no_email" });
    }

    // 5) Build branded email
    const fallbackOrigin = process.env.NEXT_PUBLIC_SITE_URL || "https://temptake.com";
    const origin = getOriginFromEnv(fallbackOrigin);

    const logoUrl = `${origin}/logo.png`;
    const dashboardUrl = `${origin}/dashboard`;

    const body = `
      <div style="max-width:640px;margin:0 auto;">
        <div style="padding:18px 20px;border:1px solid #e5e7eb;border-radius:16px;background:#fff;text-align:center;">
          <img src="${logoUrl}" alt="TempTake" width="160"
            style="display:block;margin:0 auto 12px auto;height:auto;border:0;outline:none;text-decoration:none;" />
          <div style="font-size:12px;color:#64748b;">
            Digital food safety &amp; compliance built for real kitchens
          </div>
        </div>

        <p style="margin:16px 0 0;font-size:14px;line-height:1.7;color:#334155;">
          Your account is active and your free trial has started. TempTake replaces paper-based SFBB folders
          with a structured, audit-ready digital compliance system.
        </p>

        <div style="margin:18px 0;padding:16px;border:1px solid #e5e7eb;border-radius:16px;background:#f8fafc;">
          <div style="font-weight:700;margin:0 0 10px;color:#0f172a;">
            Get inspection-ready in minutes
          </div>
          <ol style="margin:0;padding-left:18px;font-size:14px;line-height:1.7;color:#334155;">
            <li>Add your first location</li>
            <li>Set up cleaning tasks and routines</li>
            <li>Start recording temperature logs</li>
          </ol>
        </div>

        <div style="text-align:center;margin:18px 0 6px;">
          ${ctaButton(dashboardUrl, "Open your dashboard")}
          <div style="font-size:12px;color:#64748b;">
            Tip: save the dashboard link to your phone home screen for faster logging.
          </div>
        </div>

        <div style="margin-top:16px;padding:14px 16px;border:1px solid #e5e7eb;border-radius:16px;background:#fff;">
          <div style="font-weight:700;margin-bottom:6px;color:#0f172a;">Need help setting up?</div>
          <div style="font-size:13px;line-height:1.7;color:#334155;">
            Reply to this email or contact us at
            <a href="mailto:info@temptake.com" style="color:#0f172a;font-weight:600;text-decoration:none;">info@temptake.com</a>.
          </div>
        </div>
      </div>
    `;

    const subject = "Welcome to TempTake | Your trial is live";
    const html = wrapHtml("Welcome to TempTake", body);

    // 6) Send (if this throws, we release the lock)
    try {
      await sendEmail({ to: toEmail, subject, html });
    } catch (e) {
      console.error("welcome-email: send failed", e);

      // Release lock so a retry can happen
      await supabaseAdmin
        .from("billing_subscriptions")
        .update({ welcome_email_sent_at: null })
        .eq("id", locked.id)
        .eq("welcome_email_sent_at", lockStamp);

      return json(500, { ok: false, reason: "send_failed" });
    }

    // If you want *real* sent_at, add a new column.
    // For now this stays as "sent" timestamp (it already is lockStamp).
    return json(200, { ok: true, sent: true, to: toEmail, org_id: locked.org_id, sub_id: locked.id });
  } catch (err) {
    console.error("welcome-email fatal", err);
    return json(500, { ok: false, reason: "fatal" });
  }
}

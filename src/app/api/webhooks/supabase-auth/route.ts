import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const runtime = "nodejs";

function requireEnv(name: string) {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env: ${name}`);
  return v;
}

function verifySupabaseSignature(req: NextRequest, rawBody: string) {
  // Supabase webhooks sign with HMAC SHA256. Header is typically:
  // "x-supabase-signature: sha256=<hex>"
  // If yours differs, check your Supabase webhook settings panel.
  const secret = requireEnv("SUPABASE_WEBHOOK_SECRET");

  const sig = req.headers.get("x-supabase-signature") || "";
  const match = sig.match(/sha256=([a-f0-9]+)/i);
  const provided = match?.[1];
  if (!provided) return false;

  // Node crypto
  const crypto = require("crypto") as typeof import("crypto");
  const computed = crypto
    .createHmac("sha256", secret)
    .update(rawBody)
    .digest("hex");

  // timing-safe compare
  const a = Buffer.from(provided, "hex");
  const b = Buffer.from(computed, "hex");
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

function escapeHtml(s: string) {
  return s
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function initialsFromNameOrEmail(name?: string | null, email?: string | null) {
  const n = (name || "").trim();
  if (n) {
    const parts = n.split(/\s+/).filter(Boolean);
    const ini = (parts[0]?.[0] || "") + (parts[1]?.[0] || "");
    return ini.toUpperCase() || null;
  }
  const e = (email || "").trim();
  if (!e) return null;
  const left = e.split("@")[0] || "";
  const ini = (left[0] || "") + (left[1] || "");
  return ini.toUpperCase() || null;
}

function welcomeHtml(opts: {
  siteUrl: string;
  logoUrl: string;
  firstName: string;
  dashboardUrl: string;
  helpUrl: string;
}) {
  const { siteUrl, logoUrl, firstName, dashboardUrl, helpUrl } = opts;

  return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width,initial-scale=1" />
    <title>Welcome to TempTake</title>
  </head>
  <body style="margin:0;padding:0;background:#0b1220;font-family:ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#0b1220;padding:24px 12px;">
      <tr>
        <td align="center">
          <table role="presentation" width="600" cellspacing="0" cellpadding="0" style="width:100%;max-width:600px;background:#0f172a;border:1px solid rgba(255,255,255,0.08);border-radius:20px;overflow:hidden;">
            <tr>
              <td style="padding:18px 20px;background:linear-gradient(90deg,#10b981,#a3e635,#10b981);">
                <img src="${logoUrl}" width="44" height="44" alt="TempTake" style="display:block;border-radius:10px;background:#fff;" />
              </td>
            </tr>
            <tr>
              <td style="padding:22px 20px;color:#e5e7eb;">
                <div style="font-size:12px;letter-spacing:0.18em;text-transform:uppercase;color:rgba(229,231,235,0.75);font-weight:700;">
                  Welcome
                </div>
                <h1 style="margin:10px 0 0 0;font-size:24px;line-height:1.2;color:#ffffff;">
                  Hi ${escapeHtml(firstName)} 👋
                </h1>
                <p style="margin:12px 0 0 0;font-size:14px;line-height:1.6;color:rgba(229,231,235,0.9);">
                  You’re in. TempTake is built to replace paper logs with fast, inspection-ready records for
                  temperatures, cleaning and allergens.
                </p>

                <div style="margin:18px 0 0 0;padding:14px;border-radius:16px;background:rgba(16,185,129,0.10);border:1px solid rgba(16,185,129,0.25);">
                  <div style="font-size:13px;font-weight:700;color:#d1fae5;margin-bottom:6px;">Your quickest “first shift” setup:</div>
                  <ol style="margin:0;padding-left:18px;font-size:13px;line-height:1.6;color:rgba(229,231,235,0.92);">
                    <li>Pick your site/location</li>
                    <li>Add a temperature routine (fridges, freezers, hot hold)</li>
                    <li>Set up your cleaning rota tasks</li>
                    <li>Check your allergen matrix review date</li>
                  </ol>
                </div>

                <p style="margin:18px 0 0 0;">
                  <a href="${dashboardUrl}" style="display:inline-block;padding:12px 16px;border-radius:14px;background:#a3e635;color:#0b1220;text-decoration:none;font-weight:800;font-size:13px;">
                    Open your dashboard
                  </a>
                  <span style="display:inline-block;width:10px;"></span>
                  <a href="${helpUrl}" style="display:inline-block;padding:12px 16px;border-radius:14px;background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.14);color:#e5e7eb;text-decoration:none;font-weight:700;font-size:13px;">
                    Help & support
                  </a>
                </p>

                <p style="margin:16px 0 0 0;font-size:12px;line-height:1.6;color:rgba(229,231,235,0.7);">
                  Reply to this email if you get stuck. We read them. (Yes, really.)
                </p>
              </td>
            </tr>
            <tr>
              <td style="padding:14px 20px;border-top:1px solid rgba(255,255,255,0.08);font-size:11px;color:rgba(229,231,235,0.55);">
                © ${new Date().getFullYear()} TempTake · <a href="${siteUrl}/privacy" style="color:rgba(229,231,235,0.75);text-decoration:none;">Privacy</a> · <a href="${siteUrl}/terms" style="color:rgba(229,231,235,0.75);text-decoration:none;">Terms</a> · <a href="${siteUrl}/cookies" style="color:rgba(229,231,235,0.75);text-decoration:none;">Cookies</a>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

export async function POST(req: NextRequest) {
  const resendKey = requireEnv("RESEND_API_KEY");
  const from = requireEnv("EMAIL_FROM");
  const siteUrl = requireEnv("PUBLIC_SITE_URL");

  const rawBody = await req.text();

  // Verify signature (fail closed)
  if (!verifySupabaseSignature(req, rawBody)) {
    return NextResponse.json({ ok: false, reason: "bad_signature" }, { status: 401 });
  }

  let payload: any;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ ok: false, reason: "bad_json" }, { status: 400 });
  }

  // Supabase auth "user created" payloads vary; we handle common shapes.
  const user =
    payload?.record ?? payload?.user ?? payload?.new ?? payload?.data?.user ?? null;

  const userId: string | null = user?.id ?? null;
  const email: string | null = user?.email ?? null;

  if (!userId || !email) {
    return NextResponse.json({ ok: true, skipped: "missing_user" });
  }

  const eventType = "welcome_v1";

  // Dedupe: insert email_events (unique user_id + event_type)
  const { error: insErr } = await supabaseAdmin
    .from("email_events")
    .insert({
      user_id: userId,
      event_type: eventType,
      sent_to: email,
    });

  if (insErr) {
    // Most likely unique violation: already sent
    return NextResponse.json({ ok: true, skipped: "already_sent" });
  }

  const firstName =
    (user?.user_metadata?.full_name ||
      user?.user_metadata?.name ||
      user?.user_metadata?.first_name ||
      "").toString().trim() ||
    email.split("@")[0] ||
    "there";

  const dashboardUrl = `${siteUrl}/dashboard`;
  const helpUrl = `${siteUrl}/help`;
  const logoUrl = `${siteUrl}/logo.png`;

  const resend = new Resend(resendKey);

  const html = welcomeHtml({
    siteUrl,
    logoUrl,
    firstName,
    dashboardUrl,
    helpUrl,
  });

  const subject = `Welcome to TempTake, ${firstName}`;

  const { error } = await resend.emails.send({
    from,
    to: email,
    subject,
    html,
    replyTo: "info@temptake.com",
  });

  if (error) {
    // If send failed, roll back the event row so we can retry later
    await supabaseAdmin
      .from("email_events")
      .delete()
      .eq("user_id", userId)
      .eq("event_type", eventType);

    return NextResponse.json({ ok: false, reason: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

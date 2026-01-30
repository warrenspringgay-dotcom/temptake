import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { sendEmail } from "@/lib/email";
import { assertCronAuth } from "@/lib/cronAuth";
import { getOriginFromEnv, wrapHtml, ctaButton, fmtDDMMYYYY } from "@/lib/emailTemplates";

function addDays(d: Date, days: number) {
  const x = new Date(d);
  x.setUTCDate(x.getUTCDate() + days);
  return x;
}

export async function GET(req: NextRequest) {
  try {
    if (!assertCronAuth(req)) {
      return NextResponse.json({ ok: false, reason: "unauthorized" }, { status: 401 });
    }

    const now = new Date();

    // Send when trial ended 3-4 days ago (24h window)
    const windowStart = addDays(now, -4);
    const windowEnd = addDays(now, -3);

    const { data: subs, error } = await supabaseAdmin
      .from("billing_subscriptions")
      .select("id, org_id, user_id, trial_ends_at, status")
      .in("status", ["trialing", "active", "past_due", "canceled"]) // be tolerant
      .gte("trial_ends_at", windowStart.toISOString())
      .lt("trial_ends_at", windowEnd.toISOString())
      .is("trial_final_nudge_sent_at", null);

    if (error) {
      return NextResponse.json(
        { ok: false, reason: "query-failed", detail: error.message },
        { status: 500 }
      );
    }

    // IMPORTANT: Deep-link to the app billing screen, not the marketing pricing page.
    // Set NEXT_PUBLIC_APP_URL in env (e.g. https://app.temptake.com).
    const appOrigin = (process.env.NEXT_PUBLIC_APP_URL ?? getOriginFromEnv(req.nextUrl.origin)).replace(
      /\/$/,
      ""
    );
    const billingUrl = `${appOrigin}/settings/billing`;

    let sent = 0;
    let skipped = 0;
    const failures: Array<{ id: string; reason: string }> = [];

    for (const s of subs ?? []) {
      try {
        if (!s.user_id || !s.trial_ends_at) {
          skipped++;
          continue;
        }

        const { data: userData, error: userErr } =
          await supabaseAdmin.auth.admin.getUserById(s.user_id);

        const email = userData?.user?.email?.trim();
        if (userErr || !email) {
          skipped++;
          continue;
        }

        const ends = new Date(s.trial_ends_at);
        const endsFmt = fmtDDMMYYYY(ends);

        await sendEmail({
          to: email,
          subject: "Final reminder: keep TempTake running",
          html: wrapHtml(
            "Final reminder",
            `
              <p style="margin:0 0 12px">
                Your trial ended on <strong>${endsFmt}</strong>.
              </p>
              <p style="margin:0 0 16px">
                If you still need SFBB-style logging (temps, cleaning, sign-offs), pick a plan now and carry on where you left off.
              </p>
              ${ctaButton(billingUrl, "Choose a plan")}
            `
          ),
        });

        const { error: updErr } = await supabaseAdmin
          .from("billing_subscriptions")
          .update({ trial_final_nudge_sent_at: new Date().toISOString() })
          .eq("id", s.id);

        if (updErr) failures.push({ id: s.id, reason: `sent-but-update-failed: ${updErr.message}` });
        else sent++;
      } catch (e: any) {
        failures.push({ id: String(s?.id), reason: e?.message ?? "unknown" });
      }
    }

    return NextResponse.json({
      ok: true,
      window: { start: windowStart.toISOString(), end: windowEnd.toISOString() },
      totals: { candidates: subs?.length ?? 0, sent, skipped, failures: failures.length },
      failures,
    });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, reason: "exception", detail: e?.message ?? String(e) },
      { status: 500 }
    );
  }
}

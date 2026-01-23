import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { sendEmail } from "@/lib/email";
import { assertCronAuth } from "@/lib/cronAuth";
import { getOriginFromEnv, wrapHtml, ctaButton, fmtDDMMYYYY } from "@/lib/emailTemplates";

function startOfUTCDate(d: Date) {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 0, 0, 0));
}

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
    const todayStart = startOfUTCDate(now);
    const todayEnd = addDays(todayStart, 1);

    // Trial ended "today" means: trial_ends_at in [todayStart, todayEnd)
    const { data: subs, error } = await supabaseAdmin
      .from("billing_subscriptions")
      .select("id, org_id, user_id, trial_ends_at, status")
      .eq("status", "trialing")
      .gte("trial_ends_at", todayStart.toISOString())
      .lt("trial_ends_at", todayEnd.toISOString())
      .is("trial_ended_sent_at", null);

    if (error) {
      return NextResponse.json(
        { ok: false, reason: "query-failed", detail: error.message },
        { status: 500 }
      );
    }

    const origin = getOriginFromEnv(req.nextUrl.origin);
    const billingUrl = `${origin}/pricing`;

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
          subject: "Your TempTake trial has ended",
          html: wrapHtml(
            "Your trial has ended",
            `
              <p style="margin:0 0 12px">
                Your TempTake trial ended on <strong>${endsFmt}</strong>.
              </p>
              <p style="margin:0 0 16px">
                If you want to keep logging temps, cleaning tasks, and sign-offs without interruption, choose a plan now.
              </p>
              ${ctaButton(billingUrl, "Choose a plan")}
            `
          ),
        });

        const { error: updErr } = await supabaseAdmin
          .from("billing_subscriptions")
          .update({ trial_ended_sent_at: new Date().toISOString() })
          .eq("id", s.id);

        if (updErr) failures.push({ id: s.id, reason: `sent-but-update-failed: ${updErr.message}` });
        else sent++;
      } catch (e: any) {
        failures.push({ id: String(s?.id), reason: e?.message ?? "unknown" });
      }
    }

    return NextResponse.json({
      ok: true,
      window: { start: todayStart.toISOString(), end: todayEnd.toISOString() },
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

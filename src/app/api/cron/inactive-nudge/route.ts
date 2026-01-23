import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { sendEmail } from "@/lib/email";
import { assertCronAuth } from "@/lib/cronAuth";
import { getOriginFromEnv, wrapHtml, ctaButton } from "@/lib/emailTemplates";

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
    const since = addDays(now, -3).toISOString();

    // Pull subs for orgs that are trialing or active-ish
    const { data: subs, error } = await supabaseAdmin
      .from("billing_subscriptions")
      .select("id, org_id, user_id, status")
      .in("status", ["trialing", "active", "past_due"]);

    if (error) {
      return NextResponse.json(
        { ok: false, reason: "subs-query-failed", detail: error.message },
        { status: 500 }
      );
    }

    const origin = getOriginFromEnv(req.nextUrl.origin);
    const dashboardUrl = `${origin}/dashboard`;

    let candidates = 0;
    let sent = 0;
    let skipped = 0;
    const failures: Array<{ org_id: string; reason: string }> = [];

    for (const s of subs ?? []) {
      try {
        if (!s.org_id || !s.user_id) {
          skipped++;
          continue;
        }

        // Any temp logs in last 3 days?
        const { count: tempCount, error: tempErr } = await supabaseAdmin
          .from("food_temp_logs")
          .select("id", { count: "exact", head: true })
          .eq("org_id", s.org_id)
          .gte("created_at", since);

        if (tempErr) {
          failures.push({ org_id: String(s.org_id), reason: `temp-check-failed: ${tempErr.message}` });
          continue;
        }

        // Any signoffs in last 3 days?
        const { count: signCount, error: signErr } = await supabaseAdmin
          .from("daily_signoffs")
          .select("id", { count: "exact", head: true })
          .eq("org_id", s.org_id)
          .gte("created_at", since);

        if (signErr) {
          failures.push({ org_id: String(s.org_id), reason: `signoff-check-failed: ${signErr.message}` });
          continue;
        }

        if ((tempCount ?? 0) > 0 || (signCount ?? 0) > 0) {
          skipped++;
          continue;
        }

        candidates++;

        // Email the subscription user (owner/admin typically)
        const { data: userData, error: userErr } =
          await supabaseAdmin.auth.admin.getUserById(s.user_id);

        const email = userData?.user?.email?.trim();
        if (userErr || !email) {
          skipped++;
          continue;
        }

        await sendEmail({
          to: email,
          subject: "Quick check: TempTake hasn’t been used in a few days",
          html: wrapHtml(
            "TempTake hasn’t been used recently",
            `
              <p style="margin:0 0 12px">
                We haven’t seen any temperature logs or daily sign-offs in the last few days.
              </p>
              <p style="margin:0 0 16px">
                If you’re still trading, jump back in and log today’s checks so you stay audit-ready.
              </p>
              ${ctaButton(dashboardUrl, "Open TempTake")}
            `
          ),
        });

        sent++;
      } catch (e: any) {
        failures.push({ org_id: String((s as any)?.org_id), reason: e?.message ?? "unknown" });
      }
    }

    return NextResponse.json({
      ok: true,
      since,
      totals: { orgs: subs?.length ?? 0, candidates, sent, skipped, failures: failures.length },
      failures,
    });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, reason: "exception", detail: e?.message ?? String(e) },
      { status: 500 }
    );
  }
}

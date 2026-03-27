import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";
import { getServerSupabase } from "@/lib/supabaseServer";

const resend = new Resend(process.env.RESEND_API_KEY);

function safeDate(val: any): Date | null {
  if (!val) return null;
  const d = new Date(val);
  return Number.isNaN(d.getTime()) ? null : d;
}

function formatISOToUK(iso: string | null | undefined): string {
  const d = safeDate(iso);
  if (!d) return "—";
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
}

function addDays(date: Date, days: number) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

function escapeHtml(input: string) {
  return input
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

type Body = {
  orgId: string;
  from: string;
  to: string;
  locationId: string | null;
  locationLabel: string;
  sendToSelf: boolean;
  extraEmail?: string | null;
};

export async function POST(req: NextRequest) {
  try {
    const supabase = await getServerSupabase();

    const {
      data: { user },
      error: userErr,
    } = await supabase.auth.getUser();

    if (userErr || !user) {
      return NextResponse.json({ error: "Unauthorised." }, { status: 401 });
    }

    const body = (await req.json()) as Body;

    if (!body?.orgId || !body?.from || !body?.to) {
      return NextResponse.json({ error: "Missing required report inputs." }, { status: 400 });
    }

    const recipients = Array.from(
      new Set(
        [
          body.sendToSelf ? user.email?.trim().toLowerCase() : null,
          body.extraEmail?.trim().toLowerCase() || null,
        ].filter(Boolean) as string[]
      )
    );

    if (!recipients.length) {
      return NextResponse.json({ error: "No recipients selected." }, { status: 400 });
    }

    for (const email of recipients) {
      if (!isValidEmail(email)) {
        return NextResponse.json(
          { error: `Invalid email address: ${email}` },
          { status: 400 }
        );
      }
    }

    const fromStart = new Date(`${body.from}T00:00:00.000Z`).toISOString();
    const toEnd = new Date(`${body.to}T23:59:59.999Z`).toISOString();

    const locationId = body.locationId ?? null;

    const locationName =
      locationId && body.locationLabel
        ? body.locationLabel
        : body.locationLabel || "All locations";

    let tempsTotalQ = supabase
      .from("food_temp_logs")
      .select("id", { count: "exact", head: true })
      .eq("org_id", body.orgId)
      .gte("at", fromStart)
      .lte("at", toEnd);

    let tempsFailQ = supabase
      .from("food_temp_logs")
      .select("id", { count: "exact", head: true })
      .eq("org_id", body.orgId)
      .eq("status", "fail")
      .gte("at", fromStart)
      .lte("at", toEnd);

    let cleaningQ = supabase
      .from("cleaning_task_runs")
      .select("id", { count: "exact", head: true })
      .eq("org_id", body.orgId)
      .gte("run_on", body.from)
      .lte("run_on", body.to);

    let signoffQ = supabase
      .from("daily_signoffs")
      .select("id", { count: "exact", head: true })
      .eq("org_id", body.orgId)
      .gte("signoff_on", body.from)
      .lte("signoff_on", body.to);

    let incidentsQ = supabase
      .from("incidents")
      .select("id", { count: "exact", head: true })
      .eq("org_id", body.orgId)
      .gte("happened_on", body.from)
      .lte("happened_on", body.to);

    let trainingQ = supabase
      .from("trainings")
      .select("id, expires_on")
      .eq("org_id", body.orgId)
      .limit(5000);

    let allergenQ = supabase
      .from("allergen_review_log")
      .select("id, reviewed_on, interval_days, reviewer")
      .eq("org_id", body.orgId)
      .order("reviewed_on", { ascending: false })
      .limit(20);

    if (locationId) {
      tempsTotalQ = tempsTotalQ.eq("location_id", locationId);
      tempsFailQ = tempsFailQ.eq("location_id", locationId);
      cleaningQ = cleaningQ.eq("location_id", locationId);
      signoffQ = signoffQ.eq("location_id", locationId);
      incidentsQ = incidentsQ.eq("location_id", locationId);
      trainingQ = trainingQ.eq("location_id", locationId);
      allergenQ = allergenQ.eq("location_id", locationId);
    }

    const [
      tempsTotalRes,
      tempsFailRes,
      cleaningRes,
      signoffRes,
      incidentsRes,
      trainingRes,
      allergenRes,
    ] = await Promise.all([
      tempsTotalQ,
      tempsFailQ,
      cleaningQ,
      signoffQ,
      incidentsQ,
      trainingQ,
      allergenQ,
    ]);

    if (tempsTotalRes.error) throw tempsTotalRes.error;
    if (tempsFailRes.error) throw tempsFailRes.error;
    if (cleaningRes.error) throw cleaningRes.error;
    if (signoffRes.error) throw signoffRes.error;
    if (incidentsRes.error) throw incidentsRes.error;
    if (trainingRes.error) throw trainingRes.error;
    if (allergenRes.error) throw allergenRes.error;

    const tempsTotal = tempsTotalRes.count ?? 0;
    const tempsFailed = tempsFailRes.count ?? 0;
    const cleaningRuns = cleaningRes.count ?? 0;
    const signoffs = signoffRes.count ?? 0;
    const incidents = incidentsRes.count ?? 0;

    const today0 = new Date();
    today0.setHours(0, 0, 0, 0);

    const trainings = (trainingRes.data ?? []) as Array<{ id: string; expires_on: string | null }>;
    let trainingExpired = 0;
    let trainingDueSoon = 0;

    for (const row of trainings) {
      const exp = safeDate(row.expires_on);
      if (!exp) continue;

      const exp0 = new Date(exp);
      exp0.setHours(0, 0, 0, 0);

      const daysUntil = Math.round((exp0.getTime() - today0.getTime()) / 86400000);

      if (daysUntil < 0) trainingExpired += 1;
      else if (daysUntil <= 30) trainingDueSoon += 1;
    }

    const allergenRows = (allergenRes.data ?? []) as Array<{
      id: string;
      reviewed_on: string | null;
      interval_days: number | null;
      reviewer: string | null;
    }>;

    let latestAllergenReview: string | null = null;
    let nextAllergenDue: string | null = null;
    let allergenReviewer: string | null = null;

    if (allergenRows.length > 0) {
      const latest = allergenRows[0];
      latestAllergenReview = latest.reviewed_on ?? null;
      allergenReviewer = latest.reviewer ?? null;

      const reviewed = safeDate(latest.reviewed_on);
      const intervalDays = latest.interval_days ? Number(latest.interval_days) : null;

      if (reviewed && intervalDays && Number.isFinite(intervalDays) && intervalDays > 0) {
        nextAllergenDue = addDays(reviewed, intervalDays).toISOString();
      }
    }

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/+$/, "") || "https://temptake.com";
    const reportLink = `${siteUrl}/reports`;

    const subject = `TempTake report · ${locationName} · ${formatISOToUK(body.from)} to ${formatISOToUK(
      body.to
    )}`;

    const html = `
      <div style="font-family: Arial, sans-serif; line-height: 1.5; color: #0f172a;">
        <div style="max-width: 720px; margin: 0 auto; padding: 24px;">
          <div style="margin-bottom: 24px;">
            <div style="font-size: 24px; font-weight: 700;">TempTake report</div>
            <div style="font-size: 14px; color: #475569; margin-top: 4px;">
              ${escapeHtml(locationName)} · ${escapeHtml(formatISOToUK(body.from))} to ${escapeHtml(
      formatISOToUK(body.to)
    )}
            </div>
          </div>

          <div style="display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; margin-bottom: 24px;">
            <div style="border: 1px solid #e2e8f0; border-radius: 14px; padding: 14px;">
              <div style="font-size: 12px; text-transform: uppercase; color: #64748b;">Temperature logs</div>
              <div style="font-size: 28px; font-weight: 700; margin-top: 6px;">${tempsTotal}</div>
              <div style="font-size: 13px; color: #64748b; margin-top: 4px;">${tempsFailed} failed</div>
            </div>

            <div style="border: 1px solid #e2e8f0; border-radius: 14px; padding: 14px;">
              <div style="font-size: 12px; text-transform: uppercase; color: #64748b;">Cleaning runs</div>
              <div style="font-size: 28px; font-weight: 700; margin-top: 6px;">${cleaningRuns}</div>
              <div style="font-size: 13px; color: #64748b; margin-top: 4px;">Completed in range</div>
            </div>

            <div style="border: 1px solid #e2e8f0; border-radius: 14px; padding: 14px;">
              <div style="font-size: 12px; text-transform: uppercase; color: #64748b;">Day sign-offs</div>
              <div style="font-size: 28px; font-weight: 700; margin-top: 6px;">${signoffs}</div>
              <div style="font-size: 13px; color: #64748b; margin-top: 4px;">Signed days in range</div>
            </div>

            <div style="border: 1px solid #e2e8f0; border-radius: 14px; padding: 14px;">
              <div style="font-size: 12px; text-transform: uppercase; color: #64748b;">Incidents</div>
              <div style="font-size: 28px; font-weight: 700; margin-top: 6px;">${incidents}</div>
              <div style="font-size: 13px; color: #64748b; margin-top: 4px;">Logged incidents in range</div>
            </div>
          </div>

          <div style="border: 1px solid #e2e8f0; border-radius: 14px; padding: 16px; margin-bottom: 16px;">
            <div style="font-size: 16px; font-weight: 700; margin-bottom: 10px;">Training summary</div>
            <ul style="padding-left: 18px; margin: 0; color: #334155;">
              <li>${trainingExpired} expired training record(s)</li>
              <li>${trainingDueSoon} training record(s) due within 30 days</li>
            </ul>
          </div>

          <div style="border: 1px solid #e2e8f0; border-radius: 14px; padding: 16px; margin-bottom: 16px;">
            <div style="font-size: 16px; font-weight: 700; margin-bottom: 10px;">Allergen review</div>
            <ul style="padding-left: 18px; margin: 0; color: #334155;">
              <li>Last review: ${latestAllergenReview ? escapeHtml(formatISOToUK(latestAllergenReview)) : "—"}</li>
              <li>Next due: ${nextAllergenDue ? escapeHtml(formatISOToUK(nextAllergenDue)) : "—"}</li>
              <li>Reviewer: ${allergenReviewer ? escapeHtml(allergenReviewer) : "—"}</li>
            </ul>
          </div>

          <div style="margin-top: 24px;">
            <a
              href="${reportLink}"
              style="display: inline-block; background: #111827; color: white; text-decoration: none; padding: 12px 16px; border-radius: 12px; font-weight: 600;"
            >
              Open full report in TempTake
            </a>
          </div>

          <div style="margin-top: 20px; font-size: 12px; color: #64748b;">
            Sent from TempTake.
          </div>
        </div>
      </div>
    `;

    const fromEmail =
      process.env.REPORT_FROM_EMAIL ||
      process.env.RESEND_FROM_EMAIL ||
      "TempTake <info@temptake.com>";

    const result = await resend.emails.send({
      from: fromEmail,
      to: recipients,
      subject,
      html,
    });

    if ((result as any)?.error) {
      return NextResponse.json(
        { error: (result as any).error.message || "Email send failed." },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ok: true,
      recipients,
    });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || "Failed to send report." },
      { status: 500 }
    );
  }
}
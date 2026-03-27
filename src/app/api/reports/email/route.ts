import { NextResponse } from "next/server";
import { Resend } from "resend";
import { getServerSupabase } from "@/lib/supabaseServer";
import { buildReportData } from "@/lib/reports/buildReportData";
import { renderReportHtml } from "@/lib/reports/renderReportHtml";
import { renderReportPdf } from "@/lib/reports/renderReportPdf";

export const runtime = "nodejs";

const resend = new Resend(process.env.RESEND_API_KEY);

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

function safeDate(val: unknown): Date | null {
  if (!val) return null;
  const d = new Date(String(val));
  return Number.isNaN(d.getTime()) ? null : d;
}

function formatUkDate(iso: string) {
  const d = safeDate(iso);
  if (!d) return iso;
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
}

function fileSafeDate(iso: string) {
  const d = safeDate(iso);
  if (!d) return iso;
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const year = d.getFullYear();
  return `${year}-${month}-${day}`;
}

export async function POST(req: Request) {
  try {
    if (!process.env.RESEND_API_KEY) {
      return NextResponse.json(
        { error: "Missing RESEND_API_KEY." },
        { status: 500 }
      );
    }

    if (!process.env.RESEND_FROM_EMAIL) {
      return NextResponse.json(
        { error: "Missing RESEND_FROM_EMAIL." },
        { status: 500 }
      );
    }

    const supabase = await getServerSupabase();

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json(
        { error: "You must be logged in to send a report." },
        { status: 401 }
      );
    }

    const body = await req.json();

    const orgId = typeof body?.orgId === "string" ? body.orgId.trim() : "";
    const from = typeof body?.from === "string" ? body.from.trim() : "";
    const to = typeof body?.to === "string" ? body.to.trim() : "";
    const locationId =
      typeof body?.locationId === "string" && body.locationId.trim()
        ? body.locationId.trim()
        : null;

    const rawRecipients: unknown[] = Array.isArray(body?.recipients)
      ? body.recipients
      : [];

    const recipients: string[] = Array.from(
      new Set(
        rawRecipients
          .map((value: unknown) => String(value ?? "").trim().toLowerCase())
          .filter(Boolean)
          .filter(isValidEmail)
      )
    );

    if (!orgId) {
      return NextResponse.json(
        { error: "Missing orgId." },
        { status: 400 }
      );
    }

    if (!from || !to) {
      return NextResponse.json(
        { error: "Missing report date range." },
        { status: 400 }
      );
    }

    if (!recipients.length) {
      return NextResponse.json(
        { error: "No recipients selected." },
        { status: 400 }
      );
    }

    const prettyFrom = formatUkDate(from);
    const prettyTo = formatUkDate(to);

    let locationName = "All locations";

    if (locationId) {
      const { data: locationRow, error: locationError } = await supabase
        .from("locations")
        .select("name")
        .eq("id", locationId)
        .eq("org_id", orgId)
        .maybeSingle();

      if (locationError) {
        console.error(
          "[/api/reports/email] failed to fetch location",
          locationError
        );
      }

      if (locationRow?.name) {
        locationName = String(locationRow.name);
      }
    }

    const siteUrl =
      process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/+$/, "") ||
      "https://temptake.com";

    const reportUrl = new URL("/reports", siteUrl);
    reportUrl.searchParams.set("from", from);
    reportUrl.searchParams.set("to", to);
    if (locationId) {
      reportUrl.searchParams.set("locationId", locationId);
    }

    const reportData = await buildReportData({
      orgId,
      from,
      to,
      locationId,
      locationLabel: locationName,
      generatedByEmail: user.email ?? null,
      reportUrl: reportUrl.toString(),
    });

    const html = renderReportHtml(reportData);
    const pdfBuffer = await renderReportPdf(reportData);

    const subject = `TempTake report: ${locationName} (${prettyFrom} - ${prettyTo})`;

    const text = [
      "TempTake report",
      `Location: ${locationName}`,
      `Date range: ${prettyFrom} to ${prettyTo}`,
      "",
      "The report PDF is attached.",
      `Open report online: ${reportUrl.toString()}`,
      "",
      `Sent by ${user.email ?? "a TempTake user"}`,
    ].join("\n");

    const safeLocationSlug =
      locationName
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "") || "all-locations";

    const filename = `temptake-report_${safeLocationSlug}_${fileSafeDate(
      from
    )}_to_${fileSafeDate(to)}.pdf`;

    const result = await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL!,
      to: recipients,
      subject,
      html,
      text,
      attachments: [
        {
          filename,
          content: pdfBuffer.toString("base64"),
        },
      ],
    });

    if (result.error) {
      console.error("[/api/reports/email] resend error", result.error);
      return NextResponse.json(
        {
          error: result.error.message || "Failed to send report email.",
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ok: true,
      recipients,
      resendId: result.data?.id ?? null,
      attachedPdf: filename,
    });
  } catch (error: unknown) {
    console.error("[/api/reports/email] failed", error);

    const message =
      error instanceof Error ? error.message : "Failed to send report email.";

    return NextResponse.json(
      {
        error: message,
      },
      { status: 500 }
    );
  }
}
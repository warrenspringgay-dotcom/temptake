// src/app/api/reports/email/route.ts
import { NextResponse } from "next/server";
import { Resend } from "resend";
import { getServerSupabase } from "@/lib/supabaseServer";

const resend = new Resend(process.env.RESEND_API_KEY);

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

function formatUkDate(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
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

    const orgId =
      typeof body?.orgId === "string" ? body.orgId.trim() : "";
    const from =
      typeof body?.from === "string" ? body.from.trim() : "";
    const to =
      typeof body?.to === "string" ? body.to.trim() : "";
    const locationId =
      typeof body?.locationId === "string" && body.locationId.trim()
        ? body.locationId.trim()
        : null;

    const rawRecipients = Array.isArray(body?.recipients)
      ? body.recipients
      : [];

    const recipients = rawRecipients
      .map((value: unknown) => String(value ?? "").trim().toLowerCase())
      .filter(Boolean)
      .filter(isValidEmail);

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
      const { data: locationRow } = await supabase
        .from("locations")
        .select("name")
        .eq("id", locationId)
        .eq("org_id", orgId)
        .maybeSingle();

      if (locationRow?.name) {
        locationName = String(locationRow.name);
      }
    }

    const reportUrl = new URL("/reports", process.env.NEXT_PUBLIC_SITE_URL || "https://temptake.com");
    reportUrl.searchParams.set("from", from);
    reportUrl.searchParams.set("to", to);
    if (locationId) {
      reportUrl.searchParams.set("locationId", locationId);
    }

    const subject = `TempTake report: ${locationName} (${prettyFrom} - ${prettyTo})`;

    const html = `
      <div style="font-family: Arial, sans-serif; color: #0f172a; line-height: 1.5;">
        <h2 style="margin: 0 0 12px;">TempTake report</h2>
        <p style="margin: 0 0 8px;"><strong>Location:</strong> ${locationName}</p>
        <p style="margin: 0 0 16px;"><strong>Date range:</strong> ${prettyFrom} to ${prettyTo}</p>

        <p style="margin: 0 0 16px;">
          A report has been requested from TempTake for the date range above.
        </p>

        <p style="margin: 0 0 16px;">
          <a
            href="${reportUrl.toString()}"
            style="display: inline-block; background: #0f172a; color: #ffffff; text-decoration: none; padding: 10px 14px; border-radius: 10px;"
          >
            Open report in TempTake
          </a>
        </p>

        <p style="margin: 16px 0 0; font-size: 12px; color: #64748b;">
          Sent by ${user.email ?? "a TempTake user"}
        </p>
      </div>
    `;

    const text = [
      "TempTake report",
      `Location: ${locationName}`,
      `Date range: ${prettyFrom} to ${prettyTo}`,
      "",
      `Open report: ${reportUrl.toString()}`,
      "",
      `Sent by ${user.email ?? "a TempTake user"}`,
    ].join("\n");

    const result = await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL,
      to: recipients,
      subject,
      html,
      text,
    });

    return NextResponse.json({
      ok: true,
      recipients,
      resendId: result.data?.id ?? null,
    });
  } catch (error: any) {
    console.error("[/api/reports/email] failed", error);

    return NextResponse.json(
      {
        error:
          error?.message || "Failed to send report email.",
      },
      { status: 500 }
    );
  }
}
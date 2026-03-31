import { NextResponse } from "next/server";
import { getServerSupabase } from "@/lib/supabaseServer";
import { buildReportData } from "@/lib/reports/buildReportData";
import { renderReportHtml } from "@/lib/reports/renderReportHtml";

export const runtime = "nodejs";

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

export async function GET(req: Request) {
  try {
    const supabase = await getServerSupabase();

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json(
        { error: "You must be logged in to print a report." },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(req.url);

    const orgId = searchParams.get("orgId")?.trim() ?? "";
    const from = searchParams.get("from")?.trim() ?? "";
    const to = searchParams.get("to")?.trim() ?? "";
    const locationId = searchParams.get("locationId")?.trim() || null;

    if (!orgId || !from || !to) {
      return NextResponse.json(
        { error: "Missing orgId or date range." },
        { status: 400 }
      );
    }

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

    const reportHtml = renderReportHtml(reportData);

    const printableHtml = `<!doctype html>
<html lang="en">
  <head>
    <meta charSet="utf-8" />
    <title>TempTake report print</title>
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <style>
      @page { size: A4; margin: 12mm; }
      html, body { margin: 0; padding: 0; background: #ffffff; }
      @media print {
        .no-print { display: none !important; }
      }
    </style>
  </head>
  <body>
    <div class="no-print" style="padding:16px;border-bottom:1px solid #e2e8f0;font-family:Arial,Helvetica,sans-serif;">
      <button onclick="window.print()" style="padding:10px 14px;border-radius:10px;border:1px solid #cbd5e1;background:#0f172a;color:white;cursor:pointer;">
        Print report
      </button>
      <span style="margin-left:12px;color:#64748b;">
        ${locationName} · ${formatUkDate(from)} to ${formatUkDate(to)}
      </span>
    </div>
    ${reportHtml}
    <script>
      window.addEventListener("load", () => {
        setTimeout(() => window.print(), 250);
      });
    </script>
  </body>
</html>`;

    return new NextResponse(printableHtml, {
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "no-store",
      },
    });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Failed to render printable report.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
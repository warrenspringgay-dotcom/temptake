import { NextRequest, NextResponse } from "next/server";
import { getServerSupabase } from "@/lib/supabaseServer";
import { buildReportData } from "@/lib/reports/buildReportData";
import { renderReportPdf } from "@/lib/reports/renderReportPdf";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);

    const orgId = searchParams.get("orgId");
    const from = searchParams.get("from");
    const to = searchParams.get("to");
    const locationId = searchParams.get("locationId");
    const locationLabel = searchParams.get("locationLabel") ?? "Report";
    const download = searchParams.get("download");

    if (!orgId || !from || !to) {
      return NextResponse.json(
        { error: "Missing required params: orgId, from, to" },
        { status: 400 }
      );
    }

    const supabase = await getServerSupabase();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const report = await buildReportData({
      orgId,
      from,
      to,
      locationId,
      locationLabel,
      generatedByEmail: user.email ?? null,
      reportUrl: req.url,
    });

    const pdfBuffer = await renderReportPdf(report);

    const fileName = `food-safety-report_${from}_${to}.pdf`;

    return new NextResponse(new Uint8Array(pdfBuffer), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Length": String(pdfBuffer.length),
        "Content-Disposition":
          download === "1"
            ? `attachment; filename="${fileName}"`
            : `inline; filename="${fileName}"`,
        "Cache-Control": "no-store, no-cache, must-revalidate",
      },
    });
  } catch (error) {
    console.error("PDF route failed", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to generate PDF report",
      },
      { status: 500 }
    );
  }
}
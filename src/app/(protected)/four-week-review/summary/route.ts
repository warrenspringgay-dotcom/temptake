import { NextRequest, NextResponse } from "next/server";
import { getFourWeeklyReview } from "@/app/actions/reports";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const to = searchParams.get("to") ?? undefined;

  const summary = await getFourWeeklyReview({ to });

  // small helper: "issues found" count to drive banners
  const issues =
    summary.temperature.repeatFailures.length +
    summary.cleaning.repeatMisses.length +
    summary.training.expired +
    summary.training.dueSoon;

  return NextResponse.json({
    summary,
    issues,
    generatedAt: new Date().toISOString(),
  });
}

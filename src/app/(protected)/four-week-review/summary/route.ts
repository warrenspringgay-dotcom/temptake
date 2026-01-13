// src/app/four-week-review/summary/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getFourWeeklyReview } from "@/app/actions/reports";
import { getServerSupabase } from "@/lib/supabaseServer";

function addDays(date: Date, days: number) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function iso(d: Date) {
  return d.toISOString();
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const to = searchParams.get("to") ?? undefined;

  const supabase = await getServerSupabase();

  // Auth user
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json(
      { error: "not_authenticated" },
      { status: 401 }
    );
  }

  // Find org_id (and created_at fallback)
  const { data: profile } = await supabase
    .from("profiles")
    .select("org_id, created_at")
    .eq("id", user.id)
    .maybeSingle();

  const orgId = profile?.org_id ?? null;

  if (!orgId) {
    return NextResponse.json(
      { error: "no_org" },
      { status: 200 }
    );
  }

  // Try to get org created_at from orgs table (if you have it)
  let startedAt: Date | null = null;

  const { data: org } = await supabase
    .from("orgs")
    .select("created_at")
    .eq("id", orgId)
    .maybeSingle();

  if (org?.created_at) startedAt = new Date(org.created_at);

  // Fallback: profile created_at if no orgs table or missing data
  if (!startedAt && profile?.created_at) startedAt = new Date(profile.created_at);

  // If we STILL don’t have a start date, just allow it (don’t block users forever)
  const now = new Date();
  const msPerDay = 86400000;

  const daysSinceStart =
    startedAt ? Math.floor((now.getTime() - startedAt.getTime()) / msPerDay) : 9999;

  const eligible = daysSinceStart >= 28;

  // Build summary as normal
  const summary = await getFourWeeklyReview({ to });

  // Issues count (your original logic)
  const issues =
    summary.temperature.repeatFailures.length +
    summary.cleaning.repeatMisses.length +
    summary.training.expired +
    summary.training.dueSoon;

  // If not eligible, force issues to 0 so banner logic won’t fire early
  const safeIssues = eligible ? issues : 0;

  const nextDueOn = startedAt ? iso(addDays(startedAt, 28)) : null;

  return NextResponse.json({
    summary,
    issues: safeIssues,
    eligible,
    daysSinceStart,
    nextDueOn,
    generatedAt: iso(now),
  });
}

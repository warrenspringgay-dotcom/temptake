// src/app/(protected)/four-week-review/summary/route.ts
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

function parseLocationId(raw: string | null): string | null {
  const value = String(raw ?? "").trim();
  if (!value || value.toLowerCase() === "all") return null;
  return value;
}

function safeDate(val: unknown): Date | null {
  if (!val) return null;

  if (typeof val === "string" && /^\d{4}-\d{2}-\d{2}$/.test(val)) {
    const [y, m, d] = val.split("-").map(Number);
    const parsed = new Date(y, (m ?? 1) - 1, d ?? 1, 0, 0, 0, 0);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  const parsed = new Date(String(val));
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function normaliseToYmd(raw: string | null): string | undefined {
  const value = String(raw ?? "").trim();
  if (!value) return undefined;

  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return value;
  }

  const parsed = safeDate(value);
  if (!parsed) return undefined;

  const y = parsed.getFullYear();
  const m = String(parsed.getMonth() + 1).padStart(2, "0");
  const d = String(parsed.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const to = normaliseToYmd(searchParams.get("to"));
    const requestedLocationId = parseLocationId(searchParams.get("locationId"));

    const supabase = await getServerSupabase();

    const {
      data: { user },
      error: userErr,
    } = await supabase.auth.getUser();

    if (userErr) {
      return NextResponse.json(
        { error: userErr.message || "failed_to_load_user" },
        { status: 500 }
      );
    }

    if (!user) {
      return NextResponse.json({ error: "not_authenticated" }, { status: 401 });
    }

    const { data: profile, error: profileErr } = await supabase
      .from("profiles")
      .select("org_id, created_at")
      .eq("id", user.id)
      .maybeSingle();

    if (profileErr) {
      return NextResponse.json(
        { error: profileErr.message || "failed_to_load_profile" },
        { status: 500 }
      );
    }

    const orgId = profile?.org_id ? String(profile.org_id) : null;

    if (!orgId) {
      return NextResponse.json({ error: "no_org" }, { status: 200 });
    }

    let locationId: string | null = null;

    if (requestedLocationId) {
      const { data: locationRow, error: locationErr } = await supabase
        .from("locations")
        .select("id")
        .eq("id", requestedLocationId)
        .eq("org_id", orgId)
        .maybeSingle();

      if (locationErr) {
        return NextResponse.json(
          { error: locationErr.message || "failed_to_validate_location" },
          { status: 500 }
        );
      }

      if (!locationRow) {
        return NextResponse.json({ error: "invalid_location" }, { status: 400 });
      }

      locationId = String(locationRow.id);
    }

    let startedAt: Date | null = null;

    const { data: org, error: orgErr } = await supabase
      .from("orgs")
      .select("created_at")
      .eq("id", orgId)
      .maybeSingle();

    if (orgErr) {
      return NextResponse.json(
        { error: orgErr.message || "failed_to_load_org" },
        { status: 500 }
      );
    }

    startedAt = safeDate(org?.created_at);

    if (!startedAt) {
      startedAt = safeDate(profile?.created_at);
    }

    const now = new Date();
    const msPerDay = 86400000;

    const daysSinceStart =
      startedAt != null
        ? Math.floor((now.getTime() - startedAt.getTime()) / msPerDay)
        : 9999;

    const eligible = daysSinceStart >= 28;
const summary = await getFourWeeklyReview({
  to,
  locationId,
  
});

    const issues =
      summary.temperature.repeatFailures.length +
      summary.cleaning.repeatMisses.length +
      summary.training.expired +
      summary.training.dueSoon +
      summary.trainingAssigned +
      summary.trainingInProgress +
      summary.allergenOver +
      summary.allergenDueSoon +
      Math.max((summary.signoffsExpected ?? 0) - (summary.signoffsDone ?? 0), 0) +
      (summary.calibrationDue ? 1 : 0);

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
  } catch (error: any) {
    console.error("four-week-review summary route failed", error);

    return NextResponse.json(
      {
        error: error?.message || "failed_to_build_four_week_summary",
      },
      { status: 500 }
    );
  }
}
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { sendPushToLocation } from "@/lib/push/sendPushToLocation";

export const runtime = "nodejs";

const LOOKAHEAD_MINUTES = 45;

type LocationRow = {
  id: string;
  org_id: string;
  name: string | null;
};

type OpeningRow = {
  location_id: string;
  closes_at: string | null;
  is_open: boolean | null;
};

function getLondonParts() {
  const now = new Date();

  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/London",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    weekday: "long",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(now);

  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";

  return {
    dateISO: `${get("year")}-${get("month")}-${get("day")}`,
    minutesNow: Number(get("hour")) * 60 + Number(get("minute")),
    weekday: get("weekday"),
  };
}

function weekdayTo1to7(weekday: string) {
  const key = weekday.toLowerCase();

  if (key === "monday") return 1;
  if (key === "tuesday") return 2;
  if (key === "wednesday") return 3;
  if (key === "thursday") return 4;
  if (key === "friday") return 5;
  if (key === "saturday") return 6;
  if (key === "sunday") return 7;

  return null;
}

function timeToMinutes(t: string | null) {
  if (!t) return null;

  const [hh, mm] = t.slice(0, 5).split(":").map(Number);

  if (!Number.isFinite(hh) || !Number.isFinite(mm)) return null;

  return hh * 60 + mm;
}

async function getLocationsNearClosing(dateISO: string, minutesNow: number, weekdayNum: number) {
  const { data: openings, error: openingsError } = await supabaseAdmin
    .from("location_opening_days")
    .select("location_id,closes_at,is_open")
    .eq("weekday", weekdayNum)
    .eq("is_open", true);

  if (openingsError) throw openingsError;

  const candidateOpeningRows = ((openings ?? []) as OpeningRow[]).filter((row) => {
    const closeMins = timeToMinutes(row.closes_at);
    if (closeMins == null) return false;

    const minutesUntilClose = closeMins - minutesNow;

    return minutesUntilClose >= 0 && minutesUntilClose <= LOOKAHEAD_MINUTES;
  });

  if (candidateOpeningRows.length === 0) return [];

  const locationIds = candidateOpeningRows.map((r) => r.location_id);

  const { data: locations, error: locationsError } = await supabaseAdmin
    .from("locations")
    .select("id,org_id,name")
    .in("id", locationIds)
    .eq("active", true);

  if (locationsError) throw locationsError;

  const locationRows = (locations ?? []) as LocationRow[];

  const openLocations: LocationRow[] = [];

  for (const location of locationRows) {
    const { data: closure } = await supabaseAdmin
      .from("location_closures")
      .select("id")
      .eq("org_id", location.org_id)
      .eq("location_id", location.id)
      .eq("date", dateISO)
      .maybeSingle();

    if (!closure) openLocations.push(location);
  }

  return openLocations;
}

async function hasDailySignoff(orgId: string, locationId: string, dateISO: string) {
  const { data } = await supabaseAdmin
    .from("daily_signoffs")
    .select("id")
    .eq("org_id", orgId)
    .eq("location_id", locationId)
    .eq("signoff_on", dateISO)
    .maybeSingle();

  return !!data;
}

async function handleClosingSignoffReminders(locations: LocationRow[], dateISO: string) {
  let sent = 0;
  let skipped = 0;
  let failed = 0;

  for (const location of locations) {
    if (await hasDailySignoff(location.org_id, location.id, dateISO)) {
      skipped += 1;
      continue;
    }

    const result = await sendPushToLocation({
      orgId: location.org_id,
      locationId: location.id,
      notificationType: "closing_signoff_missing",
      targetDate: dateISO,
      title: "TempTake sign-off reminder",
      body: `${location.name ?? "This location"} still needs today's sign-off before closing.`,
      url: "/dashboard",
    });

    sent += result.sent;
    skipped += result.skipped;
    failed += result.failed;
  }

  return { sent, skipped, failed };
}

async function handleCleaningIncomplete(locations: LocationRow[], dateISO: string) {
  let sent = 0;
  let skipped = 0;
  let failed = 0;

  for (const location of locations) {
    const { data: tasks, error: tasksError } = await supabaseAdmin
      .from("cleaning_tasks")
      .select("id")
      .eq("org_id", location.org_id)
      .eq("location_id", location.id);

    if (tasksError) throw tasksError;

    const taskIds = (tasks ?? []).map((t: any) => String(t.id));

    if (taskIds.length === 0) {
      skipped += 1;
      continue;
    }

    const { data: runs, error: runsError } = await supabaseAdmin
      .from("cleaning_task_runs")
      .select("task_id")
      .eq("org_id", location.org_id)
      .eq("location_id", location.id)
      .eq("run_on", dateISO)
      .in("task_id", taskIds);

    if (runsError) throw runsError;

    const completedTaskIds = new Set((runs ?? []).map((r: any) => String(r.task_id)));

    if (completedTaskIds.size >= taskIds.length) {
      skipped += 1;
      continue;
    }

    const result = await sendPushToLocation({
      orgId: location.org_id,
      locationId: location.id,
      notificationType: "cleaning_incomplete",
      targetDate: dateISO,
      title: "TempTake cleaning reminder",
      body: `${location.name ?? "This location"} still has cleaning tasks unfinished today.`,
      url: "/cleaning-rota",
    });

    sent += result.sent;
    skipped += result.skipped;
    failed += result.failed;
  }

  return { sent, skipped, failed };
}

async function handleNoTempLogs(locations: LocationRow[], dateISO: string) {
  let sent = 0;
  let skipped = 0;
  let failed = 0;

  const start = `${dateISO}T00:00:00.000Z`;
  const end = `${dateISO}T23:59:59.999Z`;

  for (const location of locations) {
    const { count, error } = await supabaseAdmin
      .from("food_temp_logs")
      .select("id", { count: "exact", head: true })
      .eq("org_id", location.org_id)
      .eq("location_id", location.id)
      .gte("at", start)
      .lte("at", end);

    if (error) throw error;

    if ((count ?? 0) > 0) {
      skipped += 1;
      continue;
    }

    const result = await sendPushToLocation({
      orgId: location.org_id,
      locationId: location.id,
      notificationType: "no_temp_logs_today",
      targetDate: dateISO,
      title: "TempTake temperature reminder",
      body: `${location.name ?? "This location"} has no temperature checks logged today.`,
      url: "/routines",
    });

    sent += result.sent;
    skipped += result.skipped;
    failed += result.failed;
  }

  return { sent, skipped, failed };
}

async function handleTrainingExpiry(dateISO: string) {
  const soon = new Date(`${dateISO}T00:00:00.000Z`);
  soon.setDate(soon.getDate() + 7);

  const soonISO = soon.toISOString().slice(0, 10);

  const { data, error } = await supabaseAdmin
    .from("trainings")
    .select("id,org_id,expires_on,team_member:team_members(location_id)")
    .not("expires_on", "is", null)
    .lte("expires_on", soonISO)
    .is("archived_at", null)
    .limit(500);

  if (error) throw error;

  let sent = 0;
  let skipped = 0;
  let failed = 0;

  const seen = new Set<string>();

  for (const row of (data ?? []) as any[]) {
    const locationId = row.team_member?.location_id;
    if (!locationId) {
      skipped += 1;
      continue;
    }

    const key = `${row.org_id}:${locationId}`;
    if (seen.has(key)) continue;
    seen.add(key);

    const result = await sendPushToLocation({
      orgId: String(row.org_id),
      locationId: String(locationId),
      notificationType: "training_expiring_soon",
      targetDate: dateISO,
      title: "TempTake training reminder",
      body: "Food safety training is expiring soon.",
      url: "/team",
    });

    sent += result.sent;
    skipped += result.skipped;
    failed += result.failed;
  }

  return { sent, skipped, failed };
}

async function handleAllergenReviewDue(dateISO: string) {
  const today = new Date(`${dateISO}T00:00:00.000Z`);

  const { data, error } = await supabaseAdmin
    .from("allergen_review")
    .select("id,org_id,last_reviewed,interval_days")
    .limit(500);

  if (error) throw error;

  let sent = 0;
  let skipped = 0;
  let failed = 0;

  for (const row of (data ?? []) as any[]) {
    if (!row.last_reviewed) continue;

    const intervalDays = Number(row.interval_days ?? 30);
    const due = new Date(`${row.last_reviewed}T00:00:00.000Z`);
    due.setDate(due.getDate() + intervalDays);

    const daysUntilDue = Math.ceil((due.getTime() - today.getTime()) / 86400000);

    if (daysUntilDue > 7) {
      skipped += 1;
      continue;
    }

    const { data: locations } = await supabaseAdmin
      .from("locations")
      .select("id")
      .eq("org_id", row.org_id)
      .eq("active", true)
      .limit(50);

    for (const location of locations ?? []) {
      const result = await sendPushToLocation({
        orgId: String(row.org_id),
        locationId: String((location as any).id),
        notificationType: "allergen_review_due",
        targetDate: dateISO,
        title: "TempTake allergen reminder",
        body: "Allergen review is due soon.",
        url: "/allergens",
      });

      sent += result.sent;
      skipped += result.skipped;
      failed += result.failed;
    }
  }

  return { sent, skipped, failed };
}

export async function GET(req: NextRequest) {
  const secret = req.headers.get("authorization")?.replace("Bearer ", "");

  if (!process.env.CRON_SECRET || secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const { dateISO, minutesNow, weekday } = getLondonParts();
  const weekdayNum = weekdayTo1to7(weekday);

  if (!weekdayNum) {
    return NextResponse.json({ error: "Could not resolve weekday." }, { status: 500 });
  }

  const nearClosingLocations = await getLocationsNearClosing(dateISO, minutesNow, weekdayNum);

  const closingSignoff = await handleClosingSignoffReminders(nearClosingLocations, dateISO);
  const cleaningIncomplete = await handleCleaningIncomplete(nearClosingLocations, dateISO);
  const noTempLogs = await handleNoTempLogs(nearClosingLocations, dateISO);
  const trainingExpiry = await handleTrainingExpiry(dateISO);
  const allergenReview = await handleAllergenReviewDue(dateISO);

  return NextResponse.json({
    ok: true,
    date: dateISO,
    checked_near_closing_locations: nearClosingLocations.length,
    closingSignoff,
    cleaningIncomplete,
    noTempLogs,
    trainingExpiry,
    allergenReview,
  });
}
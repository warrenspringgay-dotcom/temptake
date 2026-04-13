"use server";

import { requireUser } from "@/lib/requireUser";
import { getServerSupabase } from "@/lib/supabaseServer";

/* =========================
   Existing logs API
========================= */

export type LogRow = {
  id: string;
  at: string;
  routine_id: string | null;
  routine_item_id: string | null;
  area: string | null;
  note: string | null;
  target_key: string | null;
  staff_initials: string | null;
  temp_c: number | null;
  status: string | null;
  location_id?: string | null;
};

export async function listLogs(
  opts: { from?: string; to?: string; limit?: number; locationId?: string | null } = {}
) {
  const sb = await getServerSupabase();

  let q = sb
    .from("food_temp_logs")
    .select(
      "id,at,routine_id,routine_item_id,area,note,target_key,staff_initials,temp_c,status,location_id"
    )
    .order("at", { ascending: false });

  if (opts.from) q = q.gte("at", opts.from);
  if (opts.to) q = q.lte("at", opts.to);

  if (opts.locationId) q = q.eq("location_id", opts.locationId);

  if (opts.limit) q = q.limit(opts.limit);

  const { data, error } = await q;
  if (error) throw new Error(error.message);
  return (data ?? []) as LogRow[];
}

/* =========================
   Custom Report
========================= */

export type CustomReport = {
  period: { from?: string; to?: string; locationId?: string | null };
  totals: {
    total: number;
    fails: number;
    pass: number;
    failRatePct: number;
  };
  logs: LogRow[];
};

function pct(n: number, d: number) {
  if (!d) return 0;
  return Math.round((n / d) * 1000) / 10;
}

export async function getCustomReport(
  opts: { from?: string; to?: string; limit?: number; locationId?: string | null } = {}
): Promise<CustomReport> {
  await requireUser();

  const logs = await listLogs(opts);

  const total = logs.length;
  const fails = logs.filter((r) => String(r.status ?? "").toLowerCase() === "fail").length;
  const pass = total - fails;

  return {
    period: { from: opts.from, to: opts.to, locationId: opts.locationId ?? null },
    totals: {
      total,
      fails,
      pass,
      failRatePct: pct(fails, total),
    },
    logs,
  };
}

/* =========================
   Four-Weekly Review (SFBB)
========================= */

function parseYmd(ymd: string): Date {
  const [y, m, d] = ymd.split("-").map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1, 0, 0, 0, 0);
}

function isoToday() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function addDays(ymd: string, days: number) {
  const d = parseYmd(ymd);
  d.setDate(d.getDate() + days);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function daysBetween(aYmd: string, bYmd: string) {
  const a = parseYmd(aYmd);
  const b = parseYmd(bYmd);
  const ms = b.getTime() - a.getTime();
  return Math.round(ms / 86400000);
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function safeKey(...parts: Array<string | null | undefined>) {
  return parts.map((p) => (p ?? "").trim().toLowerCase()).join("|");
}

function safeDate(val: any): Date | null {
  if (!val) return null;

  if (typeof val === "string" && /^\d{4}-\d{2}-\d{2}$/.test(val)) {
    const d = parseYmd(val);
    return Number.isNaN(d.getTime()) ? null : d;
  }

  const d = new Date(val);
  return Number.isNaN(d.getTime()) ? null : d;
}

function toYmd(val: any): string | null {
  const d = safeDate(val);
  if (!d) return null;
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Mon=1..Sun=7 */
function dow1to7(ymd: string) {
  const date = parseYmd(ymd);
  return ((date.getDay() + 6) % 7) + 1;
}

/** Sun=0..Sat=6 */
function dow0to6(ymd: string) {
  return parseYmd(ymd).getDay();
}

function dom(ymd: string) {
  return parseYmd(ymd).getDate();
}

type Frequency = "daily" | "weekly" | "monthly";

function isDueOn(
  t: { frequency: Frequency; weekday: number | null; month_day: number | null },
  ymd: string
) {
  switch (t.frequency) {
    case "daily":
      return true;
    case "weekly":
      return t.weekday === dow1to7(ymd) || t.weekday === dow0to6(ymd);
    case "monthly":
      return t.month_day === dom(ymd);
    default:
      return false;
  }
}

type LocationDayStatus = {
  isOpen: boolean;
  source: "default" | "weekly_schedule" | "closure_override";
};

async function resolveOrgIdForCurrentUser(sb: Awaited<ReturnType<typeof getServerSupabase>>) {
  const {
    data: { user },
    error: userErr,
  } = await sb.auth.getUser();

  if (userErr || !user) {
    throw new Error("Not authenticated.");
  }

  const { data: profile, error: profileErr } = await sb
    .from("profiles")
    .select("org_id")
    .eq("id", user.id)
    .maybeSingle();

  if (profileErr) throw new Error(profileErr.message);

  const orgId = profile?.org_id ? String(profile.org_id) : null;
  if (!orgId) throw new Error("No organisation found for current user.");

  return { userId: user.id, orgId };
}

async function getLocationDayStatus(
  sb: Awaited<ReturnType<typeof getServerSupabase>>,
  orgId: string,
  locationId: string | null,
  dateISO: string
): Promise<LocationDayStatus> {
  if (!locationId) {
    return { isOpen: true, source: "default" };
  }

  try {
    const { data: closure, error: closureErr } = await sb
      .from("location_closures")
      .select("id")
      .eq("org_id", orgId)
      .eq("location_id", locationId)
      .eq("date", dateISO)
      .maybeSingle();

    if (!closureErr && closure) {
      return { isOpen: false, source: "closure_override" };
    }
  } catch {
    // ignore
  }

  const weekdayA = dow0to6(dateISO);
  const weekdayB = dow1to7(dateISO);

  try {
    const { data: rows, error } = await sb
      .from("location_opening_days")
      .select("weekday, is_open")
      .eq("org_id", orgId)
      .eq("location_id", locationId)
      .in("weekday", [weekdayA, weekdayB]);

    if (!error && Array.isArray(rows) && rows.length > 0) {
      const exactA = rows.find((r: any) => Number(r.weekday) === weekdayA);
      const exactB = rows.find((r: any) => Number(r.weekday) === weekdayB);
      const row = exactA ?? exactB ?? rows[0];

      return {
        isOpen: row?.is_open !== false,
        source: "weekly_schedule",
      };
    }
  } catch {
    // ignore
  }

  return { isOpen: true, source: "default" };
}

async function getOpenDatesInRange(
  sb: Awaited<ReturnType<typeof getServerSupabase>>,
  orgId: string,
  locationId: string | null,
  from: string,
  to: string
): Promise<string[]> {
  const span = clamp(daysBetween(from, to) + 1, 0, 366);
  const allDates: string[] = [];

  for (let i = 0; i < span; i++) {
    allDates.push(addDays(from, i));
  }

  if (!locationId) {
    return allDates;
  }

  const weekdayMap = new Map<number, boolean>();

  try {
    const [{ data: closuresRaw }, { data: openingDaysRaw }] = await Promise.all([
      sb
        .from("location_closures")
        .select("date")
        .eq("org_id", orgId)
        .eq("location_id", locationId)
        .gte("date", from)
        .lte("date", to),
      sb
        .from("location_opening_days")
        .select("weekday, is_open")
        .eq("org_id", orgId)
        .eq("location_id", locationId),
    ]);

    const closureSet = new Set<string>(
      ((closuresRaw ?? []) as any[]).map((r) => String(r.date).slice(0, 10))
    );

    for (const row of (openingDaysRaw ?? []) as any[]) {
      weekdayMap.set(Number(row.weekday), row.is_open !== false);
    }

    return allDates.filter((dateISO) => {
      if (closureSet.has(dateISO)) return false;

      if (weekdayMap.size === 0) return true;

      const weekdayA = dow0to6(dateISO);
      const weekdayB = dow1to7(dateISO);

      if (weekdayMap.has(weekdayA)) return weekdayMap.get(weekdayA) === true;
      if (weekdayMap.has(weekdayB)) return weekdayMap.get(weekdayB) === true;

      return true;
    });
  } catch {
    const dates: string[] = [];
    for (const d of allDates) {
      const status = await getLocationDayStatus(sb, orgId, locationId, d);
      if (status.isOpen) dates.push(d);
    }
    return dates;
  }
}

/* =========================
   Expanded summary types
========================= */

export type FourWeekTempRepeat = {
  key: string;
  area: string;
  item: string;
  count: number;
  lastSeenOn: string;
};

export type FourWeekMissedClean = {
  taskId: string;
  task: string;
  category: string | null;
  area: string | null;
  missedCount: number;
  lastMissedOn: string;
};

export type FourWeekTrainingDrift = {
  staffName: string;
  staffInitials: string | null;
  type: string;
  expiresOn: string;
  daysLeft: number;
  status: "expired" | "due_soon";
};

export type FourWeekLoggedIncident = {
  id: string;
  happenedOn: string | null;
  createdAt: string | null;
  type: string | null;
  createdBy: string | null;
  details: string | null;
  immediateAction: string | null;
  preventiveAction: string | null;
};

export type FourWeekTempFailureTrail = {
  id: string;
  happenedOn: string | null;
  createdAt: string | null;
  createdBy: string | null;
  details: string | null;
  correctiveAction: string | null;
};

export type FourWeekSignoffTrail = {
  id: string;
  signoffOn: string;
  signedBy: string | null;
  notes: string | null;
  createdAt: string | null;
};

export type FourWeekCleaningRunTrail = {
  id: string;
  runOn: string;
  doneAt: string | null;
  doneBy: string | null;
  category: string;
  task: string;
};

export type FourWeekAllergenChange = {
  id: string;
  createdAt: string | null;
  itemName: string | null;
  action: string | null;
  staffInitials: string | null;
};

export type FourWeekStaffQcReview = {
  id: string;
  reviewedOn: string;
  createdAt: string | null;
  staffName: string;
  staffInitials: string | null;
  reviewer: string | null;
  rating: number;
  notes: string | null;
};

export type FourWeekStaffAbsence = {
  id: string;
  teamMemberName: string;
  teamMemberInitials: string | null;
  absenceType: string | null;
  startDate: string;
  endDate: string;
  isHalfDay: boolean;
  halfDayPeriod: string | null;
  locationName: string | null;
  status: string | null;
  notes: string | null;
  operationalImpact: string | null;
  createdAt: string | null;
};

export type FourWeekTrainingRecord = {
  id: string;
  staffName: string;
  staffInitials: string | null;
  staffEmail: string | null;
  type: string | null;
  awardedOn: string | null;
  expiresOn: string | null;
  daysUntil: number | null;
  status: "valid" | "expired" | "no-expiry";
  notes: string | null;
  certificateUrl: string | null;
};

export type FourWeekTrainingAreaCoverage = {
  memberId: string;
  name: string;
  initials: string | null;
  email: string | null;
  area: string;
  selected: boolean;
  awardedOn: string | null;
  expiresOn: string | null;
  daysUntil: number | null;
  status: "green" | "amber" | "red" | "unknown";
};

export type FourWeekCalibrationTrail = {
  id: string;
  checkedOn: string;
  staffInitials: string;
  coldStorageChecked: boolean;
  probesChecked: boolean;
  thermometersChecked: boolean;
  allEquipmentCalibrated: boolean;
  notes: string | null;
  createdAt: string | null;
};

export type FourWeekHygieneSnapshot = {
  rating: number | null;
  visitDate: string | null;
  certificateExpiresAt: string | null;
  issuingAuthority: string | null;
  reference: string | null;
};

export type FourWeekHygieneHistoryRow = {
  id: string;
  rating: number | null;
  visitDate: string | null;
  certificateExpiresAt: string | null;
  issuingAuthority: string | null;
  reference: string | null;
  notes: string | null;
  createdAt: string | null;
};

export type FourWeekSummary = {
  period: { from: string; to: string; days: number; locationId?: string | null };

  rangeLabel: string;
  compliantDays: number;
  totalDays: number;

  tempLogs: number;
  tempFails: number;

  cleaningDone: number;
  cleaningTotal: number | null;

  trainingDueSoon: number;
  trainingOver: number;
  trainingAssigned: number;
  trainingInProgress: number;

  allergenDueSoon: number;
  allergenOver: number;

  incidents: number;

  signoffsDone: number;
  signoffsExpected: number | null;

  calibrationChecks: number;
  calibrationDue: boolean;

  staffOffToday: number;
  staffAbsencesLast30Days: number;

  managerQcReviews: number;
  managerQcAverage: number | null;

  topMissedAreas: Array<{ area: string; missed: number }>;
  topIssues: Array<{ label: string; count: number; tone?: "good" | "warn" | "bad" | "neutral" }>;

  temperature: {
    total: number;
    fails: number;
    failRatePct: number;
    repeatFailures: FourWeekTempRepeat[];
    recentLogs: LogRow[];
    recentFailures: FourWeekTempFailureTrail[];
  };

  cleaning: {
    dueTotal: number;
    completedTotal: number;
    missedTotal: number;
    repeatMisses: FourWeekMissedClean[];
    recentRuns: FourWeekCleaningRunTrail[];
    categoryProgress: CleaningCategoryProgress[];
  };

  training: {
    expired: number;
    dueSoon: number;
    drift: FourWeekTrainingDrift[];
    records: FourWeekTrainingRecord[];
    areaCoverage: FourWeekTrainingAreaCoverage[];
  };

  allergens: {
    dueSoon: number;
    overdue: number;
    recentChanges: FourWeekAllergenChange[];
    recentReviews: Array<{
      id: string;
      reviewedOn: string | null;
      nextDue: string | null;
      reviewer: string | null;
      daysUntil: number | null;
    }>;
  };

  incidentsLog: {
    total: number;
    recent: FourWeekLoggedIncident[];
  };

  signoffs: {
    total: number;
    expected: number | null;
    recent: FourWeekSignoffTrail[];
  };

  staffAbsences: {
    total: number;
    today: number;
    last30Days: number;
    recent: FourWeekStaffAbsence[];
  };

  managerQc: {
    total: number;
    averageRating: number | null;
    recent: FourWeekStaffQcReview[];
  };

  calibration: {
    total: number;
    due: boolean;
    recent: FourWeekCalibrationTrail[];
  };

  hygiene: {
    latest: FourWeekHygieneSnapshot | null;
    history: FourWeekHygieneHistoryRow[];
  };

  headline: string[];
  recommendations: string[];
};

type CleaningCategoryProgress = {
  category: string;
  done: number;
  total: number;
};

/* =========================
   Training area helpers
========================= */

const SFBB_AREAS = [
  "Cross-contamination",
  "Cleaning",
  "Chilling",
  "Cooking",
  "Allergens",
  "Management",
] as const;

type TrainingAreasValue =
  | null
  | undefined
  | string[]
  | Record<string, any>
  | Array<{
      area?: string;
      name?: string;
      awarded_on?: any;
      expires_on?: any;
      added_on?: any;
    }>;

function normaliseKey(raw: string): string {
  return raw
    .toLowerCase()
    .trim()
    .replaceAll("&", "and")
    .replace(/[^a-z0-9]+/g, "");
}

function canonicalAreaName(raw: string): (typeof SFBB_AREAS)[number] | null {
  const k = normaliseKey(raw);

  const map: Record<string, (typeof SFBB_AREAS)[number]> = {
    crosscontamination: "Cross-contamination",
    crosscontam: "Cross-contamination",
    cleaning: "Cleaning",
    clean: "Cleaning",
    hygiene: "Cleaning",
    sanitation: "Cleaning",
    chilling: "Chilling",
    chill: "Chilling",
    refrigeration: "Chilling",
    fridge: "Chilling",
    freezer: "Chilling",
    cooking: "Cooking",
    cook: "Cooking",
    hot: "Cooking",
    hotholding: "Cooking",
    reheating: "Cooking",
    allergens: "Allergens",
    allergen: "Allergens",
    allergy: "Allergens",
    management: "Management",
    manager: "Management",
    supervisory: "Management",
    supervision: "Management",
    admin: "Management",
  };

  if (map[k]) return map[k];

  if (k.includes("cross") && k.includes("contam")) return "Cross-contamination";
  if (k.includes("clean")) return "Cleaning";
  if (k.includes("chill") || k.includes("fridge") || k.includes("freez")) return "Chilling";
  if (k.includes("cook") || k.includes("hot") || k.includes("reheat")) return "Cooking";
  if (k.includes("allerg")) return "Allergens";
  if (k.includes("manage") || k.includes("supervis")) return "Management";

  return null;
}

function normaliseTrainingAreas(
  val: TrainingAreasValue
): Record<string, { awarded_on?: string; expires_on?: string }> {
  const out: Record<string, { awarded_on?: string; expires_on?: string }> = {};
  if (!val) return out;

  const setArea = (areaRaw: string, awarded: any, expires: any) => {
    const canon = canonicalAreaName(String(areaRaw ?? "").trim());
    if (!canon) return;
    out[canon] = {
      awarded_on: awarded ? toYmd(awarded) ?? undefined : undefined,
      expires_on: expires ? toYmd(expires) ?? undefined : undefined,
    };
  };

  if (Array.isArray(val) && val.every((x) => typeof x === "string")) {
    for (const area of val as string[]) setArea(area, null, null);
    return out;
  }

  if (Array.isArray(val)) {
    for (const item of val as any[]) {
      const area = String(item?.area ?? item?.name ?? "").trim();
      if (!area) continue;

      const awarded = item?.awarded_on ?? item?.added_on ?? null;
      const expires = item?.expires_on ?? null;
      setArea(area, awarded, expires);
    }
    return out;
  }

  if (typeof val === "object") {
    for (const [area, meta] of Object.entries(val as Record<string, any>)) {
      const awarded = (meta as any)?.awarded_on ?? (meta as any)?.added_on ?? null;
      const expires = (meta as any)?.expires_on ?? null;
      setArea(String(area), awarded, expires);
    }
    return out;
  }

  return out;
}

function computeTrainingStatus(awardedISO: string | null, expiresISO: string | null) {
  const today0 = parseYmd(isoToday());

  const awarded = safeDate(awardedISO);
  const expires = safeDate(expiresISO);

  let effectiveExpires: Date | null = expires;
  if (!effectiveExpires && awarded) {
    effectiveExpires = new Date(awarded);
    effectiveExpires.setDate(effectiveExpires.getDate() + 365);
  }

  if (!awarded && !effectiveExpires) {
    return {
      expires_on: null as string | null,
      days_until: null as number | null,
      status: "unknown" as "green" | "amber" | "red" | "unknown",
    };
  }

  const exp0 = effectiveExpires ? parseYmd(toYmd(effectiveExpires) ?? isoToday()) : null;
  const days_until = exp0 ? Math.round((exp0.getTime() - today0.getTime()) / 86400000) : null;

  if (days_until == null) {
    return { expires_on: null, days_until: null, status: "unknown" as const };
  }
  if (days_until < 0) {
    return { expires_on: toYmd(exp0), days_until, status: "red" as const };
  }
  if (days_until <= 30) {
    return { expires_on: toYmd(exp0), days_until, status: "amber" as const };
  }
  return { expires_on: toYmd(exp0), days_until, status: "green" as const };
}

/* =========================
   Main four-week summary
========================= */

export async function getFourWeeklyReview(
  opts: { to?: string; locationId?: string | null } = {}
): Promise<FourWeekSummary> {
  await requireUser();

  const sb = await getServerSupabase();
  const { orgId } = await resolveOrgIdForCurrentUser(sb);

  const to = (opts.to ?? isoToday()).slice(0, 10);
  const from = addDays(to, -27);
  const locationId = opts.locationId ?? null;

  const allDates: string[] = [];
  for (let i = 0; i < 28; i++) allDates.push(addDays(from, i));

  const openDates = await getOpenDatesInRange(sb, orgId, locationId, from, to);
  const reviewDates = locationId ? openDates : allDates;
  const reviewDateSet = new Set(reviewDates);

  const tempFromTs = `${from}T00:00:00.000Z`;
  const tempToTs = `${to}T23:59:59.999Z`;
 const soon = addDays(to, 30);
const allergenSoon = addDays(to, 10);
const today = to;
const last30Start = addDays(to, -29);

  /* ---------- 1) Temperature trends ---------- */
  let tQ = sb
    .from("food_temp_logs")
    .select("id,at,area,note,target_key,staff_initials,temp_c,status,location_id,org_id")
    .eq("org_id", orgId)
    .gte("at", tempFromTs)
    .lte("at", tempToTs)
    .order("at", { ascending: false });

  if (locationId) tQ = tQ.eq("location_id", locationId);

  const { data: tempLogsRaw, error: tErr } = await tQ;
  if (tErr) throw new Error(tErr.message);

  const tempRows = ((tempLogsRaw ?? []) as any[]).filter((r) =>
    reviewDateSet.has(String(r.at ?? "").slice(0, 10))
  );

  const totalTemps = tempRows.length;
  const fails = tempRows.filter((r) => String(r.status ?? "").toLowerCase() === "fail").length;
  const failRate = pct(fails, totalTemps);

  const tempLogsByDay = new Map<string, number>();
  const tempFailsByDay = new Map<string, number>();
  const failMap = new Map<string, { area: string; item: string; count: number; last: string }>();

  const recentTempLogs: LogRow[] = tempRows.slice(0, 25).map((r) => ({
    id: String(r.id),
    at: String(r.at),
    routine_id: null,
    routine_item_id: null,
    area: r.area ?? null,
    note: r.note ?? null,
    target_key: r.target_key ?? null,
    staff_initials: r.staff_initials ?? null,
    temp_c: r.temp_c != null ? Number(r.temp_c) : null,
    status: r.status ?? null,
    location_id: r.location_id ? String(r.location_id) : null,
  }));

  for (const r of tempRows) {
    const ymd = String(r.at ?? "").slice(0, 10) || to;
    tempLogsByDay.set(ymd, (tempLogsByDay.get(ymd) ?? 0) + 1);

    if (String(r.status ?? "").toLowerCase() !== "fail") continue;

    tempFailsByDay.set(ymd, (tempFailsByDay.get(ymd) ?? 0) + 1);

    const area = (r.area ?? "—").toString();
    const item = (r.note ?? "—").toString();
    const key = safeKey(area, item, r.target_key ?? "");

    const cur = failMap.get(key);
    if (!cur) {
      failMap.set(key, { area, item, count: 1, last: ymd });
    } else {
      cur.count += 1;
      if (ymd > cur.last) cur.last = ymd;
    }
  }

  const repeatFailures: FourWeekTempRepeat[] = Array.from(failMap.entries())
    .filter(([, v]) => v.count >= 2)
    .sort((a, b) => b[1].count - a[1].count || (b[1].last < a[1].last ? -1 : 1))
    .slice(0, 10)
    .map(([k, v]) => ({
      key: k,
      area: v.area,
      item: v.item,
      count: v.count,
      lastSeenOn: v.last,
    }));

  const failedTempLogIds = tempRows
    .filter((r) => String(r.status ?? "").toLowerCase() === "fail")
    .map((r) => String(r.id));

  let recentTempFailures: FourWeekTempFailureTrail[] = [];
  if (failedTempLogIds.length > 0) {
    let caQ = sb
      .from("food_temp_corrective_actions")
      .select(
        "id,temp_log_id,action,recheck_temp_c,recheck_at,recheck_status,recorded_by,created_at,location_id"
      )
      .eq("org_id", orgId)
      .in("temp_log_id", failedTempLogIds)
      .limit(5000);

    if (locationId) caQ = caQ.eq("location_id", locationId);

    const { data: caRows, error: caErr } = await caQ;
    if (caErr) throw new Error(caErr.message);

    const byLog = new Map<string, any>();
    for (const row of (caRows ?? []) as any[]) {
      const key = String(row.temp_log_id);
      const existing = byLog.get(key);
      if (!existing) {
        byLog.set(key, row);
        continue;
      }
      const a = safeDate(existing.created_at)?.getTime() ?? 0;
      const b = safeDate(row.created_at)?.getTime() ?? 0;
      if (b >= a) byLog.set(key, row);
    }

    recentTempFailures = tempRows
      .filter((r) => String(r.status ?? "").toLowerCase() === "fail")
      .slice(0, 25)
      .map((l) => {
        const ca = byLog.get(String(l.id)) ?? null;
        const atISO = l.at ? String(l.at) : null;
        const happenedOn = toYmd(atISO);
        const tempVal = l.temp_c != null ? `${Number(l.temp_c)}°C` : "—";
        const target = l.target_key ? String(l.target_key) : "—";
        const details = `${l.area ?? "—"} • ${l.note ?? "—"} • ${tempVal} (target ${target})`;

        let correctiveAction = ca?.action ? String(ca.action) : null;
        if (ca?.recheck_temp_c != null) {
          const reT = `${Number(ca.recheck_temp_c)}°C`;
          const reAt = ca.recheck_at ? String(ca.recheck_at) : null;
          const reStatus = ca.recheck_status ? String(ca.recheck_status) : "—";
          const suffix = `Re-check: ${reT} (${reStatus})${reAt ? ` at ${reAt}` : ""}`;
          correctiveAction = correctiveAction ? `${correctiveAction} • ${suffix}` : suffix;
        }

        return {
          id: `temp_fail_${String(l.id)}`,
          happenedOn,
          createdAt: atISO,
          createdBy: (ca?.recorded_by ?? l.staff_initials ?? null)
            ? String(ca?.recorded_by ?? l.staff_initials)
            : null,
          details,
          correctiveAction,
        };
      });
  }

  /* ---------- 2) Cleaning missed / completed ---------- */
  let taskQ = sb
    .from("cleaning_tasks")
    .select("id,task,area,category,frequency,weekday,month_day,location_id,org_id")
    .eq("org_id", orgId);

  if (locationId) {
    taskQ = taskQ.or(`location_id.eq.${locationId},location_id.is.null`);
  }

  const { data: tasksRaw, error: cErr } = await taskQ;
  if (cErr) throw new Error(cErr.message);

  const tasks = (tasksRaw ?? []) as any[];

  let runQ = sb
    .from("cleaning_task_runs")
    .select("id,task_id,run_on,done_by,done_at,location_id,org_id")
    .eq("org_id", orgId)
    .gte("run_on", from)
    .lte("run_on", to);

  if (locationId) runQ = runQ.eq("location_id", locationId);

  const { data: runsRaw, error: rErr } = await runQ;
  if (rErr) throw new Error(rErr.message);

  const runs = (runsRaw ?? []) as any[];
  const runsKey = new Set<string>();

  for (const r of runs) {
    const ymd = String(r.run_on).slice(0, 10);
    if (!reviewDateSet.has(ymd)) continue;
    runsKey.add(`${r.task_id}|${ymd}`);
  }

  let deferralQ = sb
    .from("cleaning_task_deferrals")
    .select("task_id,from_on,to_on,location_id,org_id")
    .eq("org_id", orgId)
    .gte("from_on", from)
    .lte("from_on", to);

  if (locationId) deferralQ = deferralQ.eq("location_id", locationId);

  const { data: deferralsRaw } = await deferralQ;
  const deferrals = (deferralsRaw ?? []) as any[];

  const deferralsFromMap = new Map<string, Set<string>>();
  const deferralsToMap = new Map<string, Set<string>>();

  for (const d of deferrals) {
    const fromKey = String(d.from_on).slice(0, 10);
    const toKey = String(d.to_on).slice(0, 10);
    const taskId = String(d.task_id);

    if (!deferralsFromMap.has(fromKey)) deferralsFromMap.set(fromKey, new Set());
    if (!deferralsToMap.has(toKey)) deferralsToMap.set(toKey, new Set());

    deferralsFromMap.get(fromKey)!.add(taskId);
    deferralsToMap.get(toKey)!.add(taskId);
  }

  function isDueEffective(
    t: { id: string; frequency: Frequency; weekday: number | null; month_day: number | null },
    ymd: string
  ) {
    const deferredFrom = deferralsFromMap.get(ymd)?.has(t.id) ?? false;
    const deferredTo = deferralsToMap.get(ymd)?.has(t.id) ?? false;

    if (deferredFrom) return false;
    if (deferredTo) return true;

    return isDueOn(t, ymd);
  }

  let dueTotal = 0;
  let completedTotal = 0;

  const cleaningDueByDay = new Map<string, number>();
  const cleaningCompletedByDay = new Map<string, number>();

  const missedMap = new Map<
    string,
    { task: string; category: string | null; area: string | null; missed: number; last: string }
  >();

  const categoryProgressMap = new Map<string, { done: number; total: number }>();

  for (const d of reviewDates) {
    const dueToday = tasks.filter((t) =>
      isDueEffective(
        {
          id: String(t.id),
          frequency: (t.frequency ?? "daily") as Frequency,
          weekday: t.weekday != null ? Number(t.weekday) : null,
          month_day: t.month_day != null ? Number(t.month_day) : null,
        },
        d
      )
    );

    cleaningDueByDay.set(d, dueToday.length);
    dueTotal += dueToday.length;

    let completedToday = 0;

    for (const t of dueToday) {
      const key = `${t.id}|${d}`;
      const done = runsKey.has(key);
      const cat = String(t.category ?? "Uncategorised");
      const catCur = categoryProgressMap.get(cat) ?? { done: 0, total: 0 };
      catCur.total += 1;

      if (done) {
        completedTotal += 1;
        completedToday += 1;
        catCur.done += 1;
      } else {
        const cur = missedMap.get(String(t.id));
        if (!cur) {
          missedMap.set(String(t.id), {
            task: (t.task ?? "").toString(),
            category: t.category ?? null,
            area: t.area ?? null,
            missed: 1,
            last: d,
          });
        } else {
          cur.missed += 1;
          if (d > cur.last) cur.last = d;
        }
      }

      categoryProgressMap.set(cat, catCur);
    }

    cleaningCompletedByDay.set(d, completedToday);
  }

  const missedTotal = clamp(dueTotal - completedTotal, 0, Number.MAX_SAFE_INTEGER);

  const repeatMisses: FourWeekMissedClean[] = Array.from(missedMap.entries())
    .filter(([, v]) => v.missed >= 2)
    .sort((a, b) => b[1].missed - a[1].missed || (b[1].last < a[1].last ? -1 : 1))
    .slice(0, 10)
    .map(([taskId, v]) => ({
      taskId,
      task: v.task || "—",
      category: v.category,
      area: v.area,
      missedCount: v.missed,
      lastMissedOn: v.last,
    }));

  const topMissedAreas = Array.from(
    repeatMisses.reduce((acc, row) => {
      const area = row.area ?? row.category ?? "Other";
      acc.set(area, (acc.get(area) ?? 0) + row.missedCount);
      return acc;
    }, new Map<string, number>())
  )
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([area, missed]) => ({ area, missed }));

  const cleaningCategoryProgress: CleaningCategoryProgress[] = Array.from(categoryProgressMap.entries())
    .map(([category, v]) => ({
      category,
      done: v.done,
      total: v.total,
    }))
    .sort((a, b) => a.category.localeCompare(b.category));

  const taskMap = new Map<string, { task: string; category: string }>();
  for (const t of tasks) {
    taskMap.set(String(t.id), {
      task: String(t.task ?? "—"),
      category: String(t.category ?? "Uncategorised"),
    });
  }

  const recentCleaningRuns: FourWeekCleaningRunTrail[] = runs
    .filter((r) => reviewDateSet.has(String(r.run_on).slice(0, 10)))
    .slice(0, 25)
    .map((r) => {
      const meta = taskMap.get(String(r.task_id)) ?? { task: "—", category: "Uncategorised" };
      return {
        id: String(r.id),
        runOn: String(r.run_on),
        doneAt: r.done_at ? String(r.done_at) : null,
        doneBy: r.done_by ? String(r.done_by) : null,
        category: meta.category,
        task: meta.task,
      };
    });

  /* ---------- 3) Sign-offs ---------- */
  let signoffQ = sb
    .from("daily_signoffs")
    .select("id,signoff_on,signed_by,notes,created_at,location_id,org_id")
    .eq("org_id", orgId)
    .gte("signoff_on", from)
    .lte("signoff_on", to)
    .order("signoff_on", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(3000);

  if (locationId) signoffQ = signoffQ.eq("location_id", locationId);

  const { data: signoffRowsRaw, error: signoffErr } = await signoffQ;
  if (signoffErr) throw new Error(signoffErr.message);

  const signoffRows = (signoffRowsRaw ?? []) as any[];
  const signoffDays = new Set(
    signoffRows
      .map((r) => String(r.signoff_on).slice(0, 10))
      .filter((d) => reviewDateSet.has(d))
  );

  const signoffsDone = signoffDays.size;
  const signoffsExpected = reviewDates.length;

  const recentSignoffs: FourWeekSignoffTrail[] = signoffRows
    .filter((r) => reviewDateSet.has(String(r.signoff_on).slice(0, 10)))
    .slice(0, 25)
    .map((r) => ({
      id: String(r.id),
      signoffOn: String(r.signoff_on),
      signedBy: r.signed_by ? String(r.signed_by) : null,
      notes: r.notes ? String(r.notes) : null,
      createdAt: r.created_at ? String(r.created_at) : null,
    }));

  /* ---------- 4) Incidents ---------- */
  let incidentQ = sb
    .from("incidents")
    .select(
      "id,happened_on,type,details,immediate_action,preventive_action,created_by,created_at,location_id,org_id"
    )
    .eq("org_id", orgId)
    .gte("happened_on", from)
    .lte("happened_on", to)
    .order("happened_on", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(3000);

  if (locationId) incidentQ = incidentQ.eq("location_id", locationId);

  const { data: incidentRowsRaw, error: incidentErr } = await incidentQ;
  if (incidentErr) throw new Error(incidentErr.message);

  const incidentRows = ((incidentRowsRaw ?? []) as any[]).filter((r) =>
    reviewDateSet.has(String(r.happened_on).slice(0, 10))
  );

  const incidents = incidentRows.length;

  const recentLoggedIncidents: FourWeekLoggedIncident[] = incidentRows.slice(0, 25).map((r) => ({
    id: String(r.id),
    happenedOn: r.happened_on ? String(r.happened_on) : null,
    createdAt: r.created_at ? String(r.created_at) : null,
    type: r.type ? String(r.type) : null,
    createdBy: r.created_by ? String(r.created_by) : null,
    details: r.details ? String(r.details) : null,
    immediateAction: r.immediate_action ? String(r.immediate_action) : null,
    preventiveAction: r.preventive_action ? String(r.preventive_action) : null,
  }));

  /* ---------- 5) Training drift + full training report data ---------- */
  let expired = 0;
  let dueSoon = 0;
  let trainingAssigned = 0;
  let trainingInProgress = 0;
  let drift: FourWeekTrainingDrift[] = [];

  let trainingQuery = sb
    .from("trainings")
    .select(
      `
      id,
      type,
      status,
      expires_on,
      awarded_on,
      certificate_url,
      notes,
      team_member_id,
      team_member:team_members!trainings_team_member_id_fkey(
        name,
        initials,
        email,
        location_id
      )
    `
    )
    .eq("org_id", orgId)
    .order("expires_on", { ascending: true });

  if (locationId) {
    trainingQuery = trainingQuery.eq("team_member.location_id", locationId);
  }

  const { data: trainingsRaw, error: trErr } = await trainingQuery;
  if (trErr) throw new Error(trErr.message);

  const trainingRows = (trainingsRaw ?? []) as any[];
  const recentTrainingRecords: FourWeekTrainingRecord[] = [];

  for (const row of trainingRows) {
    const status = String(row.status ?? "").toLowerCase();

    if (status === "assigned" || status === "invited") {
      trainingAssigned += 1;
    } else if (status === "in_progress") {
      trainingInProgress += 1;
    }

    if (status !== "cancelled") {
      const exp = String(row.expires_on ?? "").slice(0, 10);
      if (exp) {
        const staffName = (row.team_member?.name ?? "—").toString();
        const staffInitials = row.team_member?.initials ?? null;
        const type = (row.type ?? "Training").toString();

        if (status === "expired" || exp < today) {
          expired += 1;
          drift.push({
            staffName,
            staffInitials,
            type,
            expiresOn: exp,
            daysLeft: -Math.abs(daysBetween(exp, today)),
            status: "expired",
          });
        } else if (exp <= soon) {
          dueSoon += 1;
          drift.push({
            staffName,
            staffInitials,
            type,
            expiresOn: exp,
            daysLeft: daysBetween(today, exp),
            status: "due_soon",
          });
        }
      }
    }

    const awarded = safeDate(row.awarded_on);
    const expiresDt = safeDate(row.expires_on);

    let daysUntil: number | null = null;
    let recordStatus: FourWeekTrainingRecord["status"] = "no-expiry";

    if (expiresDt) {
      const exp0 = parseYmd(toYmd(expiresDt) ?? today);
      daysUntil = Math.round((exp0.getTime() - parseYmd(today).getTime()) / 86400000);
      recordStatus = daysUntil < 0 ? "expired" : "valid";
    }

    recentTrainingRecords.push({
      id: String(row.id),
      staffName: row.team_member?.name ?? "—",
      staffInitials: row.team_member?.initials ?? null,
      staffEmail: row.team_member?.email ?? null,
      type: row.type ?? null,
      awardedOn: awarded ? awarded.toISOString() : null,
      expiresOn: expiresDt ? expiresDt.toISOString() : null,
      daysUntil,
      status: recordStatus,
      notes: row.notes ?? null,
      certificateUrl: row.certificate_url ?? null,
    });
  }

  drift.sort((a, b) =>
    a.status === b.status ? a.daysLeft - b.daysLeft : a.status === "expired" ? -1 : 1
  );
  drift = drift.slice(0, 15);

  /* ---------- 6) Training area coverage ---------- */
  let trainingAreaMembersQ = sb
    .from("team_members")
    .select("id,name,initials,email,active,training_areas,location_id")
    .eq("org_id", orgId)
    .eq("active", true)
    .order("name", { ascending: true })
    .limit(5000);

  if (locationId) trainingAreaMembersQ = trainingAreaMembersQ.eq("location_id", locationId);

  const { data: trainingAreaMembersRaw } = await trainingAreaMembersQ;
  const trainingAreaCoverage: FourWeekTrainingAreaCoverage[] = [];

  for (const m of (trainingAreaMembersRaw ?? []) as any[]) {
    const memberId = String(m.id);
    const name = String(m.name ?? "—");
    const initials = m.initials ? String(m.initials) : null;
    const email = m.email ? String(m.email) : null;

    const normal = normaliseTrainingAreas(m.training_areas as TrainingAreasValue);

    for (const area of SFBB_AREAS) {
      const areaKey = String(area);
      const selected = Object.prototype.hasOwnProperty.call(normal, areaKey);
      const meta = selected ? (normal[areaKey] ?? {}) : {};
      const awardedOn = meta.awarded_on ?? null;
      const expiresOnIn = meta.expires_on ?? null;
      const computed = computeTrainingStatus(awardedOn, expiresOnIn);

      trainingAreaCoverage.push({
        memberId,
        name,
        initials,
        email,
        area: areaKey,
        selected,
        awardedOn,
        expiresOn: computed.expires_on,
        daysUntil: computed.days_until,
        status: computed.status,
      });
    }
  }

  /* ---------- 7) Allergen review drift + logs ---------- */
  let allergenDueSoon = 0;
  let allergenOver = 0;

  const { data: allergenRowsRaw } = await sb
    .from("allergen_review")
    .select("id,last_reviewed,interval_days,reviewer,org_id,created_at")
    .eq("org_id", orgId)
    .order("created_at", { ascending: false })
    .limit(500);

  const recentAllergenReviews: Array<{
    id: string;
    reviewedOn: string | null;
    nextDue: string | null;
    reviewer: string | null;
    daysUntil: number | null;
  }> = [];

  for (const row of (allergenRowsRaw ?? []) as any[]) {
    const last = safeDate(row.last_reviewed);
    const intervalDays = Number(row.interval_days ?? 0);

    let nextDue: string | null = null;
    let daysUntil: number | null = null;

    if (last && Number.isFinite(intervalDays) && intervalDays > 0) {
      const due = new Date(last);
      due.setDate(due.getDate() + intervalDays);
      nextDue = toYmd(due);

     if (nextDue) {
  if (nextDue < today) allergenOver += 1;
  else if (nextDue <= allergenSoon) allergenDueSoon += 1;

  daysUntil = daysBetween(today, nextDue);
}
    }

    recentAllergenReviews.push({
      id: String(row.id),
      reviewedOn: last ? last.toISOString() : null,
      nextDue,
      reviewer: row.reviewer ?? null,
      daysUntil,
    });
  }

  let allergenChangesQ = sb
    .from("allergen_change_logs")
    .select("id,created_at,item_name,action,staff_initials,org_id,location_id")
    .eq("org_id", orgId)
    .gte("created_at", tempFromTs)
    .lte("created_at", tempToTs)
    .order("created_at", { ascending: false })
    .limit(500);

  if (locationId) allergenChangesQ = allergenChangesQ.eq("location_id", locationId);

  const { data: allergenChangesRaw, error: allergenChangesErr } = await allergenChangesQ;
  if (allergenChangesErr) throw new Error(allergenChangesErr.message);

  const recentAllergenChanges: FourWeekAllergenChange[] = ((allergenChangesRaw ?? []) as any[])
    .slice(0, 25)
    .map((r) => ({
      id: String(r.id),
      createdAt: r.created_at ? String(r.created_at) : null,
      itemName: r.item_name ?? null,
      action: r.action ?? null,
      staffInitials: r.staff_initials ?? null,
    }));

  /* ---------- 8) Staff absences ---------- */
  let staffAbsenceQ = sb
    .from("staff_absences")
    .select(
      `
      id,
      absence_type,
      start_date,
      end_date,
      is_half_day,
      half_day_period,
      status,
      notes,
      operational_impact,
      created_at,
      location_id,
      team_members:team_member_id (
        name,
        initials
      ),
      locations:location_id (
        name
      )
    `
    )
    .eq("org_id", orgId)
    .lte("start_date", to)
    .gte("end_date", from)
    .order("start_date", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(3000);

  if (locationId) {
    staffAbsenceQ = staffAbsenceQ.or(`location_id.eq.${locationId},location_id.is.null`);
  }

  const { data: staffAbsencesRaw, error: absenceErr } = await staffAbsenceQ;
  if (absenceErr) throw new Error(absenceErr.message);

  const staffAbsencesRows: FourWeekStaffAbsence[] = ((staffAbsencesRaw ?? []) as any[]).map((r) => ({
    id: String(r.id),
    teamMemberName: r.team_members?.name ?? "—",
    teamMemberInitials: r.team_members?.initials ?? null,
    absenceType: r.absence_type ? String(r.absence_type) : null,
    startDate: String(r.start_date),
    endDate: String(r.end_date),
    isHalfDay: Boolean(r.is_half_day),
    halfDayPeriod: r.half_day_period ? String(r.half_day_period) : null,
    locationName: r.locations?.name ?? null,
    status: r.status ? String(r.status) : null,
    notes: r.notes ? String(r.notes) : null,
    operationalImpact: r.operational_impact ? String(r.operational_impact) : null,
    createdAt: r.created_at ? String(r.created_at) : null,
  }));

  const staffOffToday = staffAbsencesRows.filter(
    (r) => String(r.status ?? "").toLowerCase() === "approved" && r.startDate <= to && r.endDate >= to
  ).length;

  const staffAbsencesLast30Days = staffAbsencesRows.filter(
    (r) =>
      String(r.status ?? "").toLowerCase() === "approved" &&
      r.endDate >= last30Start &&
      r.startDate <= to
  ).length;

  /* ---------- 9) Manager QC ---------- */
  let qcQ = sb
    .from("staff_qc_reviews")
    .select(
      `
      id,
      reviewed_on,
      created_at,
      rating,
      notes,
      location_id,
      staff:team_members!staff_qc_reviews_staff_fkey (
        name,
        initials
      ),
      manager:team_members!staff_qc_reviews_manager_fkey (
        name,
        initials
      )
    `
    )
    .eq("org_id", orgId)
    .gte("reviewed_on", from)
    .lte("reviewed_on", to)
    .order("reviewed_on", { ascending: false })
    .order("created_at", { ascending: false });

  if (locationId) qcQ = qcQ.eq("location_id", locationId);

  const { data: qcRaw, error: qcErr } = await qcQ;
  if (qcErr) throw new Error(qcErr.message);

  const qcRows: FourWeekStaffQcReview[] = ((qcRaw ?? []) as any[]).map((r) => ({
    id: String(r.id),
    reviewedOn: toYmd(r.reviewed_on) ?? to,
    createdAt: r.created_at ? String(r.created_at) : null,
    staffName: r.staff?.name ?? "—",
    staffInitials: r.staff?.initials ?? null,
    reviewer: r.manager?.initials ?? r.manager?.name ?? "—",
    rating: Number(r.rating ?? 0),
    notes: r.notes ?? null,
  }));

  const managerQcReviews = qcRows.length;
  const managerQcAverage =
    managerQcReviews > 0
      ? Math.round(
          (qcRows.reduce((acc, r) => acc + Number(r.rating || 0), 0) / managerQcReviews) * 10
        ) / 10
      : null;

  /* ---------- 10) Calibration ---------- */
  let calibrationChecks = 0;
  let calibrationDue = false;
  let recentCalibration: FourWeekCalibrationTrail[] = [];

  if (locationId) {
    const { data: calRowsRaw, error: calErr } = await sb
      .from("calibration_checks")
      .select(
        "id,checked_on,staff_initials,all_equipment_calibrated,notes,created_at,cold_storage_checked,probes_checked,thermometers_checked,org_id,location_id"
      )
      .eq("org_id", orgId)
      .eq("location_id", locationId)
      .gte("checked_on", from)
      .lte("checked_on", to)
      .order("checked_on", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(500);

    if (calErr) throw new Error(calErr.message);

    calibrationChecks = (calRowsRaw ?? []).length;
    recentCalibration = ((calRowsRaw ?? []) as any[]).slice(0, 25).map((r) => ({
      id: String(r.id),
      checkedOn: String(r.checked_on),
      staffInitials: String(r.staff_initials ?? "—"),
      coldStorageChecked: Boolean(r.cold_storage_checked),
      probesChecked: Boolean(r.probes_checked),
      thermometersChecked: Boolean(r.thermometers_checked),
      allEquipmentCalibrated:
        r.all_equipment_calibrated != null
          ? Boolean(r.all_equipment_calibrated)
          : Boolean(r.cold_storage_checked) &&
            Boolean(r.probes_checked) &&
            Boolean(r.thermometers_checked),
      notes: r.notes ? String(r.notes) : null,
      createdAt: r.created_at ? String(r.created_at) : null,
    }));

    const { data: latestCalRaw, error: latestCalErr } = await sb
      .from("calibration_checks")
      .select("checked_on,created_at,org_id,location_id")
      .eq("org_id", orgId)
      .eq("location_id", locationId)
      .order("checked_on", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (latestCalErr) throw new Error(latestCalErr.message);

    if (latestCalRaw?.checked_on) {
      const last = String(latestCalRaw.checked_on).slice(0, 10);
      calibrationDue = daysBetween(last, to) > 30;
    } else {
      calibrationDue = true;
    }
  }

  /* ---------- 11) Hygiene snapshot ---------- */
  let hygieneLatest: FourWeekHygieneSnapshot | null = null;
  let hygieneHistory: FourWeekHygieneHistoryRow[] = [];

  if (locationId) {
    const { data: hygieneRaw, error: hygieneErr } = await sb
      .from("food_hygiene_ratings")
      .select(
        "id,rating,visit_date,certificate_expires_at,issuing_authority,reference,notes,created_at"
      )
      .eq("org_id", orgId)
      .eq("location_id", locationId)
      .order("visit_date", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(50);

    if (!hygieneErr) {
      const rows = (hygieneRaw ?? []) as any[];
      hygieneHistory = rows.map((r) => ({
        id: String(r.id),
        rating: r.rating != null ? Number(r.rating) : null,
        visitDate: r.visit_date ? String(r.visit_date) : null,
        certificateExpiresAt: r.certificate_expires_at ? String(r.certificate_expires_at) : null,
        issuingAuthority: r.issuing_authority ? String(r.issuing_authority) : null,
        reference: r.reference ? String(r.reference) : null,
        notes: r.notes ? String(r.notes) : null,
        createdAt: r.created_at ? String(r.created_at) : null,
      }));

      if (rows[0]) {
        hygieneLatest = {
          rating: rows[0].rating != null ? Number(rows[0].rating) : null,
          visitDate: rows[0].visit_date ? String(rows[0].visit_date) : null,
          certificateExpiresAt: rows[0].certificate_expires_at
            ? String(rows[0].certificate_expires_at)
            : null,
          issuingAuthority: rows[0].issuing_authority ? String(rows[0].issuing_authority) : null,
          reference: rows[0].reference ? String(rows[0].reference) : null,
        };
      }
    }
  }

  /* ---------- 12) Daily compliance ---------- */
  let compliantDays = 0;

  for (const d of reviewDates) {
    const hasTemps = (tempLogsByDay.get(d) ?? 0) > 0;
    const hasTempFails = (tempFailsByDay.get(d) ?? 0) > 0;

    const due = cleaningDueByDay.get(d) ?? 0;
    const done = cleaningCompletedByDay.get(d) ?? 0;
    const cleaningOk = due === 0 || done >= due;

    const signoffOk = signoffDays.has(d);

    if (hasTemps && !hasTempFails && cleaningOk && signoffOk) {
      compliantDays += 1;
    }
  }

  /* ---------- 13) Summary text ---------- */
  const headline: string[] = [];
  headline.push(
    `Period: ${from} to ${to} (${reviewDates.length} review day${reviewDates.length === 1 ? "" : "s"}).`
  );
  headline.push(`Temperature checks: ${totalTemps} logged, ${fails} fails (${failRate}%).`);
  headline.push(`Cleaning tasks: ${dueTotal} due, ${completedTotal} completed, ${missedTotal} missed.`);
  headline.push(`Sign-offs: ${signoffsDone}/${signoffsExpected} recorded.`);
  headline.push(
    `Training: ${expired} expired, ${dueSoon} due soon, ${trainingAssigned} assigned, ${trainingInProgress} in progress.`
  );
  headline.push(`Allergens: ${allergenOver} overdue, ${allergenDueSoon} due soon.`);
  headline.push(`Incidents: ${incidents} logged.`);
  headline.push(`Manager QC: ${managerQcReviews} review${managerQcReviews === 1 ? "" : "s"} logged.`);
  headline.push(
    `Staff absence overlap: ${staffAbsencesRows.length} record${staffAbsencesRows.length === 1 ? "" : "s"} in period.`
  );
  if (locationId) {
    headline.push(
      `Calibration: ${calibrationChecks} check${calibrationChecks === 1 ? "" : "s"} logged, ${
        calibrationDue ? "due now" : "up to date"
      }.`
    );
  }

  const recommendations: string[] = [];
  if (repeatFailures.length) {
    recommendations.push(
      "Investigate repeat temperature failures and document corrective actions, equipment checks, and retraining."
    );
  }
  if (repeatMisses.length) {
    recommendations.push(
      "Fix repeated cleaning misses by reassigning ownership, adjusting task load, or improving prompts."
    );
  }
  if (signoffsDone < signoffsExpected) {
    recommendations.push(
      "Tighten day sign-off discipline so completed days are clearly reviewed and locked in."
    );
  }
  if (expired || dueSoon || trainingAssigned || trainingInProgress) {
    recommendations.push(
      "Review training drift now so overdue, assigned, and in-progress courses do not slide into inspection risk."
    );
  }
  if (allergenOver || allergenDueSoon) {
    recommendations.push(
      "Bring allergen reviews back under control so menu and recipe information stays current."
    );
  }
  if (managerQcAverage != null && managerQcAverage < 4) {
    recommendations.push(
      "Use manager QC results to coach weak spots before they become recurring inspection problems."
    );
  }
  if (staffOffToday > 0 || staffAbsencesLast30Days > 0) {
    recommendations.push(
      "Check staffing resilience and cover planning so absences do not knock cleaning, checks, or sign-offs off track."
    );
  }
  if (locationId && calibrationDue) {
    recommendations.push(
      "Log a calibration check now and keep a regular monthly rhythm for probes, thermometers, and cold storage."
    );
  }
  if (!recommendations.length) {
    recommendations.push("No major recurring issues detected. Keep doing the boring basics consistently.");
  }

  const topIssues: FourWeekSummary["topIssues"] = [];
  if (fails > 0) topIssues.push({ label: "Temperature fails", count: fails, tone: "bad" });
  if (missedTotal > 0) topIssues.push({ label: "Missed cleaning", count: missedTotal, tone: "warn" });
  if (signoffsDone < signoffsExpected) {
    topIssues.push({
      label: "Missing sign-offs",
      count: signoffsExpected - signoffsDone,
      tone: "warn",
    });
  }
  if (expired > 0) topIssues.push({ label: "Training overdue", count: expired, tone: "bad" });
  if (dueSoon > 0) topIssues.push({ label: "Training due soon", count: dueSoon, tone: "warn" });
  if (trainingAssigned > 0) {
    topIssues.push({ label: "Training assigned", count: trainingAssigned, tone: "warn" });
  }
  if (trainingInProgress > 0) {
    topIssues.push({ label: "Training in progress", count: trainingInProgress, tone: "warn" });
  }
  if (allergenOver > 0) {
    topIssues.push({ label: "Allergen reviews overdue", count: allergenOver, tone: "bad" });
  }
  if (allergenDueSoon > 0) {
    topIssues.push({ label: "Allergen reviews due soon", count: allergenDueSoon, tone: "warn" });
  }
  if (incidents > 0) topIssues.push({ label: "Incidents", count: incidents, tone: "warn" });
  if (staffOffToday > 0) {
    topIssues.push({ label: "Staff off today", count: staffOffToday, tone: "warn" });
  }
  if (locationId && calibrationDue) {
    topIssues.push({ label: "Calibration due", count: 1, tone: "warn" });
  }

  return {
    period: { from, to, days: reviewDates.length, locationId },
    rangeLabel: "Last 4 weeks",
    compliantDays,
    totalDays: reviewDates.length,

    tempLogs: totalTemps,
    tempFails: fails,

    cleaningDone: completedTotal,
    cleaningTotal: dueTotal,

    trainingDueSoon: dueSoon,
    trainingOver: expired,
    trainingAssigned,
    trainingInProgress,

    allergenDueSoon,
    allergenOver,

    incidents,

    signoffsDone,
    signoffsExpected,

    calibrationChecks,
    calibrationDue,

    staffOffToday,
    staffAbsencesLast30Days,

    managerQcReviews,
    managerQcAverage,

    topMissedAreas,
    topIssues,

    temperature: {
      total: totalTemps,
      fails,
      failRatePct: failRate,
      repeatFailures,
      recentLogs: recentTempLogs,
      recentFailures: recentTempFailures,
    },

    cleaning: {
      dueTotal,
      completedTotal,
      missedTotal,
      repeatMisses,
      recentRuns: recentCleaningRuns,
      categoryProgress: cleaningCategoryProgress,
    },

    training: {
      expired,
      dueSoon,
      drift,
      records: recentTrainingRecords.slice(0, 25),
      areaCoverage: trainingAreaCoverage.slice(0, 100),
    },

    allergens: {
      dueSoon: allergenDueSoon,
      overdue: allergenOver,
      recentChanges: recentAllergenChanges,
      recentReviews: recentAllergenReviews.slice(0, 25),
    },

    incidentsLog: {
      total: incidents,
      recent: recentLoggedIncidents,
    },

    signoffs: {
      total: signoffsDone,
      expected: signoffsExpected,
      recent: recentSignoffs,
    },

    staffAbsences: {
      total: staffAbsencesRows.length,
      today: staffOffToday,
      last30Days: staffAbsencesLast30Days,
      recent: staffAbsencesRows.slice(0, 25),
    },

    managerQc: {
      total: managerQcReviews,
      averageRating: managerQcAverage,
      recent: qcRows.slice(0, 25),
    },

    calibration: {
      total: calibrationChecks,
      due: calibrationDue,
      recent: recentCalibration,
    },

    hygiene: {
      latest: hygieneLatest,
      history: hygieneHistory,
    },

    headline,
    recommendations,
  };
}
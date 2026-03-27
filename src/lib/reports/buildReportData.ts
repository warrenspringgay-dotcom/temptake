import { createClient } from "@supabase/supabase-js";

type TempRow = {
  id: string;
  date: string;
  staff: string;
  location: string;
  item: string;
  temp_c: number | null;
  target_key: string | null;
  status: string | null;
};

type LoggedIncidentRow = {
  id: string;
  happened_on: string | null;
  type: string | null;
  details: string | null;
  immediate_action: string | null;
  preventive_action: string | null;
  created_by: string | null;
  created_at: string | null;
};

type SignoffRow = {
  id: string;
  signoff_on: string;
  signed_by: string | null;
  notes: string | null;
  created_at: string | null;
};

type CleaningRunRow = {
  id: string;
  run_on: string;
  done_at: string | null;
  done_by: string | null;
  category: string;
  task: string;
};

type StaffReviewRow = {
  id: string;
  reviewed_on: string;
  created_at: string | null;
  staff_name: string;
  staff_initials: string | null;
  location_name: string | null;
  reviewer: string | null;
  rating: number;
  notes: string | null;
};

type EducationRow = {
  id: string;
  staff_name: string;
  staff_initials: string | null;
  staff_email: string | null;
  type: string | null;
  awarded_on: string | null;
  expires_on: string | null;
  days_until: number | null;
  status: "valid" | "expired" | "no-expiry";
  notes: string | null;
  certificate_url: string | null;
};

type AllergenRow = {
  id: string;
  reviewed_on: string | null;
  next_due: string | null;
  reviewer: string | null;
  days_until?: number | null;
};

type AllergenChangeRow = {
  id: string;
  created_at: string | null;
  item_name: string | null;
  action: string | null;
  staff_initials: string | null;
};

type CalibrationRow = {
  id: string;
  checked_on: string;
  staff_initials: string;
  cold_storage_checked: boolean;
  probes_checked: boolean;
  thermometers_checked: boolean;
  all_equipment_calibrated: boolean;
  notes: string | null;
  created_at: string | null;
};

type HygieneMeta = {
  rating: number | null;
  visit_date: string | null;
  certificate_expires_at: string | null;
  issuing_authority: string | null;
  reference: string | null;
};

type HygieneHistoryRow = {
  id: string;
  rating: number | null;
  visit_date: string | null;
  certificate_expires_at: string | null;
  issuing_authority: string | null;
  reference: string | null;
  notes: string | null;
  created_at: string | null;
};

type UnifiedIncidentRow = {
  id: string;
  happened_on: string | null;
  created_at: string | null;
  type: string | null;
  created_by: string | null;
  details: string | null;
  corrective_action: string | null;
  source: "incident" | "temp_fail";
};

type TrainingAreaStatus = "green" | "amber" | "red" | "unknown";

type TrainingAreaRow = {
  member_id: string;
  name: string;
  initials: string | null;
  email: string | null;
  area: string;
  selected: boolean;
  awarded_on: string | null;
  expires_on: string | null;
  days_until: number | null;
  status: TrainingAreaStatus;
};

type BuildReportDataArgs = {
  orgId: string;
  from: string;
  to: string;
  locationId: string | null;
  locationLabel: string;
  generatedByEmail?: string | null;
  reportUrl?: string | null;
};

export type ReportData = {
  meta: {
    orgId: string;
    from: string;
    to: string;
    locationId: string | null;
    locationLabel: string;
    generatedAt: string;
    generatedByEmail: string | null;
    reportUrl: string | null;
  };
  summary: {
    tempsCount: number;
    cleaningRunsCount: number;
    incidentsCount: number;
    loggedIncidentsCount: number;
    signoffsCount: number;
    staffReviewsCount: number;
    educationCount: number;
    allergenReviewsCount: number;
    allergenChangesCount: number;
    calibrationChecksCount: number;
  };
  hygiene: {
    latest: HygieneMeta | null;
    history: HygieneHistoryRow[];
  };
  temps: TempRow[];
  incidents: UnifiedIncidentRow[];
  loggedIncidents: LoggedIncidentRow[];
  signoffs: SignoffRow[];
  cleaningRuns: CleaningRunRow[];
  staffReviews: StaffReviewRow[];
  education: EducationRow[];
  allergenLog: AllergenRow[];
  allergenChanges: AllergenChangeRow[];
  calibrationChecks: CalibrationRow[];
  trainingAreas: TrainingAreaRow[];
};

const SFBB_AREAS = [
  "Cross-contamination",
  "Cleaning",
  "Chilling",
  "Cooking",
  "Allergens",
  "Management",
] as const;

function getAdminSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL");
  }

  if (!serviceRoleKey) {
    throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY");
  }

  return createClient(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

function safeDate(val: any): Date | null {
  if (!val) return null;
  const d = new Date(val);
  return Number.isNaN(d.getTime()) ? null : d;
}

function toISODate(val: any): string {
  const d = safeDate(val) ?? new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function addDays(date: Date, days: number) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function isMissingLocationColumnError(err: any) {
  const msg = String(err?.message ?? "").toLowerCase();
  return (
    msg.includes("column") &&
    msg.includes("location_id") &&
    msg.includes("does not exist")
  );
}

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

function normaliseTrainingAreas(
  val: TrainingAreasValue
): Record<string, { awarded_on?: string; expires_on?: string }> {
  const out: Record<string, { awarded_on?: string; expires_on?: string }> = {};
  if (!val) return out;

  const setArea = (areaRaw: string, awarded: any, expires: any) => {
    const canon = canonicalAreaName(String(areaRaw ?? "").trim());
    if (!canon) return;
    out[canon] = {
      awarded_on: awarded ? toISODate(awarded) : undefined,
      expires_on: expires ? toISODate(expires) : undefined,
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
  }

  return out;
}

function computeTrainingStatus(awardedISO: string | null, expiresISO: string | null) {
  const today0 = new Date();
  today0.setHours(0, 0, 0, 0);

  const awarded = safeDate(awardedISO);
  const expires = safeDate(expiresISO);

  let effectiveExpires: Date | null = expires;
  if (!effectiveExpires && awarded) effectiveExpires = addDays(awarded, 365);

  if (!awarded && !effectiveExpires) {
    return {
      expires_on: null as string | null,
      days_until: null as number | null,
      status: "unknown" as TrainingAreaStatus,
    };
  }

  const exp0 = effectiveExpires ? new Date(effectiveExpires) : null;
  if (exp0) exp0.setHours(0, 0, 0, 0);

  const days_until = exp0
    ? Math.round((exp0.getTime() - today0.getTime()) / 86400000)
    : null;

  if (days_until == null) {
    return { expires_on: null, days_until: null, status: "unknown" as TrainingAreaStatus };
  }
  if (days_until < 0) {
    return { expires_on: toISODate(exp0!), days_until, status: "red" as TrainingAreaStatus };
  }
  if (days_until <= 30) {
    return { expires_on: toISODate(exp0!), days_until, status: "amber" as TrainingAreaStatus };
  }
  return { expires_on: toISODate(exp0!), days_until, status: "green" as TrainingAreaStatus };
}

async function fetchTemps(
  supabase: ReturnType<typeof getAdminSupabase>,
  fromISO: string,
  toISO: string,
  orgId: string,
  locationId: string | null
): Promise<TempRow[]> {
  const fromStart = new Date(`${fromISO}T00:00:00.000Z`).toISOString();
  const toEnd = new Date(`${toISO}T23:59:59.999Z`).toISOString();

  let query = supabase
    .from("food_temp_logs")
    .select("*")
    .eq("org_id", orgId)
    .gte("at", fromStart)
    .lte("at", toEnd)
    .order("at", { ascending: false })
    .limit(3000);

  if (locationId) query = query.eq("location_id", locationId);

  const { data, error } = await query;
  if (error) throw error;

  return (data ?? []).map((r: any) => ({
    id: String(r.id),
    date: toISODate(r.at ?? r.created_at),
    staff: r.staff_initials ?? r.initials ?? "—",
    location: r.area ?? "—",
    item: r.note ?? "—",
    temp_c: r.temp_c != null ? Number(r.temp_c) : null,
    target_key: r.target_key ?? null,
    status: r.status ?? null,
  }));
}

async function fetchLoggedIncidentsTrail(
  supabase: ReturnType<typeof getAdminSupabase>,
  fromISO: string,
  toISO: string,
  orgId: string,
  locationId: string | null
): Promise<LoggedIncidentRow[]> {
  let q = supabase
    .from("incidents")
    .select(
      "id,org_id,location_id,happened_on,type,details,immediate_action,preventive_action,created_by,created_at"
    )
    .eq("org_id", String(orgId))
    .gte("happened_on", fromISO)
    .lte("happened_on", toISO)
    .order("happened_on", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(3000);

  if (locationId) q = q.eq("location_id", String(locationId));

  const { data, error } = await q;
  if (error) throw error;

  return (data ?? []).map((r: any) => ({
    id: String(r.id),
    happened_on: r.happened_on ? String(r.happened_on) : null,
    type: r.type ? String(r.type) : null,
    details: r.details ? String(r.details) : null,
    immediate_action: r.immediate_action ? String(r.immediate_action) : null,
    preventive_action: r.preventive_action ? String(r.preventive_action) : null,
    created_by: r.created_by ? String(r.created_by) : null,
    created_at: r.created_at ? String(r.created_at) : null,
  }));
}

async function fetchTempFailuresUnified(
  supabase: ReturnType<typeof getAdminSupabase>,
  fromISO: string,
  toISO: string,
  orgId: string,
  locationId: string | null
): Promise<UnifiedIncidentRow[]> {
  const fromStart = new Date(`${fromISO}T00:00:00.000Z`).toISOString();
  const toEnd = new Date(`${toISO}T23:59:59.999Z`).toISOString();

  let q = supabase
    .from("food_temp_logs")
    .select("id, at, area, note, temp_c, target_key, status, staff_initials, location_id")
    .eq("org_id", orgId)
    .eq("status", "fail")
    .gte("at", fromStart)
    .lte("at", toEnd)
    .order("at", { ascending: false })
    .limit(3000);

  if (locationId) q = q.eq("location_id", locationId);

  const { data: failLogs, error: failErr } = await q;
  if (failErr) throw failErr;

  const logs = (failLogs ?? []) as any[];
  if (!logs.length) return [];

  const ids = logs.map((r) => String(r.id));

  let caQ = supabase
    .from("food_temp_corrective_actions")
    .select(
      "id, temp_log_id, action, recheck_temp_c, recheck_at, recheck_status, recorded_by, created_at, location_id"
    )
    .eq("org_id", orgId)
    .in("temp_log_id", ids)
    .limit(5000);

  if (locationId) caQ = caQ.eq("location_id", locationId);

  const { data: caRows, error: caErr } = await caQ;
  if (caErr) throw caErr;

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

  return logs.map((l) => {
    const ca = byLog.get(String(l.id)) ?? null;
    const atISO = l.at ? String(l.at) : null;
    const happened_on = toISODate(atISO ?? new Date().toISOString());

    const tempVal = l.temp_c != null ? `${Number(l.temp_c)}°C` : "—";
    const target = l.target_key ? String(l.target_key) : "—";
    const details = `${l.area ?? "—"} • ${l.note ?? "—"} • ${tempVal} (target ${target})`;

    let corrective = ca?.action ? String(ca.action) : null;

    if (ca?.recheck_temp_c != null) {
      const reT = `${Number(ca.recheck_temp_c)}°C`;
      const reStatus = ca.recheck_status ? String(ca.recheck_status) : "—";
      const suffix = `Re-check: ${reT} (${reStatus})`;
      corrective = corrective ? `${corrective} • ${suffix}` : suffix;
    }

    return {
      id: `temp_fail_${String(l.id)}`,
      happened_on,
      created_at: atISO,
      type: "Temp failure",
      created_by: (ca?.recorded_by ?? l.staff_initials ?? null)
        ? String(ca?.recorded_by ?? l.staff_initials)
        : null,
      details,
      corrective_action: corrective,
      source: "temp_fail" as const,
    };
  });
}

async function fetchSignoffsTrail(
  supabase: ReturnType<typeof getAdminSupabase>,
  fromISO: string,
  toISO: string,
  orgId: string,
  locationId: string | null
): Promise<SignoffRow[]> {
  let q = supabase
    .from("daily_signoffs")
    .select("id, signoff_on, signed_by, notes, created_at, location_id")
    .eq("org_id", orgId)
    .gte("signoff_on", fromISO)
    .lte("signoff_on", toISO)
    .order("signoff_on", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(3000);

  if (locationId) q = q.eq("location_id", locationId);

  const { data, error } = await q;
  if (error) throw error;

  return (data ?? []).map((r: any) => ({
    id: String(r.id),
    signoff_on: String(r.signoff_on),
    signed_by: r.signed_by ? String(r.signed_by) : null,
    notes: r.notes ? String(r.notes) : null,
    created_at: r.created_at ? String(r.created_at) : null,
  }));
}

async function fetchCleaningRunsTrail(
  supabase: ReturnType<typeof getAdminSupabase>,
  fromISO: string,
  toISO: string,
  orgId: string,
  locationId: string | null
): Promise<CleaningRunRow[]> {
  let runsQ = supabase
    .from("cleaning_task_runs")
    .select("id, task_id, run_on, done_at, done_by, location_id")
    .eq("org_id", orgId)
    .gte("run_on", fromISO)
    .lte("run_on", toISO)
    .order("run_on", { ascending: false })
    .order("done_at", { ascending: false })
    .limit(3000);

  if (locationId) runsQ = runsQ.eq("location_id", locationId);

  const { data: runs, error: runsErr } = await runsQ;
  if (runsErr) throw runsErr;

  const runRows = (runs ?? []) as any[];
  if (!runRows.length) return [];

  const taskIds = Array.from(new Set(runRows.map((r) => String(r.task_id)).filter(Boolean)));

  let tasksQ = supabase
    .from("cleaning_tasks")
    .select("id, task, category")
    .eq("org_id", orgId)
    .in("id", taskIds)
    .limit(5000);

  if (locationId) tasksQ = tasksQ.eq("location_id", locationId);

  const { data: tasks, error: tasksErr } = await tasksQ;
  if (tasksErr) throw tasksErr;

  const taskMap = new Map<string, { task: string; category: string }>();
  for (const t of (tasks ?? []) as any[]) {
    taskMap.set(String(t.id), {
      task: String(t.task ?? "—"),
      category: String(t.category ?? "Uncategorised"),
    });
  }

  return runRows.map((r) => {
    const t = taskMap.get(String(r.task_id)) ?? { task: "—", category: "Uncategorised" };
    return {
      id: String(r.id),
      run_on: String(r.run_on),
      done_at: r.done_at ? String(r.done_at) : null,
      done_by: r.done_by ? String(r.done_by) : null,
      category: t.category,
      task: t.task,
    };
  });
}

async function fetchStaffReviews(
  supabase: ReturnType<typeof getAdminSupabase>,
  fromISO: string,
  toISO: string,
  orgId: string,
  locationId: string | null
): Promise<StaffReviewRow[]> {
  let query = supabase
    .from("staff_qc_reviews")
    .select(`
      id,
      reviewed_on,
      created_at,
      rating,
      notes,
      staff:staff_id ( name, initials ),
      manager:manager_id ( name, initials ),
      location:location_id ( name )
    `)
    .eq("org_id", orgId)
    .gte("reviewed_on", fromISO)
    .lte("reviewed_on", toISO)
    .order("reviewed_on", { ascending: false })
    .order("created_at", { ascending: false });

  if (locationId) query = query.eq("location_id", locationId);

  const { data, error } = await query;
  if (error) throw error;

  return (data ?? []).map((r: any) => ({
    id: String(r.id),
    reviewed_on: toISODate(r.reviewed_on),
    created_at: r.created_at ?? null,
    staff_name: r.staff?.name ?? "—",
    staff_initials: r.staff?.initials ?? null,
    location_name: r.location?.name ?? "—",
    reviewer: r.manager?.initials ?? r.manager?.name ?? "—",
    rating: Number(r.rating),
    notes: r.notes ?? null,
  }));
}

async function fetchEducation(
  supabase: ReturnType<typeof getAdminSupabase>,
  orgId: string,
  locationId: string | null
): Promise<EducationRow[]> {
  let data: any[] | null = null;

  if (locationId) {
    const { data: d1, error: e1 } = await supabase
      .from("trainings")
      .select(`
        id,
        type,
        awarded_on,
        expires_on,
        certificate_url,
        notes,
        location_id,
        staff:staff_id ( name, email, initials )
      `)
      .eq("org_id", orgId)
      .eq("location_id", locationId)
      .order("expires_on", { ascending: true })
      .order("awarded_on", { ascending: true });

    if (!e1) data = (d1 ?? []) as any[];
    else if (!isMissingLocationColumnError(e1)) throw e1;
  }

  if (data === null) {
    const { data: d2, error: e2 } = await supabase
      .from("trainings")
      .select(`
        id,
        type,
        awarded_on,
        expires_on,
        certificate_url,
        notes,
        staff:staff_id ( name, email, initials )
      `)
      .eq("org_id", orgId)
      .order("expires_on", { ascending: true })
      .order("awarded_on", { ascending: true });

    if (e2) throw e2;
    data = (d2 ?? []) as any[];
  }

  const today0 = new Date();
  today0.setHours(0, 0, 0, 0);

  return (data ?? []).map((r: any) => {
    const staff = r.staff ?? {};
    const awarded = safeDate(r.awarded_on);
    const expires = safeDate(r.expires_on);

    const expires0 = expires ? new Date(expires) : null;
    if (expires0) expires0.setHours(0, 0, 0, 0);

    let daysUntil: number | null = null;
    let status: EducationRow["status"] = "no-expiry";

    if (expires0) {
      daysUntil = Math.round((expires0.getTime() - today0.getTime()) / 86400000);
      status = daysUntil < 0 ? "expired" : "valid";
    }

    return {
      id: String(r.id),
      staff_name: staff.name ?? "—",
      staff_initials: staff.initials ?? null,
      staff_email: staff.email ?? null,
      type: r.type ?? null,
      awarded_on: awarded ? awarded.toISOString() : null,
      expires_on: expires ? expires.toISOString() : null,
      days_until: daysUntil,
      status,
      notes: r.notes ?? null,
      certificate_url: r.certificate_url ?? null,
    };
  });
}

async function fetchAllergenLog(
  supabase: ReturnType<typeof getAdminSupabase>,
  orgId: string,
  locationId: string | null
): Promise<AllergenRow[]> {
  const today0 = new Date();
  today0.setHours(0, 0, 0, 0);

  const mapRows = (rows: any[]) =>
    (rows ?? []).map((r: any) => {
      const reviewed = safeDate(r.reviewed_on);
      const intervalDaysRaw = r.interval_days;
      const intervalDays =
        intervalDaysRaw == null || intervalDaysRaw === "" ? null : Number(intervalDaysRaw);

      let nextDue: Date | null = null;
      if (reviewed && intervalDays && Number.isFinite(intervalDays) && intervalDays > 0) {
        nextDue = new Date(reviewed.getTime() + intervalDays * 86400000);
      }

      const next0 = nextDue ? new Date(nextDue) : null;
      if (next0) next0.setHours(0, 0, 0, 0);

      const days_until = next0
        ? Math.round((next0.getTime() - today0.getTime()) / 86400000)
        : null;

      return {
        id: String(r.id),
        reviewed_on: reviewed ? reviewed.toISOString() : null,
        next_due: nextDue ? nextDue.toISOString() : null,
        reviewer: r.reviewer ?? null,
        days_until,
      };
    });

  if (locationId) {
    const { data: d1, error: e1 } = await supabase
      .from("allergen_review_log")
      .select("id, reviewed_on, interval_days, reviewer, location_id, created_at")
      .eq("org_id", orgId)
      .eq("location_id", locationId)
      .order("reviewed_on", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(500);

    if (e1 && !isMissingLocationColumnError(e1)) throw e1;
    if (!e1 && (d1?.length ?? 0) > 0) return mapRows(d1 ?? []);
  }

  const { data: d2, error: e2 } = await supabase
    .from("allergen_review_log")
    .select("id, reviewed_on, interval_days, reviewer, created_at")
    .eq("org_id", orgId)
    .order("reviewed_on", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(500);

  if (e2) throw e2;

  return mapRows(d2 ?? []);
}

async function fetchAllergenChanges(
  supabase: ReturnType<typeof getAdminSupabase>,
  fromISO: string,
  toISO: string,
  orgId: string,
  locationId: string | null
): Promise<AllergenChangeRow[]> {
  const fromStart = new Date(`${fromISO}T00:00:00.000Z`).toISOString();
  const toEnd = new Date(`${toISO}T23:59:59.999Z`).toISOString();

  let q = supabase
    .from("allergen_change_logs")
    .select("id, created_at, item_name, action, staff_initials, org_id, location_id")
    .eq("org_id", orgId)
    .gte("created_at", fromStart)
    .lte("created_at", toEnd)
    .order("created_at", { ascending: false })
    .limit(500);

  if (locationId) q = q.eq("location_id", locationId);

  const { data, error } = await q;
  if (error) throw error;

  return (data ?? []).map((r: any) => ({
    id: String(r.id),
    created_at: r.created_at ?? null,
    item_name: r.item_name ?? null,
    action: r.action ?? null,
    staff_initials: r.staff_initials ?? null,
  }));
}

async function fetchCalibrationChecksTrail(
  supabase: ReturnType<typeof getAdminSupabase>,
  fromISO: string,
  toISO: string,
  orgId: string,
  locationId: string | null
): Promise<CalibrationRow[]> {
  if (!locationId) return [];

  const { data, error } = await supabase
    .from("calibration_checks")
    .select(
      "id, org_id, location_id, checked_on, staff_initials, all_equipment_calibrated, notes, created_at, cold_storage_checked, probes_checked, thermometers_checked"
    )
    .eq("org_id", orgId)
    .eq("location_id", locationId)
    .gte("checked_on", fromISO)
    .lte("checked_on", toISO)
    .order("checked_on", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(2000);

  if (error) throw error;

  return (data ?? []).map((r: any) => ({
    id: String(r.id),
    checked_on: String(r.checked_on),
    staff_initials: String(r.staff_initials ?? "—"),
    cold_storage_checked: Boolean(r.cold_storage_checked),
    probes_checked: Boolean(r.probes_checked),
    thermometers_checked: Boolean(r.thermometers_checked),
    all_equipment_calibrated: Boolean(r.all_equipment_calibrated),
    notes: r.notes ? String(r.notes) : null,
    created_at: r.created_at ? String(r.created_at) : null,
  }));
}

async function fetchLatestHygieneByLocation(
  supabase: ReturnType<typeof getAdminSupabase>,
  orgId: string
): Promise<Record<string, HygieneMeta>> {
  const { data, error } = await supabase
    .from("food_hygiene_ratings")
    .select("location_id, rating, visit_date, certificate_expires_at, issuing_authority, reference")
    .eq("org_id", orgId)
    .order("visit_date", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(5000);

  if (error) throw error;

  const map: Record<string, HygieneMeta> = {};

  for (const r of (data ?? []) as any[]) {
    const locId = r.location_id ? String(r.location_id) : null;
    if (!locId) continue;
    if (map[locId]) continue;

    map[locId] = {
      rating: r.rating != null ? Number(r.rating) : null,
      visit_date: r.visit_date ? String(r.visit_date) : null,
      certificate_expires_at: r.certificate_expires_at ? String(r.certificate_expires_at) : null,
      issuing_authority: r.issuing_authority ? String(r.issuing_authority) : null,
      reference: r.reference ? String(r.reference) : null,
    };
  }

  return map;
}

async function fetchHygieneHistoryForLocation(
  supabase: ReturnType<typeof getAdminSupabase>,
  orgId: string,
  locationId: string
): Promise<HygieneHistoryRow[]> {
  const { data, error } = await supabase
    .from("food_hygiene_ratings")
    .select(
      "id, rating, visit_date, certificate_expires_at, issuing_authority, reference, notes, created_at"
    )
    .eq("org_id", orgId)
    .eq("location_id", locationId)
    .order("visit_date", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) throw error;

  return (data ?? []).map((r: any) => ({
    id: String(r.id),
    rating: r.rating != null ? Number(r.rating) : null,
    visit_date: r.visit_date ? String(r.visit_date) : null,
    certificate_expires_at: r.certificate_expires_at ? String(r.certificate_expires_at) : null,
    issuing_authority: r.issuing_authority ? String(r.issuing_authority) : null,
    reference: r.reference ? String(r.reference) : null,
    notes: r.notes ? String(r.notes) : null,
    created_at: r.created_at ? String(r.created_at) : null,
  }));
}

async function fetchTrainingAreasReport(
  supabase: ReturnType<typeof getAdminSupabase>,
  orgId: string,
  locationId: string | null
): Promise<TrainingAreaRow[]> {
  const rows: TrainingAreaRow[] = [];

  async function fetchFromTeamMembers(): Promise<any[] | null> {
    if (locationId) {
      const { data: d1, error: e1 } = await supabase
        .from("team_members")
        .select("id,name,initials,email,active,training_areas,location_id")
        .eq("org_id", orgId)
        .eq("location_id", locationId)
        .order("name", { ascending: true })
        .limit(5000);

      if (e1) {
        if (!isMissingLocationColumnError(e1)) throw e1;
      } else if ((d1?.length ?? 0) > 0) {
        return d1 as any[];
      }
    }

    const { data: d2, error: e2 } = await supabase
      .from("team_members")
      .select("id,name,initials,email,active,training_areas")
      .eq("org_id", orgId)
      .order("name", { ascending: true })
      .limit(5000);

    if (e2) throw e2;
    return (d2 ?? []) as any[];
  }

  async function fetchFromStaff(): Promise<any[] | null> {
    if (locationId) {
      const { data: d1, error: e1 } = await supabase
        .from("staff")
        .select("id,name,initials,email,active,training_areas,location_id")
        .eq("org_id", orgId)
        .eq("location_id", locationId)
        .order("name", { ascending: true })
        .limit(5000);

      if (e1) {
        if (!isMissingLocationColumnError(e1)) throw e1;
      } else if ((d1?.length ?? 0) > 0) {
        return d1 as any[];
      }
    }

    const { data: d2, error: e2 } = await supabase
      .from("staff")
      .select("id,name,initials,email,active,training_areas")
      .eq("org_id", orgId)
      .order("name", { ascending: true })
      .limit(5000);

    if (e2) throw e2;
    return (d2 ?? []) as any[];
  }

  let data = await fetchFromTeamMembers();
  if (!data || data.length === 0) data = await fetchFromStaff();
  if (!data || data.length === 0) return [];

  for (const m of data) {
    if (m.active === false) continue;

    const member_id = String(m.id);
    const name = String(m.name ?? "—");
    const initials = m.initials ? String(m.initials) : null;
    const email = m.email ? String(m.email) : null;

    const normal = normaliseTrainingAreas(m.training_areas as TrainingAreasValue);

    for (const area of SFBB_AREAS) {
      const areaKey = String(area);
      const selected = Object.prototype.hasOwnProperty.call(normal, areaKey);
      const meta = selected ? (normal[areaKey] ?? {}) : {};
      const awarded_on = meta.awarded_on ?? null;
      const expires_on_in = meta.expires_on ?? null;
      const computed = computeTrainingStatus(awarded_on, expires_on_in);

      rows.push({
        member_id,
        name,
        initials,
        email,
        area: areaKey,
        selected,
        awarded_on,
        expires_on: computed.expires_on,
        days_until: computed.days_until,
        status: computed.status,
      });
    }
  }

  return rows;
}

export async function buildReportData(args: BuildReportDataArgs): Promise<ReportData> {
  const {
    orgId,
    from,
    to,
    locationId,
    locationLabel,
    generatedByEmail = null,
    reportUrl = null,
  } = args;

  const supabase = getAdminSupabase();

  const [
    temps,
    loggedIncidents,
    tempFails,
    signoffs,
    cleaningRuns,
    staffReviews,
    education,
    allergenLog,
    allergenChanges,
    calibrationChecks,
    hygieneByLocation,
    trainingAreas,
  ] = await Promise.all([
    fetchTemps(supabase, from, to, orgId, locationId),
    fetchLoggedIncidentsTrail(supabase, from, to, orgId, locationId),
    fetchTempFailuresUnified(supabase, from, to, orgId, locationId),
    fetchSignoffsTrail(supabase, from, to, orgId, locationId),
    fetchCleaningRunsTrail(supabase, from, to, orgId, locationId),
    fetchStaffReviews(supabase, from, to, orgId, locationId),
    fetchEducation(supabase, orgId, locationId),
    fetchAllergenLog(supabase, orgId, locationId),
    fetchAllergenChanges(supabase, from, to, orgId, locationId),
    fetchCalibrationChecksTrail(supabase, from, to, orgId, locationId),
    fetchLatestHygieneByLocation(supabase, orgId),
    fetchTrainingAreasReport(supabase, orgId, locationId),
  ]);

  const incidentRows: UnifiedIncidentRow[] = [
    ...loggedIncidents.map((r) => ({
      id: String(r.id),
      happened_on: r.happened_on ?? null,
      created_at: r.created_at ?? null,
      type: r.type ?? "Incident",
      created_by: r.created_by ?? null,
      details: r.details ?? null,
      corrective_action: r.immediate_action ?? null,
      source: "incident" as const,
    })),
    ...tempFails,
  ].sort((a, b) => {
    const aT = safeDate(a.created_at)?.getTime() ?? safeDate(a.happened_on)?.getTime() ?? 0;
    const bT = safeDate(b.created_at)?.getTime() ?? safeDate(b.happened_on)?.getTime() ?? 0;
    return bT - aT;
  });

  const hygieneLatest = locationId ? hygieneByLocation[String(locationId)] ?? null : null;
  const hygieneHistory = locationId
    ? await fetchHygieneHistoryForLocation(supabase, orgId, locationId).catch(() => [])
    : [];

  return {
    meta: {
      orgId,
      from,
      to,
      locationId,
      locationLabel,
      generatedAt: new Date().toISOString(),
      generatedByEmail,
      reportUrl,
    },
    summary: {
      tempsCount: temps.length,
      cleaningRunsCount: cleaningRuns.length,
      incidentsCount: incidentRows.length,
      loggedIncidentsCount: loggedIncidents.length,
      signoffsCount: signoffs.length,
      staffReviewsCount: staffReviews.length,
      educationCount: education.length,
      allergenReviewsCount: allergenLog.length,
      allergenChangesCount: allergenChanges.length,
      calibrationChecksCount: calibrationChecks.length,
    },
    hygiene: {
      latest: hygieneLatest,
      history: hygieneHistory,
    },
    temps,
    incidents: incidentRows,
    loggedIncidents,
    signoffs,
    cleaningRuns,
    staffReviews,
    education,
    allergenLog,
    allergenChanges,
    calibrationChecks,
    trainingAreas,
  };
}
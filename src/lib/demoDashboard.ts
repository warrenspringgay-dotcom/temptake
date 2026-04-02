import "server-only";

import { supabaseAdmin } from "@/lib/supabaseAdmin";

export type LocationOption = { id: string; name: string };

export type TempSummary = { today: number; fails7d: number };

export type UnifiedIncidentRow = {
  id: string;
  happened_on: string | null;
  created_at: string | null;
  type: string | null;
  details: string | null;
  immediate_action: string | null;
  corrective_action: string | null;
  created_by: string | null;
  source: "incident" | "temp_fail";
};

export type CleaningCategoryProgress = {
  category: string;
  done: number;
  total: number;
};

export type CleaningActivityRow = {
  id: string;
  time: string | null;
  category: string;
  staff: string | null;
  notes: string | null;
  task: string | null;
};

export type TempLogRow = {
  id: string;
  time: string | null;
  staff: string | null;
  area: string | null;
  item: string | null;
  temp_c: number | null;
  status: string | null;
};

export type SignoffRow = {
  id: string;
  signoff_on: string;
  signed_by: string | null;
  notes: string | null;
  created_at: string | null;
};

export type SignoffSummary = {
  todayCount: number;
};

export type TeamMemberOption = {
  id: string;
  name: string | null;
  initials: string | null;
  role: string | null;
  active: boolean | null;
  user_id: string | null;
  training_areas?: string[] | null;
  location_id?: string | null;
};

export type StaffAbsenceRow = {
  id: string;
  start_date: string;
  end_date: string;
  created_at: string | null;
  absence_type: string;
  is_half_day: boolean;
  half_day_period: string | null;
  notes: string | null;
  operational_impact: string | null;
  status: string;
  team_member_id: string | null;
  staff: { initials: string | null; name: string | null; role: string | null } | null;
};

export type AllergenChangeLogRow = {
  id: string;
  created_at: string | null;
  action: string | null;
  item_name: string | null;
  category_before: string | null;
  category_after: string | null;
  staff_initials: string | null;
};

export type AllergenReviewRow = {
  id: string;
  last_reviewed: string | null;
  reviewer: string | null;
  interval_days: number;
  created_at: string | null;
};

export type TrainingRow = {
  id: string;
  team_member_id: string | null;
  type: string | null;
  awarded_on: string | null;
  expires_on: string | null;
  provider_name: string | null;
  course_key: string | null;
  notes: string | null;
  created_at: string | null;
  team_member: { name: string | null; initials: string | null; location_id: string | null } | null;
};

export type StaffQcReviewRow = {
  id: string;
  reviewed_on: string;
  rating: number;
  notes: string | null;
  staff_id: string | null;
  manager_id: string | null;
  staff: { initials: string | null; name: string | null } | null;
  manager: { initials: string | null; name: string | null } | null;
};

export type CalibrationCheckRow = {
  id: string;
  checked_on: string;
  staff_initials: string | null;
  all_equipment_calibrated: boolean | null;
  notes: string | null;
  created_at: string | null;
};

export type DemoDashboardData = {
  orgId: string;
  locationId: string;
  locationName: string;
  locations: LocationOption[];
  selectedDateISO: string;
  selectedDateLabel: string;
  calibrationDue: boolean;

  tempsSummary: TempSummary;
  cleaningTotal: number;
  cleaningDoneTotal: number;
  incidentsToday: number;
  incidents7d: number;
  staffOffToday: number;
  staffAbsences30d: number;
  trainingExpired: number;
  trainingDueSoon: number;

  todayTemps: TempLogRow[];
  cleaningActivity: CleaningActivityRow[];
  cleaningCategoryProgress: CleaningCategoryProgress[];
  tempFailsToday: UnifiedIncidentRow[];
  incidentsHistory: UnifiedIncidentRow[];
  staffAbsences: StaffAbsenceRow[];

  signoffsToday: SignoffRow[];
  signoffSummary: SignoffSummary;

  qcReviews: StaffQcReviewRow[];

  allergenReviews: AllergenReviewRow[];
  allergenLogs: AllergenChangeLogRow[];

  trainingRows: TrainingRow[];
  trainingAreasRows: TeamMemberOption[];

  calibrationChecks: CalibrationCheckRow[];
};

type CleaningTask = {
  id: string;
  frequency: "daily" | "weekly" | "monthly";
  category: string | null;
  task: string | null;
  weekday: number | null;
  month_day: number | null;
};

type CleaningTaskRun = {
  id: string;
  org_id: string;
  task_id: string;
  run_on: string;
  done_by: string | null;
  done_at: string | null;
  location_id: string | null;
};

function safeDate(val: unknown): Date | null {
  if (!val) return null;
  const d = val instanceof Date ? val : new Date(String(val));
  if (Number.isNaN(d.getTime())) return null;
  return d;
}

function isoDate(d: Date) {
  return d.toISOString().slice(0, 10);
}

function formatPrettyDate(dmy: string | null): string {
  if (!dmy) return "—";
  const d = new Date(dmy);
  if (Number.isNaN(d.getTime())) return dmy;
  return d.toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function formatTimeHM(d: Date | null | undefined): string | null {
  if (!d) return null;
  const hours = String(d.getHours()).padStart(2, "0");
  const mins = String(d.getMinutes()).padStart(2, "0");
  return `${hours}:${mins}`;
}

const getDow1to7 = (dmy: string) => ((new Date(dmy).getDay() + 6) % 7) + 1;
const getDom = (dmy: string) => new Date(dmy).getDate();

function isDueOn(t: CleaningTask, dmy: string) {
  if (t.frequency === "daily") return true;
  if (t.frequency === "weekly") return t.weekday === getDow1to7(dmy);
  return t.month_day === getDom(dmy);
}

async function fetchTempFailuresUnifiedForDay(
  orgId: string,
  locationId: string,
  d0: Date,
  d1: Date
): Promise<UnifiedIncidentRow[]> {
  const { data, error } = await supabaseAdmin
    .from("food_temp_logs")
    .select(`
      id,
      at,
      temp_c,
      target_key,
      area,
      note,
      staff_initials,
      status,
      corrective_action_log:food_temp_corrective_actions!food_temp_corrective_actions_temp_log_id_fkey(
        id,
        temp_log_id,
        created_at,
        recorded_by,
        action,
        recheck_temp_c,
        recheck_at,
        recheck_status
      )
    `)
    .eq("org_id", orgId)
    .eq("location_id", locationId)
    .eq("status", "fail")
    .gte("at", d0.toISOString())
    .lt("at", d1.toISOString())
    .order("at", { ascending: false })
    .limit(500);

  if (error) throw error;

  const rows: any[] = (data ?? []) as any[];

  const logs = rows.map((r) => ({
    id: String(r.id),
    at: r.at ? String(r.at) : null,
    temp_c: r.temp_c != null ? Number(r.temp_c) : null,
    target_key: r.target_key ?? null,
    area: r.area ?? null,
    note: r.note ?? null,
    staff_initials: r.staff_initials ?? null,
  }));

  const corrective = rows.flatMap((r) => {
    const arr = r.corrective_action_log ?? [];
    return Array.isArray(arr) ? arr : [];
  });

  const byLog = new Map<string, any>();
  for (const row of corrective as any[]) {
    const key = String(row.temp_log_id);
    const existing = byLog.get(key);
    if (!existing) {
      byLog.set(key, row);
    } else {
      const a = safeDate(existing.created_at)?.getTime() ?? 0;
      const b = safeDate(row.created_at)?.getTime() ?? 0;
      if (b >= a) byLog.set(key, row);
    }
  }

  return logs.map((l) => {
    const ca = byLog.get(String(l.id)) ?? null;
    const atISO = l.at ? String(l.at) : null;
    const happened_on = atISO ? isoDate(new Date(atISO)) : null;

    const tempVal = l.temp_c != null ? `${Number(l.temp_c)}°C` : "—";
    const target = l.target_key ? String(l.target_key) : "—";
    const details = `${l.area ?? "—"} • ${l.note ?? "—"} • ${tempVal} (target ${target})`;

    let correctiveText = ca?.action ? String(ca.action) : null;

    if (ca?.recheck_temp_c != null) {
      const reT = `${Number(ca.recheck_temp_c)}°C`;
      const reAt = ca.recheck_at
        ? new Date(String(ca.recheck_at)).toLocaleTimeString("en-GB", {
            hour: "2-digit",
            minute: "2-digit",
          })
        : "—";
      const reStatus = ca.recheck_status ? String(ca.recheck_status) : "—";
      const suffix = `Re-check: ${reT} (${reStatus}) at ${reAt}`;
      correctiveText = correctiveText ? `${correctiveText} • ${suffix}` : suffix;
    }

    return {
      id: `temp_fail_${String(l.id)}`,
      happened_on,
      created_at: atISO,
      type: "Temp failure",
      created_by:
        (ca?.recorded_by ?? l.staff_initials ?? null)
          ? String(ca?.recorded_by ?? l.staff_initials)
          : null,
      details,
      immediate_action: null,
      corrective_action: correctiveText,
      source: "temp_fail",
    };
  });
}

async function resolveLatestDemoDate(orgId: string, locationId: string): Promise<string> {
  const [tempRes, cleaningRes, signoffRes, incidentRes, absRes, calRes] =
    await Promise.all([
      supabaseAdmin
        .from("food_temp_logs")
        .select("at")
        .eq("org_id", orgId)
        .eq("location_id", locationId)
        .order("at", { ascending: false })
        .limit(1),
      supabaseAdmin
        .from("cleaning_task_runs")
        .select("run_on")
        .eq("org_id", orgId)
        .eq("location_id", locationId)
        .order("run_on", { ascending: false })
        .limit(1),
      supabaseAdmin
        .from("daily_signoffs")
        .select("signoff_on")
        .eq("org_id", orgId)
        .eq("location_id", locationId)
        .order("signoff_on", { ascending: false })
        .limit(1),
      supabaseAdmin
        .from("incidents")
        .select("happened_on")
        .eq("org_id", orgId)
        .eq("location_id", locationId)
        .order("happened_on", { ascending: false })
        .limit(1),
      supabaseAdmin
        .from("staff_absences")
        .select("end_date")
        .eq("org_id", orgId)
        .or(`location_id.eq.${locationId},location_id.is.null`)
        .order("end_date", { ascending: false })
        .limit(1),
      supabaseAdmin
        .from("calibration_checks")
        .select("checked_on")
        .eq("org_id", orgId)
        .eq("location_id", locationId)
        .order("checked_on", { ascending: false })
        .limit(1),
    ]);

  const candidates: string[] = [];

  const tempAt = tempRes.data?.[0]?.at;
  if (tempAt) candidates.push(isoDate(new Date(tempAt)));

  const runOn = cleaningRes.data?.[0]?.run_on;
  if (runOn) candidates.push(String(runOn));

  const signoffOn = signoffRes.data?.[0]?.signoff_on;
  if (signoffOn) candidates.push(String(signoffOn));

  const happenedOn = incidentRes.data?.[0]?.happened_on;
  if (happenedOn) candidates.push(String(happenedOn));

  const endDate = absRes.data?.[0]?.end_date;
  if (endDate) candidates.push(String(endDate));

  const checkedOn = calRes.data?.[0]?.checked_on;
  if (checkedOn) candidates.push(String(checkedOn));

  if (candidates.length === 0) return isoDate(new Date());

  candidates.sort((a, b) => (a < b ? 1 : -1));
  return candidates[0];
}

export async function getDemoDashboardData(
  requestedDate?: string
): Promise<DemoDashboardData> {
  const orgId = process.env.NEXT_PUBLIC_DEMO_ORG_ID || process.env.DEMO_ORG_ID;
  const locationId =
    process.env.NEXT_PUBLIC_DEMO_LOCATION_ID || process.env.DEMO_LOCATION_ID;

  if (!orgId || !locationId) {
    throw new Error("Missing DEMO_ORG_ID / DEMO_LOCATION_ID");
  }

  const [locationRes, locationsRes] = await Promise.all([
    supabaseAdmin
      .from("locations")
      .select("id,name")
      .eq("org_id", orgId)
      .eq("id", locationId)
      .single(),
    supabaseAdmin
      .from("locations")
      .select("id,name")
      .eq("org_id", orgId)
      .order("name", { ascending: true }),
  ]);

  if (locationRes.error) throw locationRes.error;
  if (locationsRes.error) throw locationsRes.error;

  const selectedDateISO =
    requestedDate && /^\d{4}-\d{2}-\d{2}$/.test(requestedDate)
      ? requestedDate
      : await resolveLatestDemoDate(orgId, locationId);

  const d0 = new Date(selectedDateISO);
  d0.setHours(0, 0, 0, 0);
  const d1 = new Date(d0);
  d1.setDate(d1.getDate() + 1);

  const sevenDaysAgo = new Date(d0);
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const ninetyDaysAgo = new Date(d0);
  ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 89);

  const thirtyDaysAgo = new Date(d0);
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 29);

  const trainingBase = new Date();
  trainingBase.setHours(0, 0, 0, 0);

  const thirtyDaysAhead = new Date(trainingBase);
  thirtyDaysAhead.setDate(thirtyDaysAhead.getDate() + 30);

  const [
    tempsTodayRes,
    tempsFails7dRes,
    todayTempLogsRes,
    cleaningTasksRes,
    cleaningRunsDayRes,
    incidentsListRes,
    incidentsTodayRes,
    incidents7dRes,
    staffAbsencesRes,
    trainingsForKpiRes,
    trainingRecordsRes,
    trainingAreasRes,
    signoffsDayRes,
    qcReviewsRes,
    allergenReviewsRes,
    allergenLogsRes,
    calibrationChecksRes,
  ] = await Promise.all([
    supabaseAdmin
      .from("food_temp_logs")
      .select("id", { count: "exact", head: true })
      .eq("org_id", orgId)
      .eq("location_id", locationId)
      .gte("at", d0.toISOString())
      .lt("at", d1.toISOString()),

    supabaseAdmin
      .from("food_temp_logs")
      .select("id", { count: "exact", head: true })
      .eq("org_id", orgId)
      .eq("location_id", locationId)
      .eq("status", "fail")
      .gte("at", sevenDaysAgo.toISOString())
      .lt("at", d1.toISOString()),

    supabaseAdmin
      .from("food_temp_logs")
      .select("*")
      .eq("org_id", orgId)
      .eq("location_id", locationId)
      .gte("at", d0.toISOString())
      .lt("at", d1.toISOString())
      .order("at", { ascending: false })
      .limit(200),

    supabaseAdmin
      .from("cleaning_tasks")
      .select("id, frequency, category, task, weekday, month_day")
      .eq("org_id", orgId)
      .eq("location_id", locationId)
      .limit(5000),

    supabaseAdmin
      .from("cleaning_task_runs")
      .select("id, org_id, task_id, run_on, done_at, done_by, location_id")
      .eq("org_id", orgId)
      .eq("location_id", locationId)
      .eq("run_on", selectedDateISO)
      .order("done_at", { ascending: false })
      .limit(5000),

    supabaseAdmin
      .from("incidents")
      .select(
        "id,happened_on,type,details,immediate_action,preventive_action,created_by,created_at"
      )
      .eq("org_id", orgId)
      .eq("location_id", locationId)
      .gte("happened_on", isoDate(ninetyDaysAgo))
      .lte("happened_on", selectedDateISO)
      .order("happened_on", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(500),

    supabaseAdmin
      .from("incidents")
      .select("id", { count: "exact", head: true })
      .eq("org_id", orgId)
      .eq("location_id", locationId)
      .eq("happened_on", selectedDateISO),

    supabaseAdmin
      .from("incidents")
      .select("id", { count: "exact", head: true })
      .eq("org_id", orgId)
      .eq("location_id", locationId)
      .gte("happened_on", isoDate(sevenDaysAgo))
      .lte("happened_on", selectedDateISO),

    supabaseAdmin
      .from("staff_absences")
      .select(`
        id,
        start_date,
        end_date,
        absence_type,
        is_half_day,
        half_day_period,
        notes,
        operational_impact,
        status,
        created_at,
        team_member_id,
        staff:team_members!staff_absences_team_member_id_fkey(initials,name,role)
      `)
      .eq("org_id", orgId)
      .or(`location_id.eq.${locationId},location_id.is.null`)
      .gte("end_date", isoDate(ninetyDaysAgo))
      .lte("start_date", selectedDateISO)
      .order("start_date", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(500),

    supabaseAdmin
      .from("trainings")
      .select(`
        id,
        expires_on,
        team_member:team_members!trainings_team_member_id_fkey!inner(location_id)
      `)
      .eq("org_id", orgId)
      .eq("team_member.location_id", locationId)
      .limit(5000),

    supabaseAdmin
      .from("trainings")
      .select(`
        id,
        team_member_id,
        type,
        awarded_on,
        expires_on,
        provider_name,
        course_key,
        notes,
        created_at,
        team_member:team_members!trainings_team_member_id_fkey!inner(name,initials,location_id)
      `)
      .eq("org_id", orgId)
      .eq("team_member.location_id", locationId)
      .order("expires_on", { ascending: true, nullsFirst: false })
      .order("awarded_on", { ascending: false, nullsFirst: false })
      .limit(500),

    supabaseAdmin
      .from("team_members")
      .select("id,name,initials,role,active,user_id,training_areas,location_id")
      .eq("org_id", orgId)
      .eq("location_id", locationId)
      .eq("active", true)
      .order("name", { ascending: true })
      .limit(5000),

    supabaseAdmin
      .from("daily_signoffs")
      .select("id, signoff_on, signed_by, notes, created_at, location_id")
      .eq("org_id", orgId)
      .eq("location_id", locationId)
      .eq("signoff_on", selectedDateISO)
      .order("created_at", { ascending: false })
      .limit(200),

    supabaseAdmin
      .from("staff_qc_reviews")
      .select(`
        id,
        reviewed_on,
        rating,
        notes,
        staff_id,
        manager_id,
        staff:team_members!staff_qc_reviews_staff_fkey(initials,name),
        manager:team_members!staff_qc_reviews_manager_fkey(initials,name)
      `)
      .eq("org_id", orgId)
      .eq("location_id", locationId)
      .order("reviewed_on", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(200),

    supabaseAdmin
      .from("allergen_review")
      .select("id, last_reviewed, reviewer, interval_days, created_at")
      .eq("org_id", orgId)
      .order("created_at", { ascending: false })
      .limit(200),

    supabaseAdmin
      .from("allergen_change_logs")
      .select(
        "id, created_at, action, item_name, category_before, category_after, staff_initials"
      )
      .eq("org_id", orgId)
      .eq("location_id", locationId)
      .order("created_at", { ascending: false })
      .limit(500),

    supabaseAdmin
      .from("calibration_checks")
      .select(
        "id, checked_on, staff_initials, cold_storage_checked, probes_checked, thermometers_checked, notes, created_at"
      )
      .eq("org_id", orgId)
      .eq("location_id", locationId)
      .gte("checked_on", isoDate(ninetyDaysAgo))
      .lte("checked_on", selectedDateISO)
      .order("checked_on", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(500),
  ]);

  const firstErr =
    tempsTodayRes.error ||
    tempsFails7dRes.error ||
    todayTempLogsRes.error ||
    cleaningTasksRes.error ||
    cleaningRunsDayRes.error ||
    incidentsListRes.error ||
    incidentsTodayRes.error ||
    incidents7dRes.error ||
    staffAbsencesRes.error ||
    trainingsForKpiRes.error ||
    trainingRecordsRes.error ||
    trainingAreasRes.error ||
    signoffsDayRes.error ||
    qcReviewsRes.error ||
    allergenReviewsRes.error ||
    allergenLogsRes.error ||
    calibrationChecksRes.error;

  if (firstErr) throw firstErr;

  const tempsSummary: TempSummary = {
    today: tempsTodayRes.count ?? 0,
    fails7d: tempsFails7dRes.count ?? 0,
  };

  const trainingKpiRows: Array<{ expires_on: string | null }> =
    (trainingsForKpiRes.data as any[]) ?? [];

  let trainingExpired = 0;
  let trainingDueSoon = 0;

  for (const t of trainingKpiRows) {
    if (!t.expires_on) continue;
    const exp = new Date(t.expires_on);
    exp.setHours(0, 0, 0, 0);
    if (Number.isNaN(exp.getTime())) continue;

    if (exp < trainingBase) trainingExpired++;
    else if (exp <= thirtyDaysAhead) trainingDueSoon++;
  }

  const trainingRows: TrainingRow[] = ((trainingRecordsRes.data as any[]) ?? []).map(
    (r: any) => ({
      id: String(r.id),
      team_member_id: r.team_member_id ? String(r.team_member_id) : null,
      type: r.type ?? null,
      awarded_on: r.awarded_on ? String(r.awarded_on) : null,
      expires_on: r.expires_on ? String(r.expires_on) : null,
      provider_name: r.provider_name ?? null,
      course_key: r.course_key ?? null,
      notes: r.notes ?? null,
      created_at: r.created_at ? String(r.created_at) : null,
      team_member: r.team_member
        ? {
            name: r.team_member.name ?? null,
            initials: r.team_member.initials ?? null,
            location_id: r.team_member.location_id
              ? String(r.team_member.location_id)
              : null,
          }
        : null,
    })
  );

  const trainingAreasRows = ((trainingAreasRes.data ?? []) as any[]) as TeamMemberOption[];

  const tasksRaw: any[] = (cleaningTasksRes.data as any[]) ?? [];
  const tasks: CleaningTask[] = tasksRaw.map((t) => ({
    id: String(t.id),
    frequency: (String(t.frequency ?? "daily").toLowerCase() as any) ?? "daily",
    category: t.category ?? null,
    task: t.task ?? null,
    weekday: t.weekday != null ? Number(t.weekday) : null,
    month_day: t.month_day != null ? Number(t.month_day) : null,
  }));

  const taskById = new Map<string, CleaningTask>();
  for (const t of tasks) taskById.set(t.id, t);

  const runsRaw: CleaningTaskRun[] = ((cleaningRunsDayRes.data as any[]) ?? []).map(
    (r: any) => ({
      id: String(r.id),
      org_id: String(r.org_id),
      task_id: String(r.task_id),
      run_on: String(r.run_on),
      done_by: r.done_by ? String(r.done_by) : null,
      done_at: r.done_at ? String(r.done_at) : null,
      location_id: r.location_id ? String(r.location_id) : null,
    })
  );

  const dueThatDay = tasks.filter((t) => isDueOn(t, selectedDateISO));
  const runTaskIds = new Set<string>(runsRaw.map((r) => String(r.task_id)));

  const byCat = new Map<string, { total: number; done: number }>();
  for (const t of dueThatDay) {
    const cat = (t.category ?? "Uncategorised").toString();
    const cur = byCat.get(cat) ?? { total: 0, done: 0 };
    cur.total += 1;
    if (runTaskIds.has(t.id)) cur.done += 1;
    byCat.set(cat, cur);
  }

  const cleaningCategoryProgress: CleaningCategoryProgress[] = Array.from(
    byCat.entries()
  )
    .map(([category, v]) => ({ category, done: v.done, total: v.total }))
    .sort((a, b) => a.category.localeCompare(b.category));

  const cleaningTotal = cleaningCategoryProgress.reduce((acc, c) => acc + c.total, 0);
  const cleaningDoneTotal = cleaningCategoryProgress.reduce(
    (acc, c) => acc + c.done,
    0
  );

  const cleaningActivity: CleaningActivityRow[] = runsRaw.map((r) => {
    const doneAt = r.done_at ? new Date(r.done_at) : null;
    const t = taskById.get(String(r.task_id));
    return {
      id: String(r.id),
      time: formatTimeHM(doneAt),
      category: (t?.category ?? "Uncategorised").toString(),
      staff: r.done_by ? String(r.done_by) : null,
      notes: null,
      task: t?.task ?? null,
    };
  });

  const incidentsHistory: UnifiedIncidentRow[] = ((incidentsListRes.data as any[]) ?? []).map(
    (r: any) => ({
      id: String(r.id),
      happened_on: String(r.happened_on),
      created_at: r.created_at ? String(r.created_at) : null,
      type: r.type ?? "Incident",
      details: r.details ?? null,
      immediate_action: r.immediate_action ?? null,
      corrective_action: r.preventive_action ?? null,
      created_by: r.created_by ? String(r.created_by) : null,
      source: "incident",
    })
  );

  const incidentsToday = incidentsTodayRes.count ?? 0;
  const incidents7d = incidents7dRes.count ?? 0;

  const staffAbsences: StaffAbsenceRow[] = ((staffAbsencesRes.data as any[]) ?? []).map(
    (r: any) => ({
      id: String(r.id),
      start_date: String(r.start_date),
      end_date: String(r.end_date),
      created_at: r.created_at ? String(r.created_at) : null,
      absence_type: String(r.absence_type ?? "other"),
      is_half_day: !!r.is_half_day,
      half_day_period: r.half_day_period ? String(r.half_day_period) : null,
      notes: r.notes ?? null,
      operational_impact: r.operational_impact ?? null,
      status: String(r.status ?? "approved"),
      team_member_id: r.team_member_id ? String(r.team_member_id) : null,
      staff: r.staff
        ? {
            initials: r.staff.initials ?? null,
            name: r.staff.name ?? null,
            role: r.staff.role ?? null,
          }
        : null,
    })
  );

  const staffOffToday = staffAbsences.filter(
    (r) =>
      r.status === "approved" &&
      r.start_date <= selectedDateISO &&
      r.end_date >= selectedDateISO
  ).length;

  const staffAbsences30d = staffAbsences.filter(
    (r) =>
      r.status === "approved" &&
      r.end_date >= isoDate(thirtyDaysAgo) &&
      r.start_date <= selectedDateISO
  ).length;

  const todayTemps: TempLogRow[] = ((todayTempLogsRes.data as any[]) ?? []).map(
    (r: any) => {
      const at = r.at ? new Date(r.at) : null;
      return {
        id: String(r.id),
        time: at ? formatTimeHM(at) : null,
        staff: r.staff_initials ? String(r.staff_initials) : null,
        area: r.area ?? null,
        item: r.note ?? null,
        temp_c: r.temp_c != null ? Number(r.temp_c) : null,
        status: r.status ?? null,
      };
    }
  );

  const tempFailsToday = await fetchTempFailuresUnifiedForDay(
    orgId,
    locationId,
    d0,
    d1
  );

  const signoffsToday: SignoffRow[] = ((signoffsDayRes.data as any[]) ?? []).map(
    (r: any) => ({
      id: String(r.id),
      signoff_on: String(r.signoff_on),
      signed_by: r.signed_by ? String(r.signed_by) : null,
      notes: r.notes ? String(r.notes) : null,
      created_at: r.created_at ? String(r.created_at) : null,
    })
  );

  const signoffSummary: SignoffSummary = {
    todayCount: signoffsToday.length,
  };

  const qcReviews: StaffQcReviewRow[] = ((qcReviewsRes.data as any[]) ?? []).map(
    (r: any) => ({
      id: String(r.id),
      reviewed_on: String(r.reviewed_on),
      rating: Number(r.rating ?? 0),
      notes: r.notes ?? null,
      staff_id: r.staff_id ? String(r.staff_id) : null,
      manager_id: r.manager_id ? String(r.manager_id) : null,
      staff: r.staff
        ? {
            initials: r.staff.initials ?? null,
            name: r.staff.name ?? null,
          }
        : null,
      manager: r.manager
        ? {
            initials: r.manager.initials ?? null,
            name: r.manager.name ?? null,
          }
        : null,
    })
  );

  const allergenReviews: AllergenReviewRow[] = ((allergenReviewsRes.data as any[]) ?? []).map(
    (r: any) => ({
      id: String(r.id),
      last_reviewed: r.last_reviewed ? String(r.last_reviewed) : null,
      reviewer: r.reviewer ?? null,
      interval_days:
        r.interval_days != null && Number.isFinite(Number(r.interval_days))
          ? Number(r.interval_days)
          : 180,
      created_at: r.created_at ? String(r.created_at) : null,
    })
  );

  const allergenLogs: AllergenChangeLogRow[] = ((allergenLogsRes.data as any[]) ?? []).map(
    (r: any) => ({
      id: String(r.id),
      created_at: r.created_at ? String(r.created_at) : null,
      action: r.action ?? null,
      item_name: r.item_name ?? null,
      category_before: r.category_before ?? null,
      category_after: r.category_after ?? null,
      staff_initials: r.staff_initials ?? null,
    })
  );

  const calibrationChecks: CalibrationCheckRow[] = ((calibrationChecksRes.data as any[]) ?? []).map(
    (r: any) => ({
      id: String(r.id),
      checked_on: String(r.checked_on),
      staff_initials: r.staff_initials ? String(r.staff_initials) : null,
      all_equipment_calibrated:
        !!r.cold_storage_checked &&
        !!r.probes_checked &&
        !!r.thermometers_checked,
      notes: r.notes ?? null,
      created_at: r.created_at ? String(r.created_at) : null,
    })
  );

  let calibrationDue = false;
  if (calibrationChecks.length === 0) {
    calibrationDue = true;
  } else {
    const latest = calibrationChecks[0];
    const last = new Date(latest.checked_on);
    last.setHours(0, 0, 0, 0);

    const due = new Date(last);
    due.setDate(due.getDate() + 30);

    const today = new Date(selectedDateISO);
    today.setHours(0, 0, 0, 0);

    calibrationDue = today > due;
  }

  return {
    orgId,
    locationId,
    locationName: locationRes.data?.name ?? "Demo location",
    locations: ((locationsRes.data ?? []) as any[]).map((r: any) => ({
      id: String(r.id),
      name: r.name ?? "Unnamed",
    })),
    selectedDateISO,
    selectedDateLabel: formatPrettyDate(selectedDateISO),
    calibrationDue,

    tempsSummary,
    cleaningTotal,
    cleaningDoneTotal,
    incidentsToday,
    incidents7d,
    staffOffToday,
    staffAbsences30d,
    trainingExpired,
    trainingDueSoon,

    todayTemps,
    cleaningActivity,
    cleaningCategoryProgress,
    tempFailsToday,
    incidentsHistory,
    staffAbsences,

    signoffsToday,
    signoffSummary,

    qcReviews,

    allergenReviews,
    allergenLogs,

    trainingRows,
    trainingAreasRows,

    calibrationChecks,
  };
}
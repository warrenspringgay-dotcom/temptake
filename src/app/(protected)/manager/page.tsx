"use client";

import React, { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { supabase } from "@/lib/supabaseBrowser";
import { getActiveOrgIdClient } from "@/lib/orgClient";
import { getActiveLocationIdClient } from "@/lib/locationClient";

type LocationOption = { id: string; name: string };

type TempSummary = { today: number; fails7d: number };

type TodayTempRow = {
  id: string;
  time: string;
  staff: string;
  item: string;
  area: string;
  temp_c: number | null;
  status: string | null;
};

type CleaningTask = {
  id: string;
  frequency: "daily" | "weekly" | "monthly";
  category: string | null;
  task: string | null;
  weekday: number | null; // Mon=1..Sun=7 (your pattern)
  month_day: number | null;
};

type CleaningTaskRun = {
  id: string;
  task_id: string;
  run_on: string; // yyyy-mm-dd
  done_by: string | null;
  done_at: string | null;
};

type CleaningActivityRow = {
  id: string;
  time: string | null;
  category: string;
  staff: string | null;
  task: string | null;
};

type CleaningCategoryProgressRow = {
  category: string;
  done: number;
  total: number;
};

type CleaningIncident = {
  id: string;
  happened_on: string;
  type: string | null;
  details: string | null;
  corrective_action: string | null;
  preventive_action: string | null;
  created_by: string | null;
  created_at: string | null;
};

type IncidentSummary = { todayCount: number; last7Count: number };

type SignoffRow = {
  id: string;
  signoff_on: string; // yyyy-mm-dd
  signed_by: string | null;
  notes: string | null;
  created_at: string | null;
};

type TeamMemberOption = {
  id: string;
  initials: string | null;
  name: string;
  role: string | null;
  active: boolean;
  user_id: string | null;
};

type StaffQcReviewRow = {
  id: string;
  reviewed_on: string;
  score: number;
  notes: string | null;
  staff_id: string;
  manager_id: string;
  staff?: { initials: string | null; name: string | null } | null;
  manager?: { initials: string | null; name: string | null } | null;
};

type StaffAssessment = {
  staffId: string;
  staffLabel: string;
  rangeDays: number;
  cleaningDone: number;
  tempLogs: number;
  tempFails: number;
  incidents: number;
  qcAvg30d: number | null;
  qcCount30d: number;
};

const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

function formatPrettyDate(d: Date) {
  const wd = WEEKDAYS[d.getDay()];
  const day = d.getDate();
  const month = MONTHS[d.getMonth()];
  const year = d.getFullYear();
  return `${wd} ${day} ${month} ${year}`;
}

function formatTimeHM(d: Date | null | undefined): string | null {
  if (!d) return null;
  const hours = String(d.getHours()).padStart(2, "0");
  const mins = String(d.getMinutes()).padStart(2, "0");
  return `${hours}:${mins}`;
}

const isoDate = (d: Date) => d.toISOString().slice(0, 10);

const cls = (...p: Array<string | false | null | undefined>) => p.filter(Boolean).join(" ");

const PAGE = "mx-auto w-full md:max-w-6xl";
const CARD = "rounded-3xl border border-white/40 bg-white/70 shadow-lg backdrop-blur-md";

const getDow1to7 = (ymd: string) => ((new Date(ymd).getDay() + 6) % 7) + 1; // Mon=1..Sun=7
const getDom = (ymd: string) => new Date(ymd).getDate();

function isDueOn(t: CleaningTask, ymd: string) {
  if (t.frequency === "daily") return true;
  if (t.frequency === "weekly") return t.weekday === getDow1to7(ymd);
  return t.month_day === getDom(ymd);
}

function KpiTile({
  title,
  value,
  sub,
  tone,
  icon,
}: {
  title: string;
  value: React.ReactNode;
  sub: React.ReactNode;
  tone: "neutral" | "ok" | "warn" | "danger";
  icon?: React.ReactNode;
}) {
  const toneCls =
    tone === "danger"
      ? "border-red-200 bg-red-50/90"
      : tone === "warn"
      ? "border-amber-200 bg-amber-50/90"
      : tone === "ok"
      ? "border-emerald-200 bg-emerald-50/90"
      : "border-slate-200 bg-white/90";

  const accentCls =
    tone === "danger"
      ? "bg-red-400"
      : tone === "warn"
      ? "bg-amber-400"
      : tone === "ok"
      ? "bg-emerald-400"
      : "bg-slate-300";

  return (
    <motion.div whileHover={{ y: -3 }} className={cls("relative rounded-2xl border p-4 shadow-sm overflow-hidden", toneCls, "min-h-[120px]")}>
      <div className={cls("absolute left-0 top-3 bottom-3 w-1.5 rounded-full opacity-80", accentCls)} />
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-[11px] font-extrabold uppercase tracking-[0.22em] text-slate-700/90">{title}</div>
          <div className="mt-2 text-3xl font-extrabold text-slate-900 leading-none">{value}</div>
        </div>
        {icon ? <div className="shrink-0">{icon}</div> : null}
      </div>
      <div className="mt-auto pt-3 text-[11px] font-medium text-slate-600">{sub}</div>
    </motion.div>
  );
}

function tmLabel(t: { initials: string | null; name: string | null }) {
  const ini = (t.initials ?? "").toString().trim().toUpperCase();
  const nm = (t.name ?? "").toString().trim();
  if (ini && nm) return `${ini} · ${nm}`;
  if (ini) return ini;
  return nm || "—";
}

export default function ManagerDashboardPage() {
  const [orgId, setOrgId] = useState<string | null>(null);
  const [locationId, setLocationId] = useState<string | null>(null);
  const [locations, setLocations] = useState<LocationOption[]>([]);
  const [locationLoading, setLocationLoading] = useState(false);

  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const todayISO = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return isoDate(d);
  }, []);

  const [selectedDateISO, setSelectedDateISO] = useState<string>(todayISO);

  const [tempsSummary, setTempsSummary] = useState<TempSummary>({ today: 0, fails7d: 0 });
  const [todayTemps, setTodayTemps] = useState<TodayTempRow[]>([]);

  const [cleaningCategoryProgress, setCleaningCategoryProgress] = useState<CleaningCategoryProgressRow[]>([]);
  const [cleaningActivity, setCleaningActivity] = useState<CleaningActivityRow[]>([]);

  const [incidentSummary, setIncidentSummary] = useState<IncidentSummary>({ todayCount: 0, last7Count: 0 });
  const [incidentsToday, setIncidentsToday] = useState<CleaningIncident[]>([]);

  const [trainingDueSoon, setTrainingDueSoon] = useState(0);
  const [trainingExpired, setTrainingExpired] = useState(0);

  const [showAllTemps, setShowAllTemps] = useState(false);
  const [showAllCleaning, setShowAllCleaning] = useState(false);
  const [showAllIncidents, setShowAllIncidents] = useState(false);

  // Day sign-offs
  const [signoffsToday, setSignoffsToday] = useState<SignoffRow[]>([]);
  const [showAllSignoffs, setShowAllSignoffs] = useState(false);
  const [signoffOpen, setSignoffOpen] = useState(false);
  const [signoffInitials, setSignoffInitials] = useState("");
  const [signoffNotes, setSignoffNotes] = useState("");
  const [signoffSaving, setSignoffSaving] = useState(false);

  // Manager QC
  const [qcOpen, setQcOpen] = useState(false);
  const [teamOptions, setTeamOptions] = useState<TeamMemberOption[]>([]);
  const [managerTeamMember, setManagerTeamMember] = useState<TeamMemberOption | null>(null);
  const [qcReviews, setQcReviews] = useState<StaffQcReviewRow[]>([]);
  const [qcLoading, setQcLoading] = useState(false);

  // Staff assessment modal (NEW)
  const [assessmentOpen, setAssessmentOpen] = useState(false);
  const [assessmentLoading, setAssessmentLoading] = useState(false);
  const [assessmentErr, setAssessmentErr] = useState<string | null>(null);
  const [assessmentStaffId, setAssessmentStaffId] = useState<string>("");
  const [assessmentDays, setAssessmentDays] = useState<number>(7);
  const [assessment, setAssessment] = useState<StaffAssessment | null>(null);

  // Load org + locations
  useEffect(() => {
    (async () => {
      const oId = await getActiveOrgIdClient();
      setOrgId(oId ?? null);
      if (!oId) return;

      setLocationLoading(true);
      try {
        const { data, error } = await supabase.from("locations").select("id,name").eq("org_id", oId).order("name");
        if (error) throw error;

        const locs =
          data?.map((r: any) => ({
            id: String(r.id),
            name: r.name ?? "Unnamed",
          })) ?? [];
        setLocations(locs);

        const activeLoc = await getActiveLocationIdClient();
        if (activeLoc) setLocationId(activeLoc);
        else if (locs[0]) setLocationId(locs[0].id);
      } catch (e: any) {
        console.error(e);
        setErr(e?.message ?? "Failed to load locations.");
      } finally {
        setLocationLoading(false);
      }
    })();
  }, []);

  // Load team options + logged-in team member
  useEffect(() => {
    if (!orgId) return;

    (async () => {
      try {
        const { data, error } = await supabase
          .from("team_members")
          .select("id,name,initials,role,active,user_id")
          .eq("org_id", orgId)
          .eq("active", true)
          .order("name", { ascending: true })
          .limit(5000);

        if (error) throw error;
        setTeamOptions((data ?? []) as TeamMemberOption[]);
      } catch (e) {
        console.error(e);
        setTeamOptions([]);
      }

      try {
        const { data: auth } = await supabase.auth.getUser();
        const user = auth?.user ?? null;
        if (!user) {
          setManagerTeamMember(null);
          return;
        }

        const { data, error } = await supabase
          .from("team_members")
          .select("id,name,initials,role,active,user_id")
          .eq("org_id", orgId)
          .eq("user_id", user.id)
          .maybeSingle();

        if (error) throw error;
        setManagerTeamMember((data as TeamMemberOption) ?? null);
      } catch (e) {
        console.error(e);
        setManagerTeamMember(null);
      }
    })();
  }, [orgId]);

  // Auto-populate signoff initials when the modal opens (NO UI CHANGE)
  useEffect(() => {
    if (!signoffOpen) return;
    if (signoffInitials.trim()) return;
    const ini = managerTeamMember?.initials?.trim().toUpperCase() ?? "";
    if (ini) setSignoffInitials(ini);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signoffOpen, managerTeamMember]);

  // Hidden open for staff assessment modal (NO UI CHANGE): Ctrl+Shift+A
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const tag = target?.tagName?.toLowerCase() ?? "";
      const isTypingField = tag === "input" || tag === "textarea" || (target as any)?.isContentEditable;

      if (isTypingField) return;

      const key = e.key?.toLowerCase();
      const combo = (e.ctrlKey || e.metaKey) && e.shiftKey && key === "a";
      if (!combo) return;

      e.preventDefault();
      setAssessmentOpen((v) => !v);
      setAssessmentErr(null);
      setAssessment(null);
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  // Refresh data when date/location changes
  useEffect(() => {
    if (!orgId || !locationId) return;
    refreshAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orgId, locationId, selectedDateISO]);

  async function loadQcSummary() {
    if (!orgId || !locationId) return;
    setQcLoading(true);
    try {
      const { data, error } = await supabase
        .from("staff_qc_reviews")
        .select(
          `
          id,
          reviewed_on,
          score,
          notes,
          staff_id,
          manager_id,
          staff:team_members!staff_qc_reviews_staff_fkey(initials,name),
          manager:team_members!staff_qc_reviews_manager_fkey(initials,name)
        `
        )
        .eq("org_id", orgId)
        .eq("location_id", locationId)
        .order("reviewed_on", { ascending: false })
        .order("created_at", { ascending: false })
        .limit(50);

      if (error) throw error;
      setQcReviews(((data ?? []) as any[]) as StaffQcReviewRow[]);
    } catch (e) {
      console.error(e);
      setQcReviews([]);
    } finally {
      setQcLoading(false);
    }
  }

  async function refreshAll() {
    if (!orgId || !locationId) return;
    setLoading(true);
    setErr(null);

    try {
      const d0 = new Date(selectedDateISO);
      d0.setHours(0, 0, 0, 0);
      const d1 = new Date(d0);
      d1.setDate(d1.getDate() + 1);

      const sevenDaysAgo = new Date(d0);
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      const trainingBase = new Date();
      trainingBase.setHours(0, 0, 0, 0);
      const thirtyDaysAhead = new Date(trainingBase);
      thirtyDaysAhead.setDate(thirtyDaysAhead.getDate() + 30);

      const [
        tempsCountRes,
        fails7dRes,
        tempsListRes,

        cleaningTasksRes,
        cleaningRunsDayRes,

        incidentsDayRes,
        incidents7dRes,

        trainingsRes,

        signoffsDayRes,
      ] = await Promise.all([
        supabase
          .from("food_temp_logs")
          .select("id", { count: "exact", head: true })
          .eq("org_id", orgId)
          .eq("location_id", locationId)
          .gte("at", d0.toISOString())
          .lt("at", d1.toISOString()),

        supabase
          .from("food_temp_logs")
          .select("id", { count: "exact", head: true })
          .eq("org_id", orgId)
          .eq("location_id", locationId)
          .eq("status", "fail")
          .gte("at", sevenDaysAgo.toISOString())
          .lt("at", d1.toISOString()),

        supabase
          .from("food_temp_logs")
          .select("id,at,area,target_key,temp_c,status,note,staff_initials")
          .eq("org_id", orgId)
          .eq("location_id", locationId)
          .gte("at", d0.toISOString())
          .lt("at", d1.toISOString())
          .order("at", { ascending: false })
          .limit(200),

        supabase
          .from("cleaning_tasks")
          .select("id, frequency, category, task, weekday, month_day")
          .eq("org_id", orgId)
          .eq("location_id", locationId)
          .limit(5000),

        supabase
          .from("cleaning_task_runs")
          .select("id, task_id, run_on, done_at, done_by")
          .eq("org_id", orgId)
          .eq("location_id", locationId)
          .eq("run_on", selectedDateISO)
          .order("done_at", { ascending: false })
          .limit(5000),

        supabase
          .from("cleaning_incidents")
          .select("id,happened_on,type,details,corrective_action,preventive_action,created_by,created_at")
          .eq("org_id", orgId)
          .eq("location_id", locationId)
          .eq("happened_on", selectedDateISO)
          .order("created_at", { ascending: false })
          .limit(500),

        supabase
          .from("cleaning_incidents")
          .select("id", { count: "exact", head: true })
          .eq("org_id", orgId)
          .eq("location_id", locationId)
          .gte("happened_on", isoDate(sevenDaysAgo))
          .lte("happened_on", selectedDateISO),

        supabase
          .from("trainings")
          .select("id, expires_on")
          .eq("org_id", orgId)
          .limit(5000),

        supabase
          .from("daily_signoffs")
          .select("id, signoff_on, signed_by, notes, created_at")
          .eq("org_id", orgId)
          .eq("location_id", locationId)
          .eq("signoff_on", selectedDateISO)
          .order("created_at", { ascending: false })
          .limit(200),
      ]);

      const firstError =
        tempsCountRes.error ||
        fails7dRes.error ||
        tempsListRes.error ||
        cleaningTasksRes.error ||
        cleaningRunsDayRes.error ||
        incidentsDayRes.error ||
        incidents7dRes.error ||
        trainingsRes.error ||
        signoffsDayRes.error;

      if (firstError) throw firstError;

      setTempsSummary({
        today: tempsCountRes.count ?? 0,
        fails7d: fails7dRes.count ?? 0,
      });

      const tempsData: any[] = (tempsListRes.data as any[]) ?? [];
      setTodayTemps(
        tempsData.map((r) => {
          const ts = r.at ? new Date(r.at) : null;
          return {
            id: String(r.id),
            time: formatTimeHM(ts) ?? "—",
            staff: (r.staff_initials ?? "—").toString(),
            item: (r.target_key ?? r.note ?? "—").toString(),
            area: (r.area ?? "—").toString(),
            temp_c: r.temp_c != null ? Number(r.temp_c) : null,
            status: r.status ?? null,
          };
        })
      );

      const tRows: any[] = (trainingsRes.data as any[]) ?? [];
      let expired = 0;
      let dueSoon = 0;
      for (const t of tRows) {
        if (!t.expires_on) continue;
        const exp = new Date(t.expires_on);
        exp.setHours(0, 0, 0, 0);
        if (Number.isNaN(exp.getTime())) continue;

        if (exp < trainingBase) expired++;
        else if (exp <= thirtyDaysAhead) dueSoon++;
      }
      setTrainingExpired(expired);
      setTrainingDueSoon(dueSoon);

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

      const runsRaw: CleaningTaskRun[] = ((cleaningRunsDayRes.data as any[]) ?? []).map((r: any) => ({
        id: String(r.id),
        task_id: String(r.task_id),
        run_on: String(r.run_on),
        done_by: r.done_by ? String(r.done_by) : null,
        done_at: r.done_at ? String(r.done_at) : null,
      }));

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

      setCleaningCategoryProgress(
        Array.from(byCat.entries())
          .map(([category, v]) => ({
            category,
            done: v.done,
            total: v.total,
          }))
          .sort((a, b) => a.category.localeCompare(b.category))
      );

      setCleaningActivity(
        runsRaw.map((r) => {
          const doneAt = r.done_at ? new Date(r.done_at) : null;
          const t = taskById.get(String(r.task_id));
          return {
            id: String(r.id),
            time: formatTimeHM(doneAt),
            category: (t?.category ?? "Uncategorised").toString(),
            staff: r.done_by ? String(r.done_by) : null,
            task: t?.task ?? null,
          };
        })
      );

      const incDay = ((incidentsDayRes.data as any[]) ?? []).map((r: any) => ({
        id: String(r.id),
        happened_on: String(r.happened_on),
        type: r.type ? String(r.type) : null,
        details: r.details ? String(r.details) : null,
        corrective_action: r.corrective_action ? String(r.corrective_action) : null,
        preventive_action: r.preventive_action ? String(r.preventive_action) : null,
        created_by: r.created_by ? String(r.created_by) : null,
        created_at: r.created_at ? String(r.created_at) : null,
      })) as CleaningIncident[];

      setIncidentsToday(incDay);
      setIncidentSummary({
        todayCount: incDay.length,
        last7Count: incidents7dRes.count ?? 0,
      });

      const soRows = ((signoffsDayRes.data as any[]) ?? []).map((r: any) => ({
        id: String(r.id),
        signoff_on: String(r.signoff_on),
        signed_by: r.signed_by ? String(r.signed_by) : null,
        notes: r.notes ? String(r.notes) : null,
        created_at: r.created_at ? String(r.created_at) : null,
      })) as SignoffRow[];

      setSignoffsToday(soRows);

      setShowAllTemps(false);
      setShowAllCleaning(false);
      setShowAllIncidents(false);
      setShowAllSignoffs(false);

      await loadQcSummary();
    } catch (e: any) {
      console.error(e);
      setErr(e?.message ?? "Failed to load manager dashboard.");
    } finally {
      setLoading(false);
    }
  }

  async function createDaySignoff() {
    if (!orgId || !locationId) return;

    const initials = signoffInitials.trim().toUpperCase();
    if (!initials) {
      alert("Enter initials to sign off.");
      return;
    }

    setSignoffSaving(true);
    try {
      const payload = {
        org_id: orgId,
        location_id: locationId,
        signoff_on: selectedDateISO,
        signed_by: initials,
        notes: signoffNotes.trim() || null,
      };

      const { data, error } = await supabase
        .from("daily_signoffs")
        .insert(payload)
        .select("id, signoff_on, signed_by, notes, created_at")
        .single();

      if (error) throw error;

      const row: SignoffRow = {
        id: String((data as any).id),
        signoff_on: String((data as any).signoff_on),
        signed_by: (data as any).signed_by ? String((data as any).signed_by) : null,
        notes: (data as any).notes ? String((data as any).notes) : null,
        created_at: (data as any).created_at ? String((data as any).created_at) : null,
      };

      setSignoffsToday((prev) => [row, ...prev]);
      setSignoffInitials("");
      setSignoffNotes("");
      setSignoffOpen(false);
    } catch (e: any) {
      console.error(e);
      alert(e?.message ?? "Failed to sign off the day.");
    } finally {
      setSignoffSaving(false);
    }
  }

  async function loadStaffAssessment(staffId: string, days: number) {
    if (!orgId || !locationId) return;

    const staff = teamOptions.find((t) => t.id === staffId) ?? null;
    const initials = (staff?.initials ?? "").toString().trim().toUpperCase();

    setAssessmentLoading(true);
    setAssessmentErr(null);
    setAssessment(null);

    try {
      if (!staff || !initials) throw new Error("Selected staff member has no initials.");

      const end = new Date(selectedDateISO);
      end.setHours(23, 59, 59, 999);

      const start = new Date(selectedDateISO);
      start.setHours(0, 0, 0, 0);
      start.setDate(start.getDate() - (days - 1));

      const startIsoDate = isoDate(start);
      const endIsoDate = isoDate(end);

      const qcStart = new Date(selectedDateISO);
      qcStart.setHours(0, 0, 0, 0);
      qcStart.setDate(qcStart.getDate() - 29);
      const qcStartIso = isoDate(qcStart);

      const [cleaningRunsRes, tempLogsRes, tempFailsRes, incidentsRes, qcRes] = await Promise.all([
        supabase
          .from("cleaning_task_runs")
          .select("id", { count: "exact", head: true })
          .eq("org_id", orgId)
          .eq("location_id", locationId)
          .eq("done_by", initials)
          .gte("run_on", startIsoDate)
          .lte("run_on", endIsoDate),

        supabase
          .from("food_temp_logs")
          .select("id", { count: "exact", head: true })
          .eq("org_id", orgId)
          .eq("location_id", locationId)
          .eq("staff_initials", initials)
          .gte("at", start.toISOString())
          .lte("at", end.toISOString()),

        supabase
          .from("food_temp_logs")
          .select("id", { count: "exact", head: true })
          .eq("org_id", orgId)
          .eq("location_id", locationId)
          .eq("staff_initials", initials)
          .eq("status", "fail")
          .gte("at", start.toISOString())
          .lte("at", end.toISOString()),

        supabase
          .from("cleaning_incidents")
          .select("id", { count: "exact", head: true })
          .eq("org_id", orgId)
          .eq("location_id", locationId)
          .eq("created_by", initials)
          .gte("happened_on", startIsoDate)
          .lte("happened_on", endIsoDate),

        supabase
          .from("staff_qc_reviews")
          .select("score, reviewed_on")
          .eq("org_id", orgId)
          .eq("location_id", locationId)
          .eq("staff_id", staffId)
          .gte("reviewed_on", qcStartIso)
          .lte("reviewed_on", selectedDateISO)
          .limit(500),
      ]);

      const firstErr = cleaningRunsRes.error || tempLogsRes.error || tempFailsRes.error || incidentsRes.error || qcRes.error;
      if (firstErr) throw firstErr;

      const qcRows = (qcRes.data ?? []) as Array<{ score: number }>;
      const qcCount30d = qcRows.length;
      const qcAvg30d =
        qcCount30d > 0
          ? Math.round((qcRows.reduce((a, r) => a + Number(r.score || 0), 0) / qcCount30d) * 10) / 10
          : null;

      setAssessment({
        staffId,
        staffLabel: tmLabel({ initials: staff.initials, name: staff.name }),
        rangeDays: days,
        cleaningDone: cleaningRunsRes.count ?? 0,
        tempLogs: tempLogsRes.count ?? 0,
        tempFails: tempFailsRes.count ?? 0,
        incidents: incidentsRes.count ?? 0,
        qcAvg30d,
        qcCount30d,
      });
    } catch (e: any) {
      console.error(e);
      setAssessmentErr(e?.message ?? "Failed to load staff assessment.");
    } finally {
      setAssessmentLoading(false);
    }
  }

  const headerDate = useMemo(() => formatPrettyDate(new Date(selectedDateISO)), [selectedDateISO]);

  const tempsTone: "neutral" | "ok" | "warn" | "danger" = tempsSummary.fails7d > 0 ? "danger" : "ok";
  const incidentsTone: "neutral" | "ok" | "warn" | "danger" = incidentSummary.todayCount > 0 ? "warn" : "ok";
  const trainingTone: "neutral" | "ok" | "warn" | "danger" =
    trainingExpired > 0 ? "danger" : trainingDueSoon > 0 ? "warn" : "ok";

  const cleaningDoneTotal = cleaningCategoryProgress.reduce((a, r) => a + r.done, 0);
  const cleaningTotal = cleaningCategoryProgress.reduce((a, r) => a + r.total, 0);

  const tempsToRender = showAllTemps ? todayTemps : todayTemps.slice(0, 10);
  const cleaningToRender = showAllCleaning ? cleaningActivity : cleaningActivity.slice(0, 10);
  const incidentsToRender = showAllIncidents ? incidentsToday : incidentsToday.slice(0, 10);
  const signoffsToRender = showAllSignoffs ? signoffsToday : signoffsToday.slice(0, 10);

  return (
    <div className={PAGE}>
      <header className="py-2">
        <div className="text-center">
          <div className="text-[11px] font-extrabold uppercase tracking-[0.22em] text-slate-400">Today</div>
          <h1 className="mt-1 text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">{headerDate}</h1>
        </div>
      </header>

      {err && (
        <div className="mb-4 rounded-2xl border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-800">
          {err}
        </div>
      )}

      {/* KPIs */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <KpiTile title="Temps" value={tempsSummary.today} sub={<span>Fails (7d): {tempsSummary.fails7d}</span>} tone={tempsTone} icon={<span>🌡️</span>} />
        <KpiTile title="Incidents" value={incidentSummary.todayCount} sub={<span>Last 7d: {incidentSummary.last7Count}</span>} tone={incidentsTone} icon={<span>⚠️</span>} />
        <KpiTile title="Training" value={trainingExpired + trainingDueSoon} sub={<span>Due soon (30d): {trainingDueSoon} · Expired: {trainingExpired}</span>} tone={trainingTone} icon={<span>🎓</span>} />
        <KpiTile
          title="Cleaning completion"
          value={
            cleaningTotal > 0 ? (
              <>
                {cleaningDoneTotal}/{cleaningTotal}
              </>
            ) : (
              0
            )
          }
          sub={<span>Done / total (selected day)</span>}
          tone={cleaningTotal > 0 && cleaningDoneTotal === cleaningTotal ? "ok" : "neutral"}
          icon={<span>✅</span>}
        />
      </div>

      {/* Controls row */}
      <div className={cls(CARD, "mt-4 p-3 sm:p-4")}>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setSelectedDateISO((d) => isoDate(new Date(new Date(d).setDate(new Date(d).getDate() - 1))))}
              className="rounded-full border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              ←
            </button>

            <input
              type="date"
              value={selectedDateISO}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSelectedDateISO(e.target.value)}
              className="h-10 rounded-full border border-slate-200 bg-white px-3 text-sm"
            />

            <button
              type="button"
              onClick={() => setSelectedDateISO((d) => isoDate(new Date(new Date(d).setDate(new Date(d).getDate() + 1))))}
              className="rounded-full border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              →
            </button>

            <select
              value={locationId ?? ""}
              onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setLocationId(e.target.value)}
              disabled={locationLoading}
              className="h-10 rounded-full border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700"
            >
              {locations.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setQcOpen(true)}
              className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              Manager QC
            </button>

            <button
              type="button"
              onClick={() => refreshAll()}
              className="rounded-full bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
            >
              Refresh
            </button>
          </div>
        </div>
      </div>

      {/* Cleaning progress */}
      <div className={cls(CARD, "mt-4 p-4 sm:p-5")}>
        <div className="mb-3">
          <div className="text-[11px] font-extrabold uppercase tracking-[0.22em] text-slate-400">Cleaning progress</div>
          <div className="text-sm font-semibold text-slate-900">Tasks due by category</div>
        </div>

        <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                <th className="px-3 py-2 text-left font-semibold">Category</th>
                <th className="px-3 py-2 text-left font-semibold">Completed</th>
                <th className="px-3 py-2 text-left font-semibold">Total</th>
                <th className="px-3 py-2 text-left font-semibold">%</th>
              </tr>
            </thead>
            <tbody>
              {cleaningCategoryProgress.length === 0 ? (
                <tr>
                  <td className="px-3 py-3 text-slate-500" colSpan={4}>
                    No cleaning tasks due.
                  </td>
                </tr>
              ) : (
                cleaningCategoryProgress.map((r) => {
                  const pct = r.total > 0 ? Math.round((r.done / r.total) * 100) : 0;
                  return (
                    <tr key={r.category} className="border-t border-slate-100">
                      <td className="px-3 py-2">{r.category}</td>
                      <td className="px-3 py-2">{r.done}</td>
                      <td className="px-3 py-2">{r.total}</td>
                      <td className="px-3 py-2">
                        <span className="inline-flex rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-800">
                          {pct}%
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Temps + Cleaning activity */}
      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className={cls(CARD, "p-4 sm:p-5")}>
          <div className="mb-3 flex items-end justify-between">
            <div>
              <div className="text-[11px] font-extrabold uppercase tracking-[0.22em] text-slate-400">Temps</div>
              <div className="text-sm font-semibold text-slate-900">Today’s logs</div>
            </div>
            {todayTemps.length > 10 && (
              <button
                type="button"
                onClick={() => setShowAllTemps((v) => !v)}
                className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
              >
                {showAllTemps ? "Show less" : `Show all (${todayTemps.length})`}
              </button>
            )}
          </div>

          <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-slate-600">
                <tr>
                  <th className="px-3 py-2 text-left font-semibold">Time</th>
                  <th className="px-3 py-2 text-left font-semibold">Staff</th>
                  <th className="px-3 py-2 text-left font-semibold">Area</th>
                  <th className="px-3 py-2 text-left font-semibold">Item</th>
                  <th className="px-3 py-2 text-left font-semibold">Temp</th>
                  <th className="px-3 py-2 text-left font-semibold">Status</th>
                </tr>
              </thead>
              <tbody>
                {tempsToRender.length === 0 ? (
                  <tr>
                    <td className="px-3 py-3 text-slate-500" colSpan={6}>
                      No temperature logs.
                    </td>
                  </tr>
                ) : (
                  tempsToRender.map((r) => (
                    <tr key={r.id} className="border-t border-slate-100">
                      <td className="px-3 py-2">{r.time}</td>
                      <td className="px-3 py-2">{r.staff}</td>
                      <td className="px-3 py-2">{r.area}</td>
                      <td className="px-3 py-2">{r.item}</td>
                      <td className="px-3 py-2">{r.temp_c != null ? `${r.temp_c}°C` : "—"}</td>
                      <td className="px-3 py-2">{r.status ?? "—"}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className={cls(CARD, "p-4 sm:p-5")}>
          <div className="mb-3 flex items-end justify-between">
            <div>
              <div className="text-[11px] font-extrabold uppercase tracking-[0.22em] text-slate-400">Cleaning</div>
              <div className="text-sm font-semibold text-slate-900">Today’s activity</div>
            </div>
            {cleaningActivity.length > 10 && (
              <button
                type="button"
                onClick={() => setShowAllCleaning((v) => !v)}
                className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
              >
                {showAllCleaning ? "Show less" : `Show all (${cleaningActivity.length})`}
              </button>
            )}
          </div>

          <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-slate-600">
                <tr>
                  <th className="px-3 py-2 text-left font-semibold">Time</th>
                  <th className="px-3 py-2 text-left font-semibold">Category</th>
                  <th className="px-3 py-2 text-left font-semibold">Task</th>
                  <th className="px-3 py-2 text-left font-semibold">Staff</th>
                </tr>
              </thead>
              <tbody>
                {cleaningToRender.length === 0 ? (
                  <tr>
                    <td className="px-3 py-3 text-slate-500" colSpan={4}>
                      No cleaning runs.
                    </td>
                  </tr>
                ) : (
                  cleaningToRender.map((r) => (
                    <tr key={r.id} className="border-t border-slate-100">
                      <td className="px-3 py-2">{r.time ?? "—"}</td>
                      <td className="px-3 py-2">{r.category}</td>
                      <td className="px-3 py-2">{r.task ?? "—"}</td>
                      <td className="px-3 py-2">{r.staff ?? "—"}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Incidents + Signoffs */}
      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className={cls(CARD, "p-4 sm:p-5")}>
          <div className="mb-3 flex items-end justify-between">
            <div>
              <div className="text-[11px] font-extrabold uppercase tracking-[0.22em] text-slate-400">Incidents</div>
              <div className="text-sm font-semibold text-slate-900">Logged today</div>
            </div>
            {incidentsToday.length > 10 && (
              <button
                type="button"
                onClick={() => setShowAllIncidents((v) => !v)}
                className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
              >
                {showAllIncidents ? "Show less" : `Show all (${incidentsToday.length})`}
              </button>
            )}
          </div>

          <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-slate-600">
                <tr>
                  <th className="px-3 py-2 text-left font-semibold">Type</th>
                  <th className="px-3 py-2 text-left font-semibold">Staff</th>
                  <th className="px-3 py-2 text-left font-semibold">Details</th>
                </tr>
              </thead>
              <tbody>
                {incidentsToRender.length === 0 ? (
                  <tr>
                    <td className="px-3 py-3 text-slate-500" colSpan={3}>
                      No incidents.
                    </td>
                  </tr>
                ) : (
                  incidentsToRender.map((r) => (
                    <tr key={r.id} className="border-t border-slate-100">
                      <td className="px-3 py-2">{r.type ?? "—"}</td>
                      <td className="px-3 py-2">{r.created_by ?? "—"}</td>
                      <td className="px-3 py-2">{r.details ?? "—"}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className={cls(CARD, "p-4 sm:p-5")}>
          <div className="mb-3 flex items-end justify-between">
            <div>
              <div className="text-[11px] font-extrabold uppercase tracking-[0.22em] text-slate-400">Sign-off</div>
              <div className="text-sm font-semibold text-slate-900">Day sign-offs</div>
            </div>
            <div className="flex items-center gap-2">
              {signoffsToday.length > 10 && (
                <button
                  type="button"
                  onClick={() => setShowAllSignoffs((v) => !v)}
                  className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                  {showAllSignoffs ? "Show less" : `Show all (${signoffsToday.length})`}
                </button>
              )}

              <button
                type="button"
                onClick={() => setSignoffOpen(true)}
                className="rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-slate-800"
              >
                Sign off
              </button>
            </div>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-slate-600">
                <tr>
                  <th className="px-3 py-2 text-left font-semibold">Signed by</th>
                  <th className="px-3 py-2 text-left font-semibold">Notes</th>
                </tr>
              </thead>
              <tbody>
                {signoffsToRender.length === 0 ? (
                  <tr>
                    <td className="px-3 py-3 text-slate-500" colSpan={2}>
                      No sign-offs.
                    </td>
                  </tr>
                ) : (
                  signoffsToRender.map((r) => (
                    <tr key={r.id} className="border-t border-slate-100">
                      <td className="px-3 py-2">{r.signed_by ?? "—"}</td>
                      <td className="px-3 py-2">{r.notes ?? "—"}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Signoff modal */}
      {signoffOpen && (
        <div className="fixed inset-0 z-50 bg-black/30" onClick={() => setSignoffOpen(false)}>
          <div
            className="mx-auto mt-10 w-full max-w-xl rounded-2xl border border-slate-200 bg-white/90 p-4 text-slate-900 shadow-lg backdrop-blur"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-3 flex items-center justify-between">
              <div>
                <div className="text-base font-semibold">Sign off day</div>
                <div className="mt-0.5 text-xs text-slate-500">{selectedDateISO}</div>
              </div>
              <button onClick={() => setSignoffOpen(false)} className="rounded-md p-2 text-slate-500 hover:bg-slate-100" aria-label="Close">
                ✕
              </button>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs text-slate-500">Initials</label>
                <input
                  value={signoffInitials}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSignoffInitials(e.target.value.toUpperCase())}
                  placeholder="WS"
                  className="h-10 w-full rounded-xl border border-slate-300 bg-white/80 px-3 text-sm"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs text-slate-500">Notes (optional)</label>
                <input
                  value={signoffNotes}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSignoffNotes(e.target.value)}
                  placeholder="Any corrective actions / comments…"
                  className="h-10 w-full rounded-xl border border-slate-300 bg-white/80 px-3 text-sm"
                />
              </div>
            </div>

            <div className="mt-4 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setSignoffOpen(false)}
                className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={createDaySignoff}
                disabled={signoffSaving}
                className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700 disabled:opacity-60"
              >
                {signoffSaving ? "Signing…" : "Sign off"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Staff assessment modal (Ctrl+Shift+A) */}
      {assessmentOpen && (
        <div className="fixed inset-0 z-50 bg-black/30" onClick={() => setAssessmentOpen(false)}>
          <div
            className="mx-auto mt-10 w-full max-w-3xl rounded-2xl border border-slate-200 bg-white/90 p-4 text-slate-900 shadow-lg backdrop-blur"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-3 flex items-center justify-between">
              <div>
                <div className="text-base font-semibold">Staff assessment</div>
                <div className="mt-0.5 text-xs text-slate-500">Ctrl+Shift+A toggles this. No UI changes required.</div>
              </div>
              <button onClick={() => setAssessmentOpen(false)} className="rounded-md p-2 text-slate-500 hover:bg-slate-100" aria-label="Close">
                ✕
              </button>
            </div>

            {assessmentErr && (
              <div className="mb-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">{assessmentErr}</div>
            )}

            <div className="rounded-2xl border border-slate-200 bg-white/90 p-3">
              <div className="grid gap-3 md:grid-cols-3">
                <div>
                  <label className="mb-1 block text-xs text-slate-500">Staff</label>
                  <select
                    value={assessmentStaffId}
                    onChange={(e: React.ChangeEvent<HTMLSelectElement>) => {
                      setAssessmentStaffId(e.target.value);
                      setAssessment(null);
                      setAssessmentErr(null);
                    }}
                    className="h-10 w-full rounded-xl border border-slate-300 bg-white/80 px-3 text-sm"
                  >
                    <option value="">Select…</option>
                    {teamOptions.map((t) => (
                      <option key={t.id} value={t.id}>
                        {tmLabel(t)}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mb-1 block text-xs text-slate-500">Range</label>
                  <select
                    value={assessmentDays}
                    onChange={(e: React.ChangeEvent<HTMLSelectElement>) => {
                      setAssessmentDays(Number(e.target.value));
                      setAssessment(null);
                      setAssessmentErr(null);
                    }}
                    className="h-10 w-full rounded-xl border border-slate-300 bg-white/80 px-3 text-sm"
                  >
                    <option value={7}>Last 7 days</option>
                    <option value={14}>Last 14 days</option>
                    <option value={30}>Last 30 days</option>
                  </select>
                </div>

                <div className="flex items-end justify-end gap-2">
                  <button
                    type="button"
                    onClick={async () => {
                      if (!assessmentStaffId) return alert("Select a staff member.");
                      await loadStaffAssessment(assessmentStaffId, assessmentDays);
                    }}
                    disabled={assessmentLoading || !assessmentStaffId}
                    className="h-10 rounded-xl bg-indigo-600 px-4 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700 disabled:opacity-60"
                  >
                    {assessmentLoading ? "Loading…" : "Load"}
                  </button>
                </div>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <KpiTile
                title="Cleaning runs"
                tone="neutral"
                value={assessment?.cleaningDone ?? "—"}
                sub={assessment ? `Completed in last ${assessment.rangeDays}d` : "Select staff + load"}
                icon={<span>🧼</span>}
              />
              <KpiTile
                title="Temp logs"
                tone="neutral"
                value={assessment?.tempLogs ?? "—"}
                sub={assessment ? `Recorded in last ${assessment.rangeDays}d` : "—"}
                icon={<span>🌡️</span>}
              />
              <KpiTile
                title="Temp fails"
                tone={assessment && assessment.tempFails > 0 ? "danger" : "ok"}
                value={assessment?.tempFails ?? "—"}
                sub={assessment ? `Fails in last ${assessment.rangeDays}d` : "—"}
                icon={<span>🚫</span>}
              />
              <KpiTile
                title="Incidents"
                tone={assessment && assessment.incidents > 0 ? "warn" : "ok"}
                value={assessment?.incidents ?? "—"}
                sub={assessment ? `Logged in last ${assessment.rangeDays}d` : "—"}
                icon={<span>⚠️</span>}
              />
              <KpiTile
                title="QC avg (30d)"
                tone="neutral"
                value={assessment ? (assessment.qcAvg30d != null ? `${assessment.qcAvg30d}/5` : "—") : "—"}
                sub={assessment ? `Based on ${assessment.qcCount30d} reviews` : "—"}
                icon={<span>📋</span>}
              />
              <KpiTile title="Staff" tone="neutral" value={assessment?.staffLabel ?? "—"} sub="Selected team member" icon={<span>👤</span>} />
            </div>

            <div className="mt-4 text-xs text-slate-500">
              Note: this uses staff initials matching (done_by, staff_initials, created_by). If you switch to IDs everywhere later, this becomes bulletproof.
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

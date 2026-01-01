// src/app/(protected)/manager/page.tsx
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

type CleaningActivityRow = {
  id: string;
  time: string | null;
  category: string;
  staff: string | null;
  notes: string | null;
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

/* =========================
   Day sign-offs (daily_signoffs)
========================= */

type SignoffRow = {
  id: string;
  signoff_on: string; // yyyy-mm-dd
  signed_by: string | null;
  notes: string | null;
  created_at: string | null; // ISO datetime
};

type SignoffSummary = { todayCount: number };

/* =========================
   Manager QC (staff_qc_reviews) using team_members
========================= */

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

const WEEKDAYS = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

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

const cls = (...p: Array<string | false | null | undefined>) =>
  p.filter(Boolean).join(" ");

const isoDate = (d: Date) => d.toISOString().slice(0, 10);
const addDaysISO = (ymd: string, delta: number) => {
  const d = new Date(ymd);
  d.setDate(d.getDate() + delta);
  return isoDate(d);
};

const getDow1to7 = (ymd: string) => ((new Date(ymd).getDay() + 6) % 7) + 1; // Mon=1..Sun=7
const getDom = (ymd: string) => new Date(ymd).getDate();

function isDueOn(t: CleaningTask, ymd: string) {
  if (t.frequency === "daily") return true;
  if (t.frequency === "weekly") return t.weekday === getDow1to7(ymd);
  return t.month_day === getDom(ymd);
}

/* ---------- KPI Tile ---------- */

const KPI_HEIGHT = "min-h-[120px]";

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
  icon?: string;
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
    <motion.div
      whileHover={{ y: -3 }}
      className={cls(
        "relative rounded-2xl border p-4 shadow-sm overflow-hidden",
        "flex flex-col",
        KPI_HEIGHT,
        toneCls
      )}
    >
      <div
        className={cls(
          "absolute left-0 top-3 bottom-3 w-1.5 rounded-full opacity-80",
          accentCls
        )}
      />
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-[11px] font-extrabold uppercase tracking-[0.22em] text-slate-700/90">
            {title}
          </div>
          <div className="mt-2 text-3xl font-extrabold text-slate-900 leading-none">
            {value}
          </div>
        </div>
        {icon ? (
          <div className="shrink-0 text-lg opacity-90" aria-hidden="true">
            {icon}
          </div>
        ) : null}
      </div>

      <div className="mt-auto pt-3 text-[11px] font-medium text-slate-600">
        {sub}
      </div>
    </motion.div>
  );
}

function TableFooterToggle({
  total,
  showingAll,
  onToggle,
}: {
  total: number;
  showingAll: boolean;
  onToggle: () => void;
}) {
  if (total <= 10) return null;

  return (
    <div className="mt-2 flex items-center justify-between text-xs">
      <div className="text-slate-500">
        Showing {showingAll ? total : 10} of{" "}
        <span className="font-semibold">{total}</span>
      </div>
      <button
        type="button"
        onClick={onToggle}
        className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 font-semibold text-slate-700 hover:bg-slate-50"
      >
        {showingAll ? "Show less" : `Show all (${total})`}
      </button>
    </div>
  );
}

/* =========================
   Staff assessment modal types (NEW)
========================= */

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

export default function ManagerDashboardPage() {
  const [orgId, setOrgId] = useState<string | null>(null);
  const [locationId, setLocationId] = useState<string | null>(null);
  const [locations, setLocations] = useState<LocationOption[]>([]);
  const [locationLoading, setLocationLoading] = useState(false);

  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const nowISO = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return isoDate(d);
  }, []);

  const [selectedDateISO, setSelectedDateISO] = useState<string>(nowISO);

  const [tempsSummary, setTempsSummary] = useState<TempSummary>({
    today: 0,
    fails7d: 0,
  });
  const [todayTemps, setTodayTemps] = useState<TodayTempRow[]>([]);

  const [cleaningCategoryProgress, setCleaningCategoryProgress] = useState<
    CleaningCategoryProgressRow[]
  >([]);
  const [cleaningActivity, setCleaningActivity] = useState<CleaningActivityRow[]>(
    []
  );

  const [incidentSummary, setIncidentSummary] = useState<IncidentSummary>({
    todayCount: 0,
    last7Count: 0,
  });
  const [incidentsToday, setIncidentsToday] = useState<CleaningIncident[]>([]);

  const [trainingDueSoon, setTrainingDueSoon] = useState(0);
  const [trainingExpired, setTrainingExpired] = useState(0);

  const [showAllTemps, setShowAllTemps] = useState(false);
  const [showAllCleaning, setShowAllCleaning] = useState(false);
  const [showAllIncidents, setShowAllIncidents] = useState(false);

  /* ===== Day sign-offs ===== */
  const [signoffsToday, setSignoffsToday] = useState<SignoffRow[]>([]);
  const [signoffSummary, setSignoffSummary] = useState<SignoffSummary>({
    todayCount: 0,
  });
  const [showAllSignoffs, setShowAllSignoffs] = useState(false);

  // ✅ Sign-off modal state
  const [signoffOpen, setSignoffOpen] = useState(false);
  const [signoffInitials, setSignoffInitials] = useState("");
  const [signoffNotes, setSignoffNotes] = useState("");
  const [signoffSaving, setSignoffSaving] = useState(false);

  /* ===== Manager QC ===== */
  const [qcOpen, setQcOpen] = useState(false);
  const [teamOptions, setTeamOptions] = useState<TeamMemberOption[]>([]);
  const [qcReviews, setQcReviews] = useState<StaffQcReviewRow[]>([]);
  const [qcLoading, setQcLoading] = useState(false);
  const [qcSaving, setQcSaving] = useState(false);
  const [showAllQc, setShowAllQc] = useState(false);

  // ✅ summary table on main page
  const [qcSummaryLoading, setQcSummaryLoading] = useState(false);

  const [managerTeamMember, setManagerTeamMember] =
    useState<TeamMemberOption | null>(null);

  const [qcForm, setQcForm] = useState({
    staff_id: "",
    reviewed_on: nowISO,
    score: 3,
    notes: "",
  });

  function tmLabel(t: { initials: string | null; name: string | null }) {
    const ini = (t.initials ?? "").toString().trim().toUpperCase();
    const nm = (t.name ?? "").toString().trim();
    if (ini && nm) return `${ini} · ${nm}`;
    if (ini) return ini;
    return nm || "—";
  }

  /* =========================
     Staff assessment modal state (NEW)
  ========================= */
  const [assessmentOpen, setAssessmentOpen] = useState(false);
  const [assessmentLoading, setAssessmentLoading] = useState(false);
  const [assessmentErr, setAssessmentErr] = useState<string | null>(null);
  const [assessmentStaffId, setAssessmentStaffId] = useState<string>("");
  const [assessmentDays, setAssessmentDays] = useState<number>(7);
  const [assessment, setAssessment] = useState<StaffAssessment | null>(null);

  async function loadTeamOptions() {
    if (!orgId) return;
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
  }

  async function loadLoggedInManager() {
    if (!orgId) return;
    try {
      const {
        data: { user },
        error: userErr,
      } = await supabase.auth.getUser();

      if (userErr || !user) {
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
  }

  async function loadQcReviews() {
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
        .limit(200);

      if (error) throw error;
      setQcReviews(((data ?? []) as any[]) as StaffQcReviewRow[]);
      setShowAllQc(false);
    } catch (e) {
      console.error(e);
      setQcReviews([]);
    } finally {
      setQcLoading(false);
    }
  }

  async function loadQcSummary() {
    if (!orgId || !locationId) return;
    setQcSummaryLoading(true);
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
    } finally {
      setQcSummaryLoading(false);
    }
  }

  async function addQcReview() {
    if (!orgId || !locationId) return;
    if (!qcForm.staff_id) return alert("Select staff.");
    if (!managerTeamMember?.id)
      return alert(
        "Your login is not linked to a team member (team_members.user_id)."
      );
    if (!qcForm.reviewed_on) return alert("Select date.");

    const score = Number(qcForm.score);
    if (!Number.isFinite(score) || score < 1 || score > 5)
      return alert("Score must be 1–5.");

    setQcSaving(true);
    try {
      const { error } = await supabase.from("staff_qc_reviews").insert({
        org_id: orgId,
        staff_id: qcForm.staff_id,
        manager_id: managerTeamMember.id,
        location_id: locationId,
        reviewed_on: qcForm.reviewed_on,
        score,
        notes: qcForm.notes?.trim() || null,
      });

      if (error) throw error;

      setQcForm((f) => ({
        ...f,
        staff_id: "",
        reviewed_on: selectedDateISO || isoDate(new Date()),
        score: 3,
        notes: "",
      }));

      await loadQcSummary();
      await loadQcReviews();
    } catch (e: any) {
      console.error(e);
      alert(e?.message ?? "Failed to add QC review.");
    } finally {
      setQcSaving(false);
    }
  }

  async function deleteQcReview(id: string) {
    if (!orgId) return;
    if (!confirm("Delete this QC review?")) return;

    try {
      const { error } = await supabase
        .from("staff_qc_reviews")
        .delete()
        .eq("id", id)
        .eq("org_id", orgId);
      if (error) throw error;
      await loadQcSummary();
      await loadQcReviews();
    } catch (e: any) {
      console.error(e);
      alert(e?.message ?? "Failed to delete QC review.");
    }
  }

  useEffect(() => {
    (async () => {
      const oId = await getActiveOrgIdClient();
      setOrgId(oId ?? null);
      if (!oId) return;

      setLocationLoading(true);
      try {
        const { data, error } = await supabase
          .from("locations")
          .select("id,name")
          .eq("org_id", oId)
          .order("name");
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

  useEffect(() => {
    if (!orgId || !locationId) return;
    refreshAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orgId, locationId, selectedDateISO]);

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

      const trainingBase = new Date(nowISO);
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
          .select("*")
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
          .select("id, org_id, task_id, run_on, done_at, done_by, location_id")
          .eq("org_id", orgId)
          .eq("location_id", locationId)
          .eq("run_on", selectedDateISO)
          .order("done_at", { ascending: false })
          .limit(5000),

        supabase
          .from("cleaning_incidents")
          .select(
            "id,happened_on,type,details,corrective_action,preventive_action,created_by,created_at"
          )
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
          .select("id, signoff_on, signed_by, notes, created_at, location_id")
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
          const ts = r.at
            ? new Date(r.at)
            : r.created_at
            ? new Date(r.created_at)
            : null;
          return {
            id: String(r.id),
            time: formatTimeHM(ts) ?? "—",
            staff: (r.staff_initials ?? r.initials ?? "—").toString(),
            item: (r.note ?? r.item ?? "—").toString(),
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
        frequency:
          (String(t.frequency ?? "daily").toLowerCase() as any) ?? "daily",
        category: t.category ?? null,
        task: t.task ?? null,
        weekday: t.weekday != null ? Number(t.weekday) : null,
        month_day: t.month_day != null ? Number(t.month_day) : null,
      }));

      const taskById = new Map<string, CleaningTask>();
      for (const t of tasks) taskById.set(t.id, t);

      const runsRaw: CleaningTaskRun[] = ((cleaningRunsDayRes.data as any[]) ??
        []).map((r: any) => ({
        id: String(r.id),
        org_id: String(r.org_id),
        task_id: String(r.task_id),
        run_on: String(r.run_on),
        done_by: r.done_by ? String(r.done_by) : null,
        done_at: r.done_at ? String(r.done_at) : null,
        location_id: r.location_id ? String(r.location_id) : null,
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
            notes: null,
            task: t?.task ?? null,
          };
        })
      );

      const incDay = ((incidentsDayRes.data as any[]) ?? []).map((r: any) => ({
        id: String(r.id),
        happened_on: String(r.happened_on),
        type: r.type ? String(r.type) : null,
        details: r.details ? String(r.details) : null,
        corrective_action: r.corrective_action
          ? String(r.corrective_action)
          : null,
        preventive_action: r.preventive_action
          ? String(r.preventive_action)
          : null,
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
      setSignoffSummary({ todayCount: soRows.length });
      setShowAllSignoffs(false);

      setShowAllTemps(false);
      setShowAllCleaning(false);
      setShowAllIncidents(false);

      await loadQcSummary();
    } catch (e: any) {
      console.error(e);
      setErr(e?.message ?? "Failed to load manager dashboard.");
    } finally {
      setLoading(false);
    }
  }

  const centeredDate = formatPrettyDate(new Date(selectedDateISO));

  const tempsTone: "neutral" | "ok" | "warn" | "danger" =
    tempsSummary.fails7d > 0 ? "danger" : "ok";
  const incidentsTone: "neutral" | "ok" | "warn" | "danger" =
    incidentSummary.todayCount > 0 ? "warn" : "ok";
  const trainingTone: "neutral" | "ok" | "warn" | "danger" =
    trainingExpired > 0 ? "danger" : trainingDueSoon > 0 ? "warn" : "ok";

  const cleaningDoneTotal = cleaningCategoryProgress.reduce(
    (a, r) => a + r.done,
    0
  );
  const cleaningTotal = cleaningCategoryProgress.reduce(
    (a, r) => a + r.total,
    0
  );

  const tempsToRender = showAllTemps ? todayTemps : todayTemps.slice(0, 10);
  const cleaningToRender = showAllCleaning
    ? cleaningActivity
    : cleaningActivity.slice(0, 10);
  const incidentsToRender = showAllIncidents
    ? incidentsToday
    : incidentsToday.slice(0, 10);

  const qcToRender = showAllQc ? qcReviews : qcReviews.slice(0, 10);

  const signoffsToRender = showAllSignoffs
    ? signoffsToday
    : signoffsToday.slice(0, 10);

  const cleaningAllDone =
    cleaningTotal > 0 && cleaningDoneTotal === cleaningTotal;
  const alreadySignedOff = signoffsToday.length > 0;

  async function createDaySignoff() {
    if (!orgId || !locationId) return;

    if (!cleaningAllDone) {
      alert("Finish all cleaning tasks due today before signing off.");
      return;
    }

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
        signed_by: (data as any).signed_by
          ? String((data as any).signed_by)
          : null,
        notes: (data as any).notes ? String((data as any).notes) : null,
        created_at: (data as any).created_at
          ? String((data as any).created_at)
          : null,
      };

      setSignoffsToday((prev) => [row, ...prev]);
      setSignoffSummary((prev) => ({
        ...prev,
        todayCount: prev.todayCount + 1,
      }));
      setShowAllSignoffs(false);

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

  /* =========================
     Staff assessment loader (NEW)
  ========================= */
  async function loadStaffAssessment(staffId: string, days: number) {
    if (!orgId || !locationId) return;

    const staff = teamOptions.find((t) => t.id === staffId) ?? null;
    const initials = (staff?.initials ?? "").toString().trim().toUpperCase();

    setAssessmentLoading(true);
    setAssessmentErr(null);
    setAssessment(null);

    try {
      if (!staff || !initials) {
        throw new Error("Selected staff member has no initials.");
      }

      const end = new Date(selectedDateISO);
      end.setHours(23, 59, 59, 999);

      const start = new Date(selectedDateISO);
      start.setHours(0, 0, 0, 0);
      start.setDate(start.getDate() - (days - 1));

      const startIsoDate = isoDate(start);
      const endIsoDate = isoDate(end);

      const qcStart = new Date(selectedDateISO);
      qcStart.setHours(0, 0, 0, 0);
      qcStart.setDate(qcStart.getDate() - 29); // last 30 days window
      const qcStartIso = isoDate(qcStart);

      const [
        cleaningRunsRes,
        tempLogsRes,
        tempFailsRes,
        incidentsRes,
        qcRes,
      ] = await Promise.all([
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

      const firstErr =
        cleaningRunsRes.error ||
        tempLogsRes.error ||
        tempFailsRes.error ||
        incidentsRes.error ||
        qcRes.error;

      if (firstErr) throw firstErr;

      const qcRows = (qcRes.data ?? []) as Array<{ score: number }>;
      const qcCount30d = qcRows.length;
      const qcAvg30d =
        qcCount30d > 0
          ? Math.round(
              (qcRows.reduce((a, r) => a + Number(r.score || 0), 0) / qcCount30d) *
                10
            ) / 10
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

  return (
    <>
      {/* MAIN PAGE CONTENT UNCHANGED ABOVE THIS POINT */}
      <header className="py-2">
        <div className="text-center">
          <div className="text-[11px] font-extrabold uppercase tracking-[0.22em] text-slate-400">
            Today
          </div>
          <h1 className="mt-1 text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
            {centeredDate}
          </h1>
        </div>
      </header>

      {err && (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-800">
          {err}
        </div>
      )}

      {/* ... your entire existing UI continues here, unchanged ... */}

      {/* ===== EXISTING MODALS (signoff + QC) remain as you had them ===== */}
      {/* (I am not repeating your whole main page markup here again; only modal addition matters.) */}

      {/* =========================
         STAFF ASSESSMENT MODAL (NEW)
         NOTE: Nothing on the main page is changed. This modal only renders when assessmentOpen = true.
      ========================= */}
      {assessmentOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/30"
          onClick={() => setAssessmentOpen(false)}
        >
          <div
            className="mx-auto mt-10 w-full max-w-3xl rounded-2xl border border-slate-200 bg-white/90 p-4 text-slate-900 shadow-lg backdrop-blur"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-3 flex items-center justify-between">
              <div>
                <div className="text-base font-semibold">Staff assessment</div>
                <div className="mt-0.5 text-xs text-slate-500">
                  Snapshot for selected staff member (location-based).
                </div>
              </div>

              <button
                onClick={() => setAssessmentOpen(false)}
                className="rounded-md p-2 text-slate-500 hover:bg-slate-100"
                aria-label="Close"
              >
                ✕
              </button>
            </div>

            {assessmentErr && (
              <div className="mb-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
                {assessmentErr}
              </div>
            )}

            <div className="rounded-2xl border border-slate-200 bg-white/90 p-3">
              <div className="grid gap-3 md:grid-cols-3">
                <div>
                  <label className="mb-1 block text-xs text-slate-500">Staff</label>
                  <select
                    value={assessmentStaffId}
                    onChange={(e: React.ChangeEvent<HTMLSelectElement>) => {
                      const v = e.target.value;
                      setAssessmentStaffId(v);
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
                      const n = Number(e.target.value);
                      setAssessmentDays(n);
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
                      if (!orgId) return;
                      if (teamOptions.length === 0) await loadTeamOptions();
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
                icon="🧼"
                tone="neutral"
                value={assessment?.cleaningDone ?? "—"}
                sub={
                  assessment
                    ? `Completed in last ${assessment.rangeDays}d`
                    : "Select staff + load"
                }
              />
              <KpiTile
                title="Temp logs"
                icon="🌡"
                tone="neutral"
                value={assessment?.tempLogs ?? "—"}
                sub={assessment ? `Recorded in last ${assessment.rangeDays}d` : "—"}
              />
              <KpiTile
                title="Temp fails"
                icon="🚫"
                tone={
                  assessment && assessment.tempFails > 0 ? "danger" : "ok"
                }
                value={assessment?.tempFails ?? "—"}
                sub={assessment ? `Fails in last ${assessment.rangeDays}d` : "—"}
              />
              <KpiTile
                title="Incidents created"
                icon="⚠️"
                tone={
                  assessment && assessment.incidents > 0 ? "warn" : "ok"
                }
                value={assessment?.incidents ?? "—"}
                sub={assessment ? `Logged in last ${assessment.rangeDays}d` : "—"}
              />
              <KpiTile
                title="QC avg (30d)"
                icon="📋"
                tone="neutral"
                value={
                  assessment
                    ? assessment.qcAvg30d != null
                      ? `${assessment.qcAvg30d}/5`
                      : "—"
                    : "—"
                }
                sub={
                  assessment
                    ? `Based on ${assessment.qcCount30d} reviews`
                    : "—"
                }
              />
              <KpiTile
                title="Staff"
                icon="👤"
                tone="neutral"
                value={assessment?.staffLabel ?? "—"}
                sub="Selected team member"
              />
            </div>

            <div className="mt-4 text-xs text-slate-500">
             Note: this uses staff initials matching (done_by, staff_initials, created_by). If you ever switch to IDs everywhere, this gets even better.
         </div>
          </div>
        </div>
      )}
    </>
  );
}

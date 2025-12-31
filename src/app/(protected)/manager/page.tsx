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
   Manager QC (staff_qc_reviews) using team_members
   IMPORTANT: staff_qc_reviews.staff_id/manager_id must reference team_members(id)
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

const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
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

const cls = (...p: Array<string | false | null | undefined>) => p.filter(Boolean).join(" ");

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
      <div className={cls("absolute left-0 top-3 bottom-3 w-1.5 rounded-full opacity-80", accentCls)} />
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-[11px] font-extrabold uppercase tracking-[0.22em] text-slate-700/90">{title}</div>
          <div className="mt-2 text-3xl font-extrabold text-slate-900 leading-none">{value}</div>
        </div>
        {icon ? (
          <div className="shrink-0 text-lg opacity-90" aria-hidden="true">
            {icon}
          </div>
        ) : null}
      </div>

      <div className="mt-auto pt-3 text-[11px] font-medium text-slate-600">{sub}</div>
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
        Showing {showingAll ? total : 10} of <span className="font-semibold">{total}</span>
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

/* ===================================================================== */

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

  /* =========================
     Manager QC modal state
  ========================= */
  const [qcOpen, setQcOpen] = useState(false);

  const [teamOptions, setTeamOptions] = useState<TeamMemberOption[]>([]);
  const [qcReviews, setQcReviews] = useState<StaffQcReviewRow[]>([]);
  const [qcLoading, setQcLoading] = useState(false);
  const [qcSaving, setQcSaving] = useState(false);
  const [showAllQc, setShowAllQc] = useState(false);

  const [managerTeamMember, setManagerTeamMember] = useState<TeamMemberOption | null>(null);

  const [qcForm, setQcForm] = useState({
    staff_id: "", // team_members.id
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

  async function addQcReview() {
    if (!orgId || !locationId) return;
    if (!qcForm.staff_id) return alert("Select staff.");
    if (!managerTeamMember?.id) return alert("Your login is not linked to a team member (team_members.user_id).");
    if (!qcForm.reviewed_on) return alert("Select date.");

    const score = Number(qcForm.score);
    if (!Number.isFinite(score) || score < 1 || score > 5) return alert("Score must be 1–5.");

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
      const { error } = await supabase.from("staff_qc_reviews").delete().eq("id", id).eq("org_id", orgId);
      if (error) throw error;
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
        const { data, error } = await supabase.from("locations").select("id,name").eq("org_id", oId).order("name");
        if (error) throw error;

        const locs = data?.map((r: any) => ({ id: String(r.id), name: r.name ?? "Unnamed" })) ?? [];
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

        supabase.from("trainings").select("id, expires_on").eq("org_id", orgId).limit(5000),
      ]);

      const firstError =
        tempsCountRes.error ||
        fails7dRes.error ||
        tempsListRes.error ||
        cleaningTasksRes.error ||
        cleaningRunsDayRes.error ||
        incidentsDayRes.error ||
        incidents7dRes.error ||
        trainingsRes.error;

      if (firstError) throw firstError;

      setTempsSummary({
        today: tempsCountRes.count ?? 0,
        fails7d: fails7dRes.count ?? 0,
      });

      const tempsData: any[] = (tempsListRes.data as any[]) ?? [];
      setTodayTemps(
        tempsData.map((r) => {
          const ts = r.at ? new Date(r.at) : r.created_at ? new Date(r.created_at) : null;
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
          .map(([category, v]) => ({ category, done: v.done, total: v.total }))
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

      setShowAllTemps(false);
      setShowAllCleaning(false);
      setShowAllIncidents(false);
    } catch (e: any) {
      console.error(e);
      setErr(e?.message ?? "Failed to load manager dashboard.");
    } finally {
      setLoading(false);
    }
  }

  const centeredDate = formatPrettyDate(new Date(selectedDateISO));

  const tempsTone: "neutral" | "ok" | "warn" | "danger" = tempsSummary.fails7d > 0 ? "danger" : "ok";
  const incidentsTone: "neutral" | "ok" | "warn" | "danger" = incidentSummary.todayCount > 0 ? "warn" : "ok";
  const trainingTone: "neutral" | "ok" | "warn" | "danger" =
    trainingExpired > 0 ? "danger" : trainingDueSoon > 0 ? "warn" : "ok";

  const cleaningDoneTotal = cleaningCategoryProgress.reduce((a, r) => a + r.done, 0);
  const cleaningTotal = cleaningCategoryProgress.reduce((a, r) => a + r.total, 0);

  const tempsToRender = showAllTemps ? todayTemps : todayTemps.slice(0, 10);
  const cleaningToRender = showAllCleaning ? cleaningActivity : cleaningActivity.slice(0, 10);
  const incidentsToRender = showAllIncidents ? incidentsToday : incidentsToday.slice(0, 10);

  return (
    <>
      {/* Header */}
      <header className="py-2">
        <div className="text-center">
          <div className="text-[11px] font-extrabold uppercase tracking-[0.22em] text-slate-400">Today</div>
          <h1 className="mt-1 text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">{centeredDate}</h1>
        </div>
      </header>

      {err && (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-800">
          {err}
        </div>
      )}

      {/* KPI cards */}
      <section className="rounded-3xl border border-white/40 bg-white/80 p-3 sm:p-4 shadow-lg shadow-slate-900/5 backdrop-blur">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <KpiTile
            title="Temps"
            icon="🌡"
            tone={tempsTone}
            value={tempsSummary.today}
            sub={
              <>
                Fails (7d):{" "}
                <span className={cls("font-semibold", tempsSummary.fails7d > 0 && "text-red-700")}>
                  {tempsSummary.fails7d}
                </span>
              </>
            }
          />

          <KpiTile
            title="Incidents"
            icon="⚠️"
            tone={incidentsTone}
            value={incidentSummary.todayCount}
            sub={`Last 7d: ${incidentSummary.last7Count}`}
          />

          <KpiTile
            title="Training"
            icon="🎓"
            tone={trainingTone}
            value={trainingExpired}
            sub={
              <>
                Due soon (30d):{" "}
                <span className={cls("font-semibold", trainingDueSoon > 0 && "text-amber-700")}>{trainingDueSoon}</span>
              </>
            }
          />

          <KpiTile
            title="Cleaning completion"
            icon="✅"
            tone="neutral"
            value={`${cleaningDoneTotal}/${cleaningTotal}`}
            sub="Done / total (selected day)"
          />
        </div>
      </section>

      {/* Controls under KPIs */}
      <section className="mt-4 rounded-3xl border border-white/40 bg-white/80 p-3 sm:p-4 shadow-md shadow-slate-900/5 backdrop-blur">
        <div className="flex flex-wrap items-center gap-2 justify-end">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setSelectedDateISO((d) => addDaysISO(d, -1))}
              className="h-9 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              title="Previous day"
            >
              ←
            </button>

            <input
              type="date"
              value={selectedDateISO}
              onChange={(e) => setSelectedDateISO(e.target.value)}
              className="h-9 rounded-xl border border-slate-300 bg-white/90 px-3 text-sm shadow-sm"
            />

            <button
              type="button"
              onClick={() => setSelectedDateISO((d) => addDaysISO(d, +1))}
              className="h-9 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              title="Next day"
            >
              →
            </button>
          </div>

          <select
            value={locationId ?? ""}
            onChange={(e) => setLocationId(e.target.value || null)}
            disabled={locationLoading}
            className="h-9 rounded-xl border border-slate-300 bg-white/90 px-3 text-sm shadow-sm"
          >
            {locations.map((l) => (
              <option key={l.id} value={l.id}>
                {l.name}
              </option>
            ))}
          </select>

          <button
            type="button"
            onClick={async () => {
              if (!orgId || !locationId) return;
              setQcForm((f) => ({ ...f, reviewed_on: selectedDateISO || f.reviewed_on }));
              setQcOpen(true);
              await Promise.all([loadTeamOptions(), loadLoggedInManager(), loadQcReviews()]);
            }}
            disabled={loading || !orgId || !locationId}
            className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50 disabled:opacity-60"
          >
            Manager QC
          </button>

          <button
            type="button"
            onClick={refreshAll}
            disabled={loading || !orgId || !locationId}
            className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700 disabled:opacity-60"
          >
            {loading ? "Refreshing…" : "Refresh"}
          </button>
        </div>
      </section>

      {/* Cleaning progress */}
      <section className="mt-4 rounded-3xl border border-white/40 bg-white/80 p-4 shadow-md shadow-slate-900/5 backdrop-blur">
        <div className="mb-3">
          <div className="text-[11px] font-extrabold uppercase tracking-[0.22em] text-slate-400">Cleaning progress</div>
          <div className="mt-0.5 text-sm font-semibold text-slate-900">Tasks due by category</div>
        </div>

        <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white/90">
          <table className="min-w-full text-xs">
            <thead className="bg-slate-50">
              <tr className="text-left text-slate-500">
                <th className="px-3 py-2">Category</th>
                <th className="px-3 py-2">Completed</th>
                <th className="px-3 py-2">Total</th>
                <th className="px-3 py-2">%</th>
              </tr>
            </thead>
            <tbody>
              {cleaningCategoryProgress.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-3 py-4 text-center text-slate-500">
                    No cleaning tasks due (or none loaded).
                  </td>
                </tr>
              ) : (
                cleaningCategoryProgress.map((r) => {
                  const pct = r.total > 0 ? Math.round((r.done / r.total) * 100) : 0;
                  const pill =
                    pct === 100
                      ? "bg-emerald-100 text-emerald-800"
                      : pct >= 50
                      ? "bg-amber-100 text-amber-800"
                      : "bg-red-100 text-red-800";

                  return (
                    <tr key={r.category} className="border-t border-slate-100 text-slate-800">
                      <td className="px-3 py-2 font-semibold">{r.category}</td>
                      <td className="px-3 py-2">{r.done}</td>
                      <td className="px-3 py-2">{r.total}</td>
                      <td className="px-3 py-2">
                        <span
                          className={cls(
                            "inline-flex rounded-full px-2 py-[1px] text-[10px] font-extrabold uppercase",
                            pill
                          )}
                        >
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
      </section>

      {/* Incidents */}
      <section className="mt-4 rounded-3xl border border-white/40 bg-white/80 p-4 shadow-md shadow-slate-900/5 backdrop-blur">
        <div className="mb-3">
          <div className="text-[11px] font-extrabold uppercase tracking-[0.22em] text-slate-400">Incidents</div>
          <div className="mt-0.5 text-sm font-semibold text-slate-900">Incident log & corrective actions</div>
        </div>

        <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white/90">
          <table className="min-w-full text-xs">
            <thead className="bg-slate-50">
              <tr className="text-left text-slate-500">
                <th className="px-3 py-2">Time</th>
                <th className="px-3 py-2">Type</th>
                <th className="px-3 py-2">By</th>
                <th className="px-3 py-2">Details</th>
                <th className="px-3 py-2">Corrective</th>
              </tr>
            </thead>
            <tbody>
              {incidentsToRender.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-3 py-4 text-center text-slate-500">
                    No incidents logged.
                  </td>
                </tr>
              ) : (
                incidentsToRender.map((r) => (
                  <tr key={r.id} className="border-t border-slate-100 text-slate-800">
                    <td className="px-3 py-2">
                      {r.created_at
                        ? new Date(r.created_at).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })
                        : "—"}
                    </td>
                    <td className="px-3 py-2 font-semibold">{r.type ?? "Incident"}</td>
                    <td className="px-3 py-2">{r.created_by?.toUpperCase() ?? "—"}</td>
                    <td className="px-3 py-2 max-w-[18rem] truncate">{r.details ?? "—"}</td>
                    <td className="px-3 py-2 max-w-[18rem] truncate">{r.corrective_action ?? "—"}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <TableFooterToggle
          total={incidentsToday.length}
          showingAll={showAllIncidents}
          onToggle={() => setShowAllIncidents((v) => !v)}
        />
      </section>

      {/* Activity (main page tables) */}
      <section className="mt-4 rounded-3xl border border-white/40 bg-white/80 p-4 shadow-md shadow-slate-900/5 backdrop-blur">
        <div className="mb-3">
          <div className="text-[11px] font-extrabold uppercase tracking-[0.22em] text-slate-400">
            Today&apos;s activity
          </div>
          <div className="mt-0.5 text-sm font-semibold text-slate-900">Temps + cleaning (category-based)</div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <h3 className="mb-2 text-[11px] font-extrabold uppercase tracking-[0.22em] text-slate-500">
              Temperature logs
            </h3>

            <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white/90">
              <table className="min-w-full text-xs">
                <thead className="bg-slate-50">
                  <tr className="text-left text-slate-500">
                    <th className="px-3 py-2">Time</th>
                    <th className="px-3 py-2">Staff</th>
                    <th className="px-3 py-2">Area</th>
                    <th className="px-3 py-2">Item</th>
                    <th className="px-3 py-2">Temp</th>
                    <th className="px-3 py-2">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {tempsToRender.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-3 py-4 text-center text-slate-500">
                        No temperature logs.
                      </td>
                    </tr>
                  ) : (
                    tempsToRender.map((r) => (
                      <tr key={r.id} className="border-t border-slate-100 text-slate-800">
                        <td className="px-3 py-2">{r.time}</td>
                        <td className="px-3 py-2">{r.staff}</td>
                        <td className="px-3 py-2">{r.area}</td>
                        <td className="px-3 py-2">{r.item}</td>
                        <td className="px-3 py-2">{r.temp_c != null ? `${r.temp_c}°C` : "—"}</td>
                        <td className="px-3 py-2">
                          {r.status ? (
                            <span
                              className={cls(
                                "inline-flex rounded-full px-2 py-[1px] text-[10px] font-extrabold uppercase",
                                r.status === "pass" ? "bg-emerald-100 text-emerald-800" : "bg-red-100 text-red-800"
                              )}
                            >
                              {r.status}
                            </span>
                          ) : (
                            "—"
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <TableFooterToggle
              total={todayTemps.length}
              showingAll={showAllTemps}
              onToggle={() => setShowAllTemps((v) => !v)}
            />
          </div>

          <div>
            <h3 className="mb-2 text-[11px] font-extrabold uppercase tracking-[0.22em] text-slate-500">Cleaning runs</h3>

            <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white/90">
              <table className="min-w-full text-xs">
                <thead className="bg-slate-50">
                  <tr className="text-left text-slate-500">
                    <th className="px-3 py-2">Time</th>
                    <th className="px-3 py-2">Category</th>
                    <th className="px-3 py-2">Staff</th>
                    <th className="px-3 py-2">Notes</th>
                  </tr>
                </thead>
                <tbody>
                  {cleaningToRender.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-3 py-4 text-center text-slate-500">
                        No cleaning tasks completed.
                      </td>
                    </tr>
                  ) : (
                    cleaningToRender.map((r) => (
                      <tr key={r.id} className="border-t border-slate-100 text-slate-800">
                        <td className="px-3 py-2">{r.time ?? "—"}</td>
                        <td className="px-3 py-2">
                          <div className="font-semibold">{r.category}</div>
                          {r.task ? (
                            <div className="text-[11px] text-slate-500 truncate max-w-[18rem]">{r.task}</div>
                          ) : null}
                        </td>
                        <td className="px-3 py-2">{r.staff ?? "—"}</td>
                        <td className="px-3 py-2 max-w-[14rem] truncate">{r.notes ?? "—"}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <TableFooterToggle
              total={cleaningActivity.length}
              showingAll={showAllCleaning}
              onToggle={() => setShowAllCleaning((v) => !v)}
            />
          </div>
        </div>
      </section>

      {/* =========================
          Manager QC modal (RESTORED)
      ========================= */}
      {qcOpen && (
        <div className="fixed inset-0 z-50 bg-black/30" onClick={() => setQcOpen(false)}>
          <div
            className={cls(
              "mx-auto mt-10 w-full max-w-3xl rounded-2xl border border-slate-200 bg-white/90 p-4 text-slate-900 shadow-lg backdrop-blur"
            )}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-3 flex items-center justify-between">
              <div>
                <div className="text-base font-semibold">Manager QC</div>
                <div className="mt-0.5 text-xs text-slate-500">
                  Manager is your logged-in team member. Staff list is team members.
                </div>
              </div>

              <button onClick={() => setQcOpen(false)} className="rounded-md p-2 text-slate-500 hover:bg-slate-100">
                ✕
              </button>
            </div>

            {/* Add QC review */}
            <div className="rounded-2xl border border-slate-200 bg-white/90 p-3">
              <div className="mb-3 grid gap-2 sm:grid-cols-2">
                <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
                  <div className="text-[11px] font-extrabold uppercase tracking-[0.22em] text-slate-500">Manager</div>
                  <div className="mt-1 text-sm font-semibold text-slate-900">
                    {managerTeamMember ? tmLabel(managerTeamMember) : "Not linked"}
                  </div>
                  {!managerTeamMember ? (
                    <div className="mt-1 text-xs text-rose-700">
                      Link this login by setting <span className="font-semibold">team_members.user_id</span>.
                    </div>
                  ) : null}
                </div>

                <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
                  <div className="text-[11px] font-extrabold uppercase tracking-[0.22em] text-slate-500">Location</div>
                  <div className="mt-1 text-sm font-semibold text-slate-900">
                    {locations.find((l) => l.id === locationId)?.name ?? "—"}
                  </div>
                </div>
              </div>

              <div className="grid gap-3 md:grid-cols-4">
                <div>
                  <label className="mb-1 block text-xs text-slate-500">Staff</label>
                  <select
                    value={qcForm.staff_id}
                    onChange={(e) => setQcForm((f) => ({ ...f, staff_id: e.target.value }))}
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
                  <label className="mb-1 block text-xs text-slate-500">Date</label>
                  <input
                    type="date"
                    value={qcForm.reviewed_on}
                    onChange={(e) => setQcForm((f) => ({ ...f, reviewed_on: e.target.value }))}
                    className="h-10 w-full rounded-xl border border-slate-300 bg-white/80 px-3 text-sm"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-xs text-slate-500">Score</label>
                  <select
                    value={qcForm.score}
                    onChange={(e) => setQcForm((f) => ({ ...f, score: Number(e.target.value) }))}
                    className="h-10 w-full rounded-xl border border-slate-300 bg-white/80 px-3 text-sm"
                  >
                    {[1, 2, 3, 4, 5].map((n) => (
                      <option key={n} value={n}>
                        {n}/5
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mb-1 block text-xs text-slate-500">Notes</label>
                  <input
                    value={qcForm.notes}
                    onChange={(e) => setQcForm((f) => ({ ...f, notes: e.target.value }))}
                    placeholder="Optional…"
                    className="h-10 w-full rounded-xl border border-slate-300 bg-white/80 px-3 text-sm"
                  />
                </div>
              </div>

              <div className="mt-3 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setQcOpen(false)}
                  className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Close
                </button>
                <button
                  type="button"
                  onClick={addQcReview}
                  disabled={qcSaving || !orgId || !locationId || !managerTeamMember}
                  className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700 disabled:opacity-60"
                >
                  {qcSaving ? "Saving…" : "Add QC"}
                </button>
              </div>
            </div>

            {/* QC table */}
            <div className="mt-4 overflow-x-auto rounded-2xl border border-slate-200 bg-white/90">
              <table className="min-w-full text-xs">
                <thead className="bg-slate-50">
                  <tr className="text-left text-slate-500">
                    <th className="px-3 py-2">Date</th>
                    <th className="px-3 py-2">Staff</th>
                    <th className="px-3 py-2">Manager</th>
                    <th className="px-3 py-2">Score</th>
                    <th className="px-3 py-2">Notes</th>
                    <th className="px-3 py-2 text-right">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {qcLoading ? (
                    <tr>
                      <td colSpan={6} className="px-3 py-6 text-center text-slate-500">
                        Loading…
                      </td>
                    </tr>
                  ) : (showAllQc ? qcReviews : qcReviews.slice(0, 10)).length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-3 py-6 text-center text-slate-500">
                        No QC reviews logged.
                      </td>
                    </tr>
                  ) : (
                    (showAllQc ? qcReviews : qcReviews.slice(0, 10)).map((r) => {
                      const pill =
                        r.score >= 4
                          ? "bg-emerald-100 text-emerald-800"
                          : r.score === 3
                          ? "bg-amber-100 text-amber-800"
                          : "bg-red-100 text-red-800";

                      return (
                        <tr key={r.id} className="border-t border-slate-100 text-slate-800">
                          <td className="px-3 py-2 whitespace-nowrap">{r.reviewed_on}</td>
                          <td className="px-3 py-2 whitespace-nowrap">{tmLabel(r.staff ?? { initials: null, name: "—" })}</td>
                          <td className="px-3 py-2 whitespace-nowrap">
                            {tmLabel(r.manager ?? { initials: null, name: "—" })}
                          </td>
                          <td className="px-3 py-2">
                            <span
                              className={cls(
                                "inline-flex rounded-full px-2 py-[1px] text-[10px] font-extrabold uppercase",
                                pill
                              )}
                            >
                              {r.score}/5
                            </span>
                          </td>
                          <td className="px-3 py-2 max-w-[18rem] truncate">{r.notes ?? "—"}</td>
                          <td className="px-3 py-2 text-right">
                            <button
                              type="button"
                              onClick={() => deleteQcReview(r.id)}
                              className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 font-semibold text-slate-700 hover:bg-slate-50"
                            >
                              Delete
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            <TableFooterToggle total={qcReviews.length} showingAll={showAllQc} onToggle={() => setShowAllQc((v) => !v)} />
          </div>
        </div>
      )}
    </>
  );
}

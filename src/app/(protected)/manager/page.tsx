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
      className={cls("relative rounded-2xl border p-4 shadow-sm overflow-hidden", "flex flex-col", KPI_HEIGHT, toneCls)}
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
     Manager QC modal state (EDITED ONLY THIS PART)
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
      // NOTE: these joins assume you applied the FK migration to team_members
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
        .limit(5000);

      if (error) throw error;
      setQcReviews((data ?? []) as StaffQcReviewRow[]);
    } catch (e) {
      console.error(e);
      setQcReviews([]);
    } finally {
      setQcLoading(false);
    }
  }

  async function addQcReview() {
    if (!orgId || !locationId || !managerTeamMember) return;
    if (!qcForm.staff_id) return;

    setQcSaving(true);
    try {
      const payload = {
        org_id: orgId,
        location_id: locationId,
        reviewed_on: qcForm.reviewed_on,
        score: qcForm.score,
        notes: qcForm.notes?.trim() || null,
        staff_id: qcForm.staff_id,
        manager_id: managerTeamMember.id,
      };

      const { error } = await supabase.from("staff_qc_reviews").insert(payload);
      if (error) throw error;

      setQcForm((f) => ({ ...f, notes: "" }));
      await loadQcReviews();
    } catch (e) {
      console.error(e);
      alert("Failed to add QC review.");
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
    } catch (e) {
      console.error(e);
      alert("Failed to delete QC review.");
    }
  }

  async function loadLocations() {
    if (!orgId) return;
    setLocationLoading(true);
    try {
      const { data, error } = await supabase.from("locations").select("id,name").eq("org_id", orgId).order("name");
      if (error) throw error;
      setLocations((data ?? []) as LocationOption[]);
    } catch (e) {
      console.error(e);
      setLocations([]);
    } finally {
      setLocationLoading(false);
    }
  }

  async function loadData(ymd: string) {
    if (!orgId || !locationId) return;
    setLoading(true);
    setErr(null);

    try {
      const dayStart = new Date(ymd);
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(ymd);
      dayEnd.setHours(23, 59, 59, 999);

      const start7 = new Date(dayStart);
      start7.setDate(start7.getDate() - 6);

      const startIsoDate = isoDate(start7);
      const endIsoDate = isoDate(dayEnd);

      const [
        tempsTodayRes,
        tempsFails7Res,
        tempRowsRes,
        cleaningProgressRes,
        cleaningActivityRes,
        incidentsTodayRes,
        incidents7Res,
        incidentsRowsRes,
        trainingDueRes,
        trainingExpiredRes,
      ] = await Promise.all([
        supabase
          .from("food_temp_logs")
          .select("id", { count: "exact", head: true })
          .eq("org_id", orgId)
          .eq("location_id", locationId)
          .gte("at", dayStart.toISOString())
          .lte("at", dayEnd.toISOString()),

        supabase
          .from("food_temp_logs")
          .select("id", { count: "exact", head: true })
          .eq("org_id", orgId)
          .eq("location_id", locationId)
          .eq("status", "fail")
          .gte("at", start7.toISOString())
          .lte("at", dayEnd.toISOString()),

        supabase
          .from("food_temp_logs")
          .select("id,at,staff_initials,target_key,area,temp_c,status")
          .eq("org_id", orgId)
          .eq("location_id", locationId)
          .gte("at", dayStart.toISOString())
          .lte("at", dayEnd.toISOString())
          .order("at", { ascending: false })
          .limit(500),

        supabase.rpc("manager_cleaning_category_progress", { p_org_id: orgId, p_location_id: locationId, p_run_on: ymd }),

        supabase
          .from("cleaning_task_runs")
          .select("id,done_at,done_by,task_id,run_on,location_id,task:cleaning_tasks(category,task)")
          .eq("org_id", orgId)
          .eq("location_id", locationId)
          .eq("run_on", ymd)
          .order("done_at", { ascending: false })
          .limit(500),

        supabase
          .from("cleaning_incidents")
          .select("id", { count: "exact", head: true })
          .eq("org_id", orgId)
          .eq("location_id", locationId)
          .eq("happened_on", ymd),

        supabase
          .from("cleaning_incidents")
          .select("id", { count: "exact", head: true })
          .eq("org_id", orgId)
          .eq("location_id", locationId)
          .gte("happened_on", startIsoDate)
          .lte("happened_on", endIsoDate),

        supabase
          .from("cleaning_incidents")
          .select("id,happened_on,type,details,corrective_action,preventive_action,created_by,created_at")
          .eq("org_id", orgId)
          .eq("location_id", locationId)
          .eq("happened_on", ymd)
          .order("created_at", { ascending: false })
          .limit(200),

        supabase.rpc("manager_training_due_soon_count", { p_org_id: orgId, p_location_id: locationId, p_days: 30 }),

        supabase.rpc("manager_training_expired_count", { p_org_id: orgId, p_location_id: locationId }),
      ]);

      if (tempsTodayRes.error) throw tempsTodayRes.error;
      if (tempsFails7Res.error) throw tempsFails7Res.error;
      if (tempRowsRes.error) throw tempRowsRes.error;
      if (cleaningProgressRes.error) throw cleaningProgressRes.error;
      if (cleaningActivityRes.error) throw cleaningActivityRes.error;
      if (incidentsTodayRes.error) throw incidentsTodayRes.error;
      if (incidents7Res.error) throw incidents7Res.error;
      if (incidentsRowsRes.error) throw incidentsRowsRes.error;
      if (trainingDueRes.error) throw trainingDueRes.error;
      if (trainingExpiredRes.error) throw trainingExpiredRes.error;

      setTempsSummary({
        today: tempsTodayRes.count ?? 0,
        fails7d: tempsFails7Res.count ?? 0,
      });

      const tempRows = (tempRowsRes.data ?? []).map((r: any) => {
        const dt = r.at ? new Date(r.at) : null;
        return {
          id: r.id,
          time: formatTimeHM(dt) ?? "—",
          staff: (r.staff_initials ?? "—").toString().toUpperCase(),
          item: (r.target_key ?? "—").toString(),
          area: (r.area ?? "—").toString(),
          temp_c: r.temp_c ?? null,
          status: r.status ?? null,
        } as TodayTempRow;
      });
      setTodayTemps(tempRows);

      setCleaningCategoryProgress((cleaningProgressRes.data ?? []) as CleaningCategoryProgressRow[]);

      const cleaningRows = (cleaningActivityRes.data ?? []).map((r: any) => {
        const dt = r.done_at ? new Date(r.done_at) : null;
        const category = r.task?.category ?? "—";
        const task = r.task?.task ?? null;
        return {
          id: r.id,
          time: formatTimeHM(dt),
          category,
          staff: (r.done_by ?? null) ? String(r.done_by).toUpperCase() : null,
          notes: null,
          task,
        } as CleaningActivityRow;
      });
      setCleaningActivity(cleaningRows);

      setIncidentSummary({
        todayCount: incidentsTodayRes.count ?? 0,
        last7Count: incidents7Res.count ?? 0,
      });

      setIncidentsToday((incidentsRowsRes.data ?? []) as CleaningIncident[]);

      setTrainingDueSoon((trainingDueRes.data as any)?.count ?? (trainingDueRes.data ?? 0));
      setTrainingExpired((trainingExpiredRes.data as any)?.count ?? (trainingExpiredRes.data ?? 0));
    } catch (e: any) {
      console.error(e);
      setErr(e?.message ?? "Failed to load manager dashboard data.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let alive = true;

    (async () => {
      try {
        const o = await getActiveOrgIdClient();
        const l = await getActiveLocationIdClient();
        if (!alive) return;
        setOrgId(o);
        setLocationId(l);
      } catch (e) {
        console.error(e);
      }
    })();

    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    if (!orgId) return;
    loadLocations();
    loadTeamOptions();
    loadLoggedInManager();
  }, [orgId]);

  useEffect(() => {
    if (!orgId || !locationId) return;
    loadData(selectedDateISO);
    loadQcReviews();
  }, [orgId, locationId, selectedDateISO]);

  const prettyDate = useMemo(() => formatPrettyDate(new Date(selectedDateISO)), [selectedDateISO]);

  const cleaningToRender = useMemo(() => (showAllCleaning ? cleaningActivity : cleaningActivity.slice(0, 10)), [cleaningActivity, showAllCleaning]);
  const incidentsToRender = useMemo(() => (showAllIncidents ? incidentsToday : incidentsToday.slice(0, 10)), [incidentsToday, showAllIncidents]);
  const tempsToRender = useMemo(() => (showAllTemps ? todayTemps : todayTemps.slice(0, 10)), [todayTemps, showAllTemps]);

  return (
    <>
      <section className="mt-4">
        <div className="text-center">
          <div className="text-[11px] font-extrabold uppercase tracking-[0.22em] text-slate-500">Today</div>
          <h1 className="mt-2 text-4xl font-black text-slate-900">{prettyDate}</h1>
        </div>

        <div className="mt-6 grid gap-3 md:grid-cols-4">
          <KpiTile title="Temps" value={tempsSummary.today} sub={`Fails (7d): ${tempsSummary.fails7d}`} tone="ok" icon="🌡️" />
          <KpiTile title="Incidents" value={incidentSummary.todayCount} sub={`Last 7d: ${incidentSummary.last7Count}`} tone="ok" icon="⚠️" />
          <KpiTile title="Training" value={trainingDueSoon + trainingExpired} sub={`Due soon (30d): ${trainingDueSoon}`} tone="warn" icon="🎓" />
          <KpiTile
            title="Cleaning completion"
            value={
              cleaningCategoryProgress.reduce((acc, r) => acc + r.done, 0) +
              "/" +
              cleaningCategoryProgress.reduce((acc, r) => acc + r.total, 0)
            }
            sub="Done / total (selected day)"
            tone="neutral"
            icon="✅"
          />
        </div>

        <div className="mt-5 rounded-2xl border border-slate-200 bg-white/90 p-3 shadow-sm">
          <div className="flex flex-wrap items-center justify-center gap-2">
            <button
              type="button"
              onClick={() => setSelectedDateISO((d) => addDaysISO(d, -1))}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              ←
            </button>

            <input
              type="date"
              value={selectedDateISO}
              onChange={(e) => setSelectedDateISO(e.target.value)}
              className="h-10 rounded-xl border border-slate-300 bg-white px-3 text-sm"
            />

            <button
              type="button"
              onClick={() => setSelectedDateISO((d) => addDaysISO(d, 1))}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              →
            </button>

            <select
              value={locationId ?? ""}
              disabled={locationLoading}
              onChange={(e) => setLocationId(e.target.value)}
              className="h-10 rounded-xl border border-slate-300 bg-white px-3 text-sm"
            >
              {locations.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.name}
                </option>
              ))}
            </select>

            <button
              type="button"
              onClick={() => setQcOpen(true)}
              className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              Manager QC
            </button>

            <button
              type="button"
              onClick={() => {
                if (!orgId || !locationId) return;
                loadData(selectedDateISO);
                loadQcReviews();
              }}
              className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700 disabled:opacity-60"
              disabled={!orgId || !locationId || loading}
            >
              Refresh
            </button>
          </div>

          {err ? <div className="mt-3 text-center text-sm text-rose-700">{err}</div> : null}
        </div>
      </section>

      <section className="mt-6">
        <div className="grid gap-6 md:grid-cols-2">
          <div>
            <h3 className="mb-2 text-[11px] font-extrabold uppercase tracking-[0.22em] text-slate-500">Cleaning progress</h3>

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
                        No cleaning tasks due.
                      </td>
                    </tr>
                  ) : (
                    cleaningCategoryProgress.map((r) => {
                      const pct = r.total ? Math.round((r.done / r.total) * 100) : 0;
                      return (
                        <tr key={r.category} className="border-t border-slate-100 text-slate-800">
                          <td className="px-3 py-2 font-semibold">{r.category}</td>
                          <td className="px-3 py-2">{r.done}</td>
                          <td className="px-3 py-2">{r.total}</td>
                          <td className="px-3 py-2">
                            <span className="inline-flex rounded-full bg-emerald-100 px-2 py-[1px] text-[10px] font-extrabold uppercase text-emerald-800">
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

          <div>
            <h3 className="mb-2 text-[11px] font-extrabold uppercase tracking-[0.22em] text-slate-500">Incidents</h3>

            <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white/90">
              <table className="min-w-full text-xs">
                <thead className="bg-slate-50">
                  <tr className="text-left text-slate-500">
                    <th className="px-3 py-2">Type</th>
                    <th className="px-3 py-2">Details</th>
                    <th className="px-3 py-2">Corrective</th>
                    <th className="px-3 py-2">Preventive</th>
                    <th className="px-3 py-2">Created</th>
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
                        <td className="px-3 py-2 font-semibold">{r.type ?? "—"}</td>
                        <td className="px-3 py-2 max-w-[16rem] truncate">{r.details ?? "—"}</td>
                        <td className="px-3 py-2 max-w-[16rem] truncate">{r.corrective_action ?? "—"}</td>
                        <td className="px-3 py-2 max-w-[16rem] truncate">{r.preventive_action ?? "—"}</td>
                        <td className="px-3 py-2">
                          <div className="font-semibold">{(r.created_by ?? "—").toString().toUpperCase()}</div>
                          <div className="text-[11px] text-slate-500 truncate max-w-[10rem]">{r.created_at ?? "—"}</div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <TableFooterToggle total={incidentsToday.length} showingAll={showAllIncidents} onToggle={() => setShowAllIncidents((v) => !v)} />
          </div>
        </div>
      </section>

      <section className="mt-6">
        <div className="grid gap-6 md:grid-cols-2">
          <div>
            <h3 className="mb-2 text-[11px] font-extrabold uppercase tracking-[0.22em] text-slate-500">Temp logs</h3>

            <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white/90">
              <table className="min-w-full text-xs">
                <thead className="bg-slate-50">
                  <tr className="text-left text-slate-500">
                    <th className="px-3 py-2">Time</th>
                    <th className="px-3 py-2">Area</th>
                    <th className="px-3 py-2">Item</th>
                    <th className="px-3 py-2">Temp</th>
                    <th className="px-3 py-2">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {tempsToRender.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-3 py-4 text-center text-slate-500">
                        No temperature logs.
                      </td>
                    </tr>
                  ) : (
                    tempsToRender.map((r) => (
                      <tr key={r.id} className="border-t border-slate-100 text-slate-800">
                        <td className="px-3 py-2">{r.time}</td>
                        <td className="px-3 py-2 font-semibold">{r.area}</td>
                        <td className="px-3 py-2">{r.item}</td>
                        <td className="px-3 py-2">{r.temp_c ?? "—"}</td>
                        <td className="px-3 py-2">
                          {r.status ? (
                            <span
                              className={cls(
                                "inline-flex rounded-full px-2 py-[1px] text-[10px] font-extrabold uppercase",
                                r.status === "fail"
                                  ? "bg-red-100 text-red-800"
                                  : "bg-emerald-100 text-emerald-800"
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

            <TableFooterToggle total={todayTemps.length} showingAll={showAllTemps} onToggle={() => setShowAllTemps((v) => !v)} />
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
                          {r.task ? <div className="text-[11px] text-slate-500 truncate max-w-[18rem]">{r.task}</div> : null}
                        </td>
                        <td className="px-3 py-2">{r.staff ?? "—"}</td>
                        <td className="px-3 py-2 max-w-[14rem] truncate">{r.notes ?? "—"}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <TableFooterToggle total={cleaningActivity.length} showingAll={showAllCleaning} onToggle={() => setShowAllCleaning((v) => !v)} />
          </div>
        </div>
      </section>

      {/* Manager QC modal (still a popup; just team_members + logged in manager now) */}
      {qcOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/30 overflow-y-auto overscroll-contain p-3 sm:p-4"
          onClick={() => setQcOpen(false)}
        >
          <div
            className={cls(
              "mx-auto my-6 w-full max-w-3xl rounded-2xl border border-slate-200 bg-white/90 p-4 text-slate-900 shadow-lg backdrop-blur"
            )}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-3 flex items-center justify-between">
              <div>
                <div className="text-base font-semibold">Manager QC</div>
                <div className="mt-0.5 text-xs text-slate-500">
                  Manager is your logged-in team member. Staff list is team
                  members.
                </div>
              </div>

              <button
                onClick={() => setQcOpen(false)}
                className="rounded-md p-2 text-slate-500 hover:bg-slate-100"
              >
                ✕
              </button>
            </div>

            {/* Add QC review */}
            <div className="rounded-2xl border border-slate-200 bg-white/90 p-3">
              <div className="mb-3 grid gap-2 sm:grid-cols-2">
                <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
                  <div className="text-[11px] font-extrabold uppercase tracking-[0.22em] text-slate-500">
                    Manager
                  </div>
                  <div className="mt-1 text-sm font-semibold text-slate-900">
                    {managerTeamMember ? tmLabel(managerTeamMember) : "Not linked"}
                  </div>
                  {!managerTeamMember ? (
                    <div className="mt-1 text-xs text-rose-700">
                      Link this login by setting{" "}
                      <span className="font-semibold">team_members.user_id</span>.
                    </div>
                  ) : null}
                </div>

                <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
                  <div className="text-[11px] font-extrabold uppercase tracking-[0.22em] text-slate-500">
                    Location
                  </div>
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

            {/* Table */}
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
                          <td className="px-3 py-2 whitespace-nowrap">{tmLabel(r.manager ?? { initials: null, name: "—" })}</td>
                          <td className="px-3 py-2">
                            <span className={cls("inline-flex rounded-full px-2 py-[1px] text-[10px] font-extrabold uppercase", pill)}>
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

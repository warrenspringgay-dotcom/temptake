// src/app/(protected)/manager/page.tsx
"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
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
  item: string; // comes from food_temp_logs.note
  area: string;
  temp_c: number | null;
  status: "pass" | "fail" | null;
};

type TempCorrectiveRow = {
  id: string;
  time: string;
  staff: string;
  area: string;
  item: string;
  fail_temp_c: number | null;
  action: string;
  recheck_temp_c: number | null;
  recheck_time: string | null;
  recheck_status: string | null;
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
  signoff_on: string;
  signed_by: string | null;
  notes: string | null;
  created_at: string | null;
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

/* =========================
   Individual staff assessment modal
========================= */
type StaffAssessment = {
  staffId: string;
  staffLabel: string;
  rangeDays: number;
  cleaningRuns: number;
  tempLogs: number;
  tempFails: number;
  incidents: number;
  qcAvg30d: number | null;
  qcCount30d: number;
};

const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const MONTHS = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December",
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

function normalizeTempStatus(s: string | null | undefined): "pass" | "fail" | null {
  const v = (s ?? "").toString().trim().toLowerCase();
  if (!v) return null;
  if (v === "pass" || v === "ok" || v === "safe") return "pass";
  if (v === "fail" || v === "unsafe") return "fail";
  return null;
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
          <div className="text-[11px] font-extrabold uppercase tracking-[0.22em] text-slate-700/90">
            {title}
          </div>
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

  const nowISO = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return isoDate(d);
  }, []);

  const [selectedDateISO, setSelectedDateISO] = useState<string>(nowISO);

  const [tempsSummary, setTempsSummary] = useState<TempSummary>({ today: 0, fails7d: 0 });
  const [todayTemps, setTodayTemps] = useState<TodayTempRow[]>([]);

  // ✅ corrective actions (temp)
  const [tempCorrectives, setTempCorrectives] = useState<TempCorrectiveRow[]>([]);
  const [showAllTempCorrectives, setShowAllTempCorrectives] = useState(false);

  const [cleaningCategoryProgress, setCleaningCategoryProgress] = useState<CleaningCategoryProgressRow[]>([]);
  const [cleaningActivity, setCleaningActivity] = useState<CleaningActivityRow[]>([]);

  const [incidentSummary, setIncidentSummary] = useState<IncidentSummary>({ todayCount: 0, last7Count: 0 });
  const [incidentsToday, setIncidentsToday] = useState<CleaningIncident[]>([]);

  const [trainingDueSoon, setTrainingDueSoon] = useState(0);
  const [trainingExpired, setTrainingExpired] = useState(0);

  const [showAllTemps, setShowAllTemps] = useState(false);
  const [showAllCleaning, setShowAllCleaning] = useState(false);
  const [showAllIncidents, setShowAllIncidents] = useState(false);

  /* ===== Day sign-offs ===== */
  const [signoffsToday, setSignoffsToday] = useState<SignoffRow[]>([]);
  const [signoffSummary, setSignoffSummary] = useState<SignoffSummary>({ todayCount: 0 });
  const [showAllSignoffs, setShowAllSignoffs] = useState(false);

  // ✅ Sign-off modal state
  const [signoffOpen, setSignoffOpen] = useState(false);
  const [signoffInitials, setSignoffInitials] = useState("");
  const [signoffNotes, setSignoffNotes] = useState("");
  const [signoffSaving, setSignoffSaving] = useState(false);

  /* ===== Incident modal state ===== */
  const [incidentOpen, setIncidentOpen] = useState(false);
  const [incidentSaving, setIncidentSaving] = useState(false);
  const [incidentInitials, setIncidentInitials] = useState("");
  const [incidentType, setIncidentType] = useState("");
  const [incidentDetails, setIncidentDetails] = useState("");
  const [incidentCorrective, setIncidentCorrective] = useState("");
  const [incidentPreventive, setIncidentPreventive] = useState("");

  /* ===== Manager QC ===== */
  const [qcOpen, setQcOpen] = useState(false);
  const [teamOptions, setTeamOptions] = useState<TeamMemberOption[]>([]);
  const [qcReviews, setQcReviews] = useState<StaffQcReviewRow[]>([]);
  const [qcLoading, setQcLoading] = useState(false);
  const [qcSaving, setQcSaving] = useState(false);
  const [showAllQc, setShowAllQc] = useState(false);

  const [managerTeamMember, setManagerTeamMember] = useState<TeamMemberOption | null>(null);

  const [qcForm, setQcForm] = useState({
    staff_id: "",
    reviewed_on: nowISO,
    score: 3,
    notes: "",
  });

  /* ===== Individual staff assessment modal ===== */
  const [staffAssessOpen, setStaffAssessOpen] = useState(false);
  const [staffAssessLoading, setStaffAssessLoading] = useState(false);
  const [staffAssessErr, setStaffAssessErr] = useState<string | null>(null);
  const [staffAssessStaffId, setStaffAssessStaffId] = useState<string>("");
  const [staffAssessDays, setStaffAssessDays] = useState<number>(7);
  const [staffAssess, setStaffAssess] = useState<StaffAssessment | null>(null);

  const lastStaffAssessKeyRef = useRef<string>("");

  const centeredDate = useMemo(() => formatPrettyDate(new Date(selectedDateISO)), [selectedDateISO]);

  const tempsTone: "neutral" | "ok" | "warn" | "danger" = tempsSummary.fails7d > 0 ? "danger" : "ok";
  const incidentsTone: "neutral" | "ok" | "warn" | "danger" =
    incidentSummary.todayCount > 0 ? "warn" : "ok";
  const trainingTone: "neutral" | "ok" | "warn" | "danger" =
    trainingExpired > 0 ? "danger" : trainingDueSoon > 0 ? "warn" : "ok";

  const cleaningDoneTotal = cleaningCategoryProgress.reduce((a, r) => a + r.done, 0);
  const cleaningTotal = cleaningCategoryProgress.reduce((a, r) => a + r.total, 0);
  const cleaningAllDone = cleaningTotal > 0 && cleaningDoneTotal === cleaningTotal;
  const alreadySignedOff = signoffsToday.length > 0;

  const tempsToRender = showAllTemps ? todayTemps : todayTemps.slice(0, 10);
  const cleaningToRender = showAllCleaning ? cleaningActivity : cleaningActivity.slice(0, 10);
  const incidentsToRender = showAllIncidents ? incidentsToday : incidentsToday.slice(0, 10);
  const corrToRender = showAllTempCorrectives ? tempCorrectives : tempCorrectives.slice(0, 10);
  const qcToRender = showAllQc ? qcReviews : qcReviews.slice(0, 10);
  const signoffsToRender = showAllSignoffs ? signoffsToday : signoffsToday.slice(0, 10);

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
      setManagerTeamMember((data as TeamMemberOption) || null);
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
      setQcReviews(((data ?? []) as unknown[]) as StaffQcReviewRow[]);
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
    if (!managerTeamMember?.id)
      return alert("Your login is not linked to a team member (team_members.user_id).");
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
    } catch (e: unknown) {
      console.error(e);
      alert(e instanceof Error ? e.message : "Failed to add QC review.");
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
    } catch (e: unknown) {
      console.error(e);
      alert(e instanceof Error ? e.message : "Failed to delete QC review.");
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

        const locs: LocationOption[] =
          data?.map((r: { id: string; name: string | null }) => ({
            id: String(r.id),
            name: r.name ?? "Unnamed",
          })) ?? [];
        setLocations(locs);

        const activeLoc = await getActiveLocationIdClient();
        if (activeLoc) setLocationId(activeLoc);
        else if (locs[0]) setLocationId(locs[0].id);
      } catch (e: unknown) {
        console.error(e);
        setErr(e instanceof Error ? e.message : "Failed to load locations.");
      } finally {
        setLocationLoading(false);
      }
    })();
  }, []);

  useEffect(() => {
    if (!orgId) return;
    void loadTeamOptions();
    void loadLoggedInManager();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orgId]);

  // Auto-populate signoff initials when signoff modal opens
  useEffect(() => {
    if (!signoffOpen) return;
    if (signoffInitials.trim()) return;
    const ini = managerTeamMember?.initials?.trim().toUpperCase() ?? "";
    if (ini) setSignoffInitials(ini);
  }, [signoffOpen, managerTeamMember, signoffInitials]);

  // Auto-populate incident initials when incident modal opens
  useEffect(() => {
    if (!incidentOpen) return;
    if (incidentInitials.trim()) return;
    const ini = managerTeamMember?.initials?.trim().toUpperCase() ?? "";
    if (ini) setIncidentInitials(ini);
  }, [incidentOpen, managerTeamMember, incidentInitials]);

  useEffect(() => {
    if (!orgId || !locationId) return;
    void refreshAll();
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

      const trainingBase = new Date(selectedDateISO);
      trainingBase.setHours(0, 0, 0, 0);
      const thirtyDaysAhead = new Date(trainingBase);
      thirtyDaysAhead.setDate(thirtyDaysAhead.getDate() + 30);

      const [
        tempsCountRes,
        fails7dRes,
        tempsListRes,

        // ✅ Correctives joined to temp log (NO item column, uses note)
        tempCorrectivesRes,

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
          // ✅ select fields that exist
          .select("id, at, area, note, temp_c, status, staff_initials, created_at")
          .eq("org_id", orgId)
          .eq("location_id", locationId)
          .gte("at", d0.toISOString())
          .lt("at", d1.toISOString())
          .order("at", { ascending: false })
          .limit(200),

        supabase
          .from("food_temp_corrective_actions")
          .select(
            `
            id,
            action,
            recheck_temp_c,
            recheck_at,
            recheck_status,
            recorded_by,
            created_at,
            temp_log:food_temp_logs!food_temp_corrective_actions_temp_log_id_fkey(
              id,
              at,
              area,
              note,
              temp_c,
              staff_initials,
              status,
              location_id
            )
          `
          )
          .eq("org_id", orgId)
          .or(`location_id.eq.${locationId},location_id.is.null`)
          .gte("created_at", d0.toISOString())
          .lt("created_at", d1.toISOString())
          .order("created_at", { ascending: false })
          .limit(500),

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
        tempCorrectivesRes.error ||
        cleaningTasksRes.error ||
        cleaningRunsDayRes.error ||
        incidentsDayRes.error ||
        incidents7dRes.error ||
        trainingsRes.error ||
        signoffsDayRes.error;

      if (firstError) throw firstError;

      setTempsSummary({ today: tempsCountRes.count ?? 0, fails7d: fails7dRes.count ?? 0 });

      const tempsData = (tempsListRes.data ?? []) as Array<{
        id: string;
        at: string | null;
        created_at: string | null;
        area: string | null;
        note: string | null;
        temp_c: number | null;
        status: string | null;
        staff_initials: string | null;
      }>;

      setTodayTemps(
        tempsData.map((r) => {
          const ts = r.at ? new Date(r.at) : r.created_at ? new Date(r.created_at) : null;
          const st = normalizeTempStatus(r.status);
          return {
            id: String(r.id),
            time: formatTimeHM(ts) ?? "—",
            staff: (r.staff_initials ?? "—").toString(),
            area: (r.area ?? "—").toString(),
            // ✅ item is "note"
            item: (r.note ?? "—").toString(),
            temp_c: r.temp_c != null ? Number(r.temp_c) : null,
            status: st,
          };
        })
      );

      // ✅ Corrective actions mapping
      const corrRaw = (tempCorrectivesRes.data ?? []) as Array<{
        id: string;
        action: string | null;
        recheck_temp_c: number | null;
        recheck_at: string | null;
        recheck_status: string | null;
        recorded_by: string | null;
        created_at: string | null;
        temp_log:
          | {
              at: string | null;
              area: string | null;
              note: string | null;
              temp_c: number | null;
              staff_initials: string | null;
              status: string | null;
              location_id: string | null;
            }
          | null;
      }>;

      const corrMapped: TempCorrectiveRow[] = corrRaw
        .map((row) => {
          const tl = row.temp_log;
          // if corrective has null location_id, rely on temp log's location_id
          if (tl?.location_id && String(tl.location_id) !== String(locationId)) return null;

          const createdAt = row.created_at ? new Date(row.created_at) : null;
          const recheckAt = row.recheck_at ? new Date(row.recheck_at) : null;
          const tlAt = tl?.at ? new Date(tl.at) : null;

          return {
            id: String(row.id),
            time: formatTimeHM(createdAt) ?? (tlAt ? formatTimeHM(tlAt) ?? "—" : "—"),
            staff: ((tl?.staff_initials ?? row.recorded_by ?? "—") as string).toString(),
            area: ((tl?.area ?? "—") as string).toString(),
            item: ((tl?.note ?? "—") as string).toString(),
            fail_temp_c: tl?.temp_c != null ? Number(tl.temp_c) : null,
            action: (row.action ?? "—").toString(),
            recheck_temp_c: row.recheck_temp_c != null ? Number(row.recheck_temp_c) : null,
            recheck_time: recheckAt ? formatTimeHM(recheckAt) : null,
            recheck_status: row.recheck_status ? String(row.recheck_status) : null,
          };
        })
        .filter((x): x is TempCorrectiveRow => Boolean(x));

      setTempCorrectives(corrMapped);
      setShowAllTempCorrectives(false);

      // training
      const tRows = (trainingsRes.data ?? []) as Array<{ expires_on: string | null }>;
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

      // cleaning
      const tasksRaw = (cleaningTasksRes.data ?? []) as Array<Record<string, unknown>>;
      const tasks: CleaningTask[] = tasksRaw.map((t) => ({
        id: String(t.id),
        frequency: (String(t.frequency ?? "daily").toLowerCase() as "daily" | "weekly" | "monthly") ?? "daily",
        category: (t.category as string | null) ?? null,
        task: (t.task as string | null) ?? null,
        weekday: t.weekday != null ? Number(t.weekday) : null,
        month_day: t.month_day != null ? Number(t.month_day) : null,
      }));

      const taskById = new Map<string, CleaningTask>();
      for (const t of tasks) taskById.set(t.id, t);

      const runsRaw = (cleaningRunsDayRes.data ?? []) as CleaningTaskRun[];

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
          .sort((a: CleaningCategoryProgressRow, b: CleaningCategoryProgressRow) => a.category.localeCompare(b.category))
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

      // incidents
      const incDay = (incidentsDayRes.data ?? []) as CleaningIncident[];
      setIncidentsToday(incDay);
      setIncidentSummary({ todayCount: incDay.length, last7Count: incidents7dRes.count ?? 0 });

      // sign-offs
      const soRows = (signoffsDayRes.data ?? []) as SignoffRow[];
      setSignoffsToday(soRows);
      setSignoffSummary({ todayCount: soRows.length });
      setShowAllSignoffs(false);

      setShowAllTemps(false);
      setShowAllCleaning(false);
      setShowAllIncidents(false);
    } catch (e: unknown) {
      console.error(e);
      setErr(e instanceof Error ? e.message : "Failed to load manager dashboard.");
    } finally {
      setLoading(false);
    }
  }

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

      const row = data as SignoffRow;

      setSignoffsToday((prev) => [row, ...prev]);
      setSignoffSummary((prev) => ({ ...prev, todayCount: prev.todayCount + 1 }));
      setShowAllSignoffs(false);

      setSignoffInitials("");
      setSignoffNotes("");
      setSignoffOpen(false);
    } catch (e: unknown) {
      console.error(e);
      alert(e instanceof Error ? e.message : "Failed to sign off the day.");
    } finally {
      setSignoffSaving(false);
    }
  }

  async function createIncident() {
    if (!orgId || !locationId) return;

    const initials = incidentInitials.trim().toUpperCase();
    const type = incidentType.trim();
    const details = incidentDetails.trim();
    const corrective = incidentCorrective.trim();
    const preventive = incidentPreventive.trim();

    if (!initials) return alert("Enter initials.");
    if (!type) return alert("Enter incident type.");
    if (!details) return alert("Enter incident details.");

    setIncidentSaving(true);
    try {
      const payload = {
        org_id: orgId,
        location_id: locationId,
        happened_on: selectedDateISO,
        type,
        details,
        corrective_action: corrective || null,
        preventive_action: preventive || null,
        created_by: initials,
      };

      const { error } = await supabase.from("cleaning_incidents").insert(payload);
      if (error) throw error;

      setIncidentType("");
      setIncidentDetails("");
      setIncidentCorrective("");
      setIncidentPreventive("");
      setIncidentOpen(false);

      await refreshAll();
    } catch (e: unknown) {
      console.error(e);
      alert(e instanceof Error ? e.message : "Failed to log incident.");
    } finally {
      setIncidentSaving(false);
    }
  }

  // Staff assessment (lightweight, doesn’t change UI)
  useEffect(() => {
    if (!staffAssessOpen) return;
    if (!orgId || !locationId) return;
    if (!staffAssessStaffId) return;

    const key = `${staffAssessStaffId}|${staffAssessDays}|${selectedDateISO}|${locationId}`;
    if (lastStaffAssessKeyRef.current === key) return;
    lastStaffAssessKeyRef.current = key;

    void loadStaffAssessment(staffAssessStaffId, staffAssessDays);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [staffAssessOpen, staffAssessStaffId, staffAssessDays, selectedDateISO, orgId, locationId]);

  async function loadStaffAssessment(staffId: string, days: number) {
    if (!orgId || !locationId) return;

    const staff = teamOptions.find((t) => t.id === staffId) ?? null;
    const initials = (staff?.initials ?? "").toString().trim().toUpperCase();

    setStaffAssessLoading(true);
    setStaffAssessErr(null);
    setStaffAssess(null);

    try {
      if (!staff) throw new Error("Select a staff member.");
      if (!initials) throw new Error("Selected staff member has no initials.");

      const end = new Date(selectedDateISO);
      end.setHours(23, 59, 59, 999);

      const start = new Date(selectedDateISO);
      start.setHours(0, 0, 0, 0);
      start.setDate(start.getDate() - (days - 1));

      const startIsoDate = isoDate(start);
      const endIsoDate = isoDate(end);

      // QC last 30 days window
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

      const firstErr =
        cleaningRunsRes.error || tempLogsRes.error || tempFailsRes.error || incidentsRes.error || qcRes.error;

      if (firstErr) throw firstErr;

      const qcRows = (qcRes.data ?? []) as Array<{ score: number }>;
      const qcCount30d = qcRows.length;
      const qcAvg30d =
        qcCount30d > 0
          ? Math.round((qcRows.reduce((a, r) => a + Number(r.score || 0), 0) / qcCount30d) * 10) / 10
          : null;

      setStaffAssess({
        staffId,
        staffLabel: tmLabel({ initials: staff.initials, name: staff.name }),
        rangeDays: days,
        cleaningRuns: cleaningRunsRes.count ?? 0,
        tempLogs: tempLogsRes.count ?? 0,
        tempFails: tempFailsRes.count ?? 0,
        incidents: incidentsRes.count ?? 0,
        qcAvg30d,
        qcCount30d,
      });
    } catch (e: unknown) {
      console.error(e);
      setStaffAssessErr(e instanceof Error ? e.message : "Failed to load staff assessment.");
    } finally {
      setStaffAssessLoading(false);
    }
  }

  return (
    <>
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

          <KpiTile title="Incidents" icon="⚠️" tone={incidentsTone} value={incidentSummary.todayCount} sub={`Last 7d: ${incidentSummary.last7Count}`} />

          <KpiTile
            title="Training"
            icon="🎓"
            tone={trainingTone}
            value={trainingExpired}
            sub={
              <>
                Due soon (30d):{" "}
                <span className={cls("font-semibold", trainingDueSoon > 0 && "text-amber-700")}>
                  {trainingDueSoon}
                </span>
              </>
            }
          />

          <KpiTile title="Cleaning completion" icon="✅" tone="neutral" value={`${cleaningDoneTotal}/${cleaningTotal}`} sub="Done / total (selected day)" />
        </div>
      </section>

      {cleaningAllDone && !alreadySignedOff && (
        <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
          <div className="font-semibold">All cleaning tasks are complete.</div>
          <div className="text-emerald-800/90">Sign off the day to lock in your compliance record.</div>
        </div>
      )}

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
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSelectedDateISO(e.target.value)}
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
            onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setLocationId(e.target.value || null)}
            disabled={locationLoading}
            className="h-9 rounded-xl border border-slate-300 bg-white/90 px-3 text-sm shadow-sm"
          >
            {locations.map((l) => (
              <option key={l.id} value={l.id}>
                {l.name}
              </option>
            ))}
          </select>

          {/* ✅ Incident entry button */}
          <button
            type="button"
            onClick={() => setIncidentOpen(true)}
            disabled={loading || !orgId || !locationId}
            className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50 disabled:opacity-60"
          >
            Log incident
          </button>

          <button
            type="button"
            onClick={() => setSignoffOpen(true)}
            disabled={!cleaningAllDone || alreadySignedOff || loading || !orgId || !locationId}
            className={cls(
              "rounded-xl px-4 py-2 text-sm font-semibold shadow-sm disabled:opacity-60",
              alreadySignedOff ? "border border-slate-200 bg-white text-slate-600" : "bg-indigo-600 text-white hover:bg-indigo-700"
            )}
            title={alreadySignedOff ? "Already signed off" : cleaningAllDone ? "Sign off the day" : "Complete all cleaning tasks first"}
          >
            {alreadySignedOff ? "Day signed off" : "Sign off day"}
          </button>

          <button
            type="button"
            onClick={async () => {
              setStaffAssessErr(null);
              setStaffAssess(null);
              setStaffAssessStaffId("");
              setStaffAssessDays(7);
              setStaffAssessOpen(true);
              lastStaffAssessKeyRef.current = "";
              await loadTeamOptions();
            }}
            disabled={loading || !orgId}
            className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50 disabled:opacity-60"
          >
            Staff assessment
          </button>

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
            onClick={() => void refreshAll()}
            disabled={loading || !orgId || !locationId}
            className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700 disabled:opacity-60"
          >
            {loading ? "Refreshing…" : "Refresh"}
          </button>
        </div>
      </section>

      {/* ===== Incidents table ===== */}
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

        <TableFooterToggle total={incidentsToday.length} showingAll={showAllIncidents} onToggle={() => setShowAllIncidents((v) => !v)} />
      </section>

      {/* ===== Today's activity ===== */}
      <section className="mt-4 rounded-3xl border border-white/40 bg-white/80 p-4 shadow-md shadow-slate-900/5 backdrop-blur">
        <div className="mb-3">
          <div className="text-[11px] font-extrabold uppercase tracking-[0.22em] text-slate-400">Today’s activity</div>
          <div className="mt-0.5 text-sm font-semibold text-slate-900">Temps + cleaning (category-based)</div>
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {/* Temps */}
          <div className="rounded-2xl border border-slate-200 bg-white/90 p-3">
            <div className="text-[11px] font-extrabold uppercase tracking-[0.22em] text-slate-500">Temperature logs</div>

            <div className="mt-2 overflow-x-auto rounded-xl border border-slate-200">
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
                        No temperature logs for this day.
                      </td>
                    </tr>
                  ) : (
                    tempsToRender.map((r) => (
                      <tr key={r.id} className="border-t border-slate-100 text-slate-800">
                        <td className="px-3 py-2">{r.time}</td>
                        <td className="px-3 py-2">{r.staff}</td>
                        <td className="px-3 py-2">{r.area}</td>
                        <td className="px-3 py-2">{r.item}</td>
                        <td className="px-3 py-2 whitespace-nowrap">{r.temp_c != null ? `${r.temp_c}°C` : "—"}</td>
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
                            <span className="text-slate-400">—</span>
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

          {/* Cleaning runs */}
          <div className="rounded-2xl border border-slate-200 bg-white/90 p-3">
            <div className="text-[11px] font-extrabold uppercase tracking-[0.22em] text-slate-500">Cleaning runs</div>

            <div className="mt-2 overflow-x-auto rounded-xl border border-slate-200">
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
                        No cleaning runs logged for this day.
                      </td>
                    </tr>
                  ) : (
                    cleaningToRender.map((r) => (
                      <tr key={r.id} className="border-t border-slate-100 text-slate-800">
                        <td className="px-3 py-2">{r.time ?? "—"}</td>
                        <td className="px-3 py-2">
                          <div className="font-semibold">{r.category}</div>
                          {r.task ? <div className="text-[11px] text-slate-500">{r.task}</div> : null}
                        </td>
                        <td className="px-3 py-2">{r.staff ?? "—"}</td>
                        <td className="px-3 py-2">{r.notes ?? "—"}</td>
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

      {/* ===== Temp corrective actions table ===== */}
      <section className="mt-4 rounded-3xl border border-white/40 bg-white/80 p-4 shadow-md shadow-slate-900/5 backdrop-blur">
        <div className="mb-3">
          <div className="text-[11px] font-extrabold uppercase tracking-[0.22em] text-slate-400">
            Temperature corrective actions
          </div>
          <div className="mt-0.5 text-sm font-semibold text-slate-900">Corrective actions (selected day)</div>
        </div>

        <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white/90">
          <table className="min-w-full text-xs">
            <thead className="bg-slate-50">
              <tr className="text-left text-slate-500">
                <th className="px-3 py-2">Time</th>
                <th className="px-3 py-2">Staff</th>
                <th className="px-3 py-2">Area</th>
                <th className="px-3 py-2">Item</th>
                <th className="px-3 py-2">Fail temp</th>
                <th className="px-3 py-2">Corrective action</th>
                <th className="px-3 py-2">Re-check</th>
                <th className="px-3 py-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {corrToRender.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-3 py-4 text-center text-slate-500">
                    No temperature corrective actions logged for this day.
                  </td>
                </tr>
              ) : (
                corrToRender.map((r) => (
                  <tr key={r.id} className="border-t border-slate-100 text-slate-800">
                    <td className="px-3 py-2 whitespace-nowrap">{r.time}</td>
                    <td className="px-3 py-2">{r.staff}</td>
                    <td className="px-3 py-2">{r.area}</td>
                    <td className="px-3 py-2">{r.item}</td>
                    <td className="px-3 py-2 whitespace-nowrap">{r.fail_temp_c != null ? `${r.fail_temp_c}°C` : "—"}</td>
                    <td className="px-3 py-2 max-w-[22rem] truncate">{r.action}</td>
                    <td className="px-3 py-2 whitespace-nowrap">
                      {r.recheck_temp_c != null ? `${r.recheck_temp_c}°C` : "—"}
                      {r.recheck_time ? ` (${r.recheck_time})` : ""}
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap">
                      {r.recheck_status ? (
                        <span
                          className={cls(
                            "inline-flex rounded-full px-2 py-[1px] text-[10px] font-extrabold uppercase",
                            r.recheck_status === "pass" ? "bg-emerald-100 text-emerald-800" : "bg-red-100 text-red-800"
                          )}
                        >
                          {r.recheck_status}
                        </span>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <TableFooterToggle total={tempCorrectives.length} showingAll={showAllTempCorrectives} onToggle={() => setShowAllTempCorrectives((v) => !v)} />
      </section>

      {/* ===== Day sign-offs ===== */}
      <section className="mt-4 rounded-3xl border border-white/40 bg-white/80 p-4 shadow-md shadow-slate-900/5 backdrop-blur">
        <div className="mb-3">
          <div className="text-[11px] font-extrabold uppercase tracking-[0.22em] text-slate-400">Day sign-offs</div>
          <div className="mt-0.5 text-sm font-semibold text-slate-900">Daily sign-offs (selected day)</div>
        </div>

        <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white/90">
          <table className="min-w-full text-xs">
            <thead className="bg-slate-50">
              <tr className="text-left text-slate-500">
                <th className="px-3 py-2">Time</th>
                <th className="px-3 py-2">Signed by</th>
                <th className="px-3 py-2">Notes</th>
              </tr>
            </thead>
            <tbody>
              {signoffsToRender.length === 0 ? (
                <tr>
                  <td colSpan={3} className="px-3 py-4 text-center text-slate-500">
                    No sign-offs for this day.
                  </td>
                </tr>
              ) : (
                signoffsToRender.map((r) => (
                  <tr key={r.id} className="border-t border-slate-100 text-slate-800">
                    <td className="px-3 py-2">
                      {r.created_at
                        ? new Date(r.created_at).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })
                        : "—"}
                    </td>
                    <td className="px-3 py-2 font-semibold">{r.signed_by?.toUpperCase() ?? "—"}</td>
                    <td className="px-3 py-2">{r.notes ?? "—"}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <TableFooterToggle total={signoffsToday.length} showingAll={showAllSignoffs} onToggle={() => setShowAllSignoffs((v) => !v)} />
      </section>

      {/* ===== Manager QC (modal) ===== */}
      {qcOpen && (
        <div className="fixed inset-0 z-50 bg-black/30 overflow-y-auto overscroll-contain p-3 sm:p-4" onClick={() => setQcOpen(false)}>
          <div
            className="mx-auto my-6 w-full max-w-3xl rounded-2xl border border-slate-200 bg-white/90 p-4 text-slate-900 shadow-lg backdrop-blur"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-3 flex items-center justify-between">
              <div>
                <div className="text-base font-semibold">Manager QC</div>
                <div className="mt-0.5 text-xs text-slate-500">{selectedDateISO}</div>
              </div>
              <button onClick={() => setQcOpen(false)} className="rounded-md p-2 text-slate-500 hover:bg-slate-100" aria-label="Close">
                ✕
              </button>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs text-slate-500">Staff</label>
                <select
                  value={qcForm.staff_id}
                  onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setQcForm((f) => ({ ...f, staff_id: e.target.value }))}
                  className="h-10 w-full rounded-xl border border-slate-300 bg-white/80 px-3 text-sm"
                >
                  <option value="">Select staff</option>
                  {teamOptions.map((t) => (
                    <option key={t.id} value={t.id}>
                      {tmLabel({ initials: t.initials, name: t.name })}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1 block text-xs text-slate-500">Reviewed on</label>
                <input
                  type="date"
                  value={qcForm.reviewed_on}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setQcForm((f) => ({ ...f, reviewed_on: e.target.value }))}
                  className="h-10 w-full rounded-xl border border-slate-300 bg-white/80 px-3 text-sm"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs text-slate-500">Score (1–5)</label>
                <input
                  type="number"
                  min={1}
                  max={5}
                  value={qcForm.score}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setQcForm((f) => ({ ...f, score: Number(e.target.value) }))}
                  className="h-10 w-full rounded-xl border border-slate-300 bg-white/80 px-3 text-sm"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="mb-1 block text-xs text-slate-500">Notes</label>
                <textarea
                  value={qcForm.notes}
                  onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setQcForm((f) => ({ ...f, notes: e.target.value }))}
                  className="min-h-[70px] w-full rounded-xl border border-slate-300 bg-white/80 px-3 py-2 text-sm"
                />
              </div>
            </div>

            <div className="mt-4 flex items-center justify-end gap-2">
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
                disabled={qcSaving}
                className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700 disabled:opacity-60"
              >
                {qcSaving ? "Saving…" : "Save QC"}
              </button>
            </div>

            <div className="mt-5">
              <div className="text-sm font-semibold text-slate-900">Recent QC reviews</div>

              <div className="mt-2 overflow-x-auto rounded-2xl border border-slate-200 bg-white/90">
                <table className="min-w-full text-xs">
                  <thead className="bg-slate-50">
                    <tr className="text-left text-slate-500">
                      <th className="px-3 py-2">Date</th>
                      <th className="px-3 py-2">Staff</th>
                      <th className="px-3 py-2">Manager</th>
                      <th className="px-3 py-2">Score</th>
                      <th className="px-3 py-2">Notes</th>
                      <th className="px-3 py-2"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {qcLoading ? (
                      <tr>
                        <td colSpan={6} className="px-3 py-4 text-center text-slate-500">
                          Loading…
                        </td>
                      </tr>
                    ) : qcToRender.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-3 py-4 text-center text-slate-500">
                          No QC reviews yet.
                        </td>
                      </tr>
                    ) : (
                      qcToRender.map((r) => (
                        <tr key={r.id} className="border-t border-slate-100 text-slate-800">
                          <td className="px-3 py-2">{r.reviewed_on}</td>
                          <td className="px-3 py-2">{tmLabel({ initials: r.staff?.initials ?? null, name: r.staff?.name ?? null })}</td>
                          <td className="px-3 py-2">{tmLabel({ initials: r.manager?.initials ?? null, name: r.manager?.name ?? null })}</td>
                          <td className="px-3 py-2 font-semibold">{r.score}</td>
                          <td className="px-3 py-2 max-w-[22rem] truncate">{r.notes ?? "—"}</td>
                          <td className="px-3 py-2 text-right">
                            <button
                              type="button"
                              onClick={() => deleteQcReview(r.id)}
                              className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-[11px] font-semibold text-slate-700 hover:bg-slate-50"
                            >
                              Delete
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              <TableFooterToggle total={qcReviews.length} showingAll={showAllQc} onToggle={() => setShowAllQc((v) => !v)} />
            </div>
          </div>
        </div>
      )}

      {/* ===== Staff assessment modal ===== */}
      {staffAssessOpen && (
        <div className="fixed inset-0 z-50 bg-black/30 overflow-y-auto overscroll-contain p-3 sm:p-4" onClick={() => setStaffAssessOpen(false)}>
          <div
            className="mx-auto my-6 w-full max-w-2xl rounded-2xl border border-slate-200 bg-white/90 p-4 text-slate-900 shadow-lg backdrop-blur"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-3 flex items-center justify-between">
              <div>
                <div className="text-base font-semibold">Staff assessment</div>
                <div className="mt-0.5 text-xs text-slate-500">{selectedDateISO}</div>
              </div>
              <button onClick={() => setStaffAssessOpen(false)} className="rounded-md p-2 text-slate-500 hover:bg-slate-100" aria-label="Close">
                ✕
              </button>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs text-slate-500">Staff</label>
                <select
                  value={staffAssessStaffId}
                  onChange={(e: React.ChangeEvent<HTMLSelectElement>) => {
                    lastStaffAssessKeyRef.current = "";
                    setStaffAssessStaffId(e.target.value);
                  }}
                  className="h-10 w-full rounded-xl border border-slate-300 bg-white/80 px-3 text-sm"
                >
                  <option value="">Select staff</option>
                  {teamOptions.map((t) => (
                    <option key={t.id} value={t.id}>
                      {tmLabel({ initials: t.initials, name: t.name })}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1 block text-xs text-slate-500">Range</label>
                <select
                  value={staffAssessDays}
                  onChange={(e: React.ChangeEvent<HTMLSelectElement>) => {
                    lastStaffAssessKeyRef.current = "";
                    setStaffAssessDays(Number(e.target.value));
                  }}
                  className="h-10 w-full rounded-xl border border-slate-300 bg-white/80 px-3 text-sm"
                >
                  <option value={7}>Last 7 days</option>
                  <option value={14}>Last 14 days</option>
                  <option value={30}>Last 30 days</option>
                </select>
              </div>
            </div>

            <div className="mt-4 rounded-2xl border border-slate-200 bg-white/90 p-3">
              {staffAssessLoading ? (
                <div className="text-sm text-slate-600">Loading…</div>
              ) : staffAssessErr ? (
                <div className="text-sm text-red-700">{staffAssessErr}</div>
              ) : !staffAssess ? (
                <div className="text-sm text-slate-600">Select a staff member to load stats.</div>
              ) : (
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="text-sm">
                    <div className="text-xs text-slate-500">Staff</div>
                    <div className="font-semibold">{staffAssess.staffLabel}</div>
                  </div>
                  <div className="text-sm">
                    <div className="text-xs text-slate-500">Range</div>
                    <div className="font-semibold">{staffAssess.rangeDays} days</div>
                  </div>

                  <div className="text-sm">
                    <div className="text-xs text-slate-500">Cleaning runs</div>
                    <div className="font-semibold">{staffAssess.cleaningRuns}</div>
                  </div>
                  <div className="text-sm">
                    <div className="text-xs text-slate-500">Temp logs</div>
                    <div className="font-semibold">
                      {staffAssess.tempLogs}{" "}
                      {staffAssess.tempFails > 0 ? <span className="text-red-700">({staffAssess.tempFails} fails)</span> : null}
                    </div>
                  </div>

                  <div className="text-sm">
                    <div className="text-xs text-slate-500">Incidents logged</div>
                    <div className="font-semibold">{staffAssess.incidents}</div>
                  </div>
                  <div className="text-sm">
                    <div className="text-xs text-slate-500">QC (30d)</div>
                    <div className="font-semibold">
                      {staffAssess.qcAvg30d != null ? `${staffAssess.qcAvg30d} avg` : "—"}{" "}
                      <span className="text-slate-500">({staffAssess.qcCount30d})</span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="mt-4 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setStaffAssessOpen(false)}
                className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===== Sign-off modal ===== */}
      {signoffOpen && (
        <div className="fixed inset-0 z-50 bg-black/30 overflow-y-auto overscroll-contain p-3 sm:p-4" onClick={() => setSignoffOpen(false)}>
          <div
            className="mx-auto my-6 w-full max-w-xl rounded-2xl border border-slate-200 bg-white/90 p-4 text-slate-900 shadow-lg backdrop-blur"
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

            <div className="grid gap-3">
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
                <textarea
                  value={signoffNotes}
                  onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setSignoffNotes(e.target.value)}
                  className="min-h-[70px] w-full rounded-xl border border-slate-300 bg-white/80 px-3 py-2 text-sm"
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
                className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700 disabled:opacity-60"
              >
                {signoffSaving ? "Saving…" : "Save sign-off"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===== Incident modal ===== */}
      {incidentOpen && (
        <div className="fixed inset-0 z-50 bg-black/30 overflow-y-auto overscroll-contain p-3 sm:p-4" onClick={() => setIncidentOpen(false)}>
          <div
            className="mx-auto my-6 w-full max-w-2xl rounded-2xl border border-slate-200 bg-white/90 p-4 text-slate-900 shadow-lg backdrop-blur"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-3 flex items-center justify-between">
              <div>
                <div className="text-base font-semibold">Log incident</div>
                <div className="mt-0.5 text-xs text-slate-500">
                  {selectedDateISO} · {locations.find((l) => l.id === locationId)?.name ?? "—"}
                </div>
              </div>
              <button onClick={() => setIncidentOpen(false)} className="rounded-md p-2 text-slate-500 hover:bg-slate-100" aria-label="Close">
                ✕
              </button>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs text-slate-500">Initials</label>
                <input
                  value={incidentInitials}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setIncidentInitials(e.target.value.toUpperCase())}
                  placeholder="WS"
                  className="h-10 w-full rounded-xl border border-slate-300 bg-white/80 px-3 text-sm"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs text-slate-500">Type</label>
                <input
                  value={incidentType}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setIncidentType(e.target.value)}
                  placeholder="e.g. Glass breakage / Illness / Pest"
                  className="h-10 w-full rounded-xl border border-slate-300 bg-white/80 px-3 text-sm"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="mb-1 block text-xs text-slate-500">Details</label>
                <textarea
                  value={incidentDetails}
                  onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setIncidentDetails(e.target.value)}
                  placeholder="What happened?"
                  className="min-h-[80px] w-full rounded-xl border border-slate-300 bg-white/80 px-3 py-2 text-sm"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="mb-1 block text-xs text-slate-500">Corrective action (optional)</label>
                <textarea
                  value={incidentCorrective}
                  onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setIncidentCorrective(e.target.value)}
                  placeholder="What did you do to fix it right now?"
                  className="min-h-[70px] w-full rounded-xl border border-slate-300 bg-white/80 px-3 py-2 text-sm"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="mb-1 block text-xs text-slate-500">Preventive action (optional)</label>
                <textarea
                  value={incidentPreventive}
                  onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setIncidentPreventive(e.target.value)}
                  placeholder="How do you stop it happening again?"
                  className="min-h-[70px] w-full rounded-xl border border-slate-300 bg-white/80 px-3 py-2 text-sm"
                />
              </div>
            </div>

            <div className="mt-4 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setIncidentOpen(false)}
                className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={createIncident}
                disabled={incidentSaving}
                className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700 disabled:opacity-60"
              >
                {incidentSaving ? "Saving…" : "Save incident"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

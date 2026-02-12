"use client"

import React, { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { motion } from "framer-motion";
import { supabase } from "@/lib/supabaseBrowser";
import { getActiveOrgIdClient } from "@/lib/orgClient";
import { getActiveLocationIdClient } from "@/lib/locationClient";
import IncidentModal from "@/components/IncidentModal";

/* ===================== Types ===================== */

type LocationOption = { id: string; name: string };

type TempSummary = { today: number; fails7d: number };

type UnifiedIncidentRow = {
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

type CleaningCategoryProgress = {
  category: string;
  done: number;
  total: number;
};

type CleaningActivityRow = {
  id: string;
  time: string | null;
  category: string;
  staff: string | null;
  notes: string | null;
  task: string | null;
};

type TempLogRow = {
  id: string;
  time: string | null;
  staff: string | null;
  area: string | null;
  item: string | null;
  temp_c: number | null;
  status: string | null;
};

type SignoffRow = {
  id: string;
  signoff_on: string; // yyyy-mm-dd
  signed_by: string | null;
  notes: string | null;
  created_at: string | null;
};

type SignoffSummary = {
  todayCount: number;
};

type TeamMemberOption = {
  id: string;
  name: string | null;
  initials: string | null;
  role: string | null;
  active: boolean | null;
  user_id: string | null;
  email?: string | null;
  training_areas?: string[] | null;
  location_id?: string | null;
};

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

type AllergenChangeLogRow = {
  id: string;
  created_at: string | null;
  action: string | null;
  item_name: string | null;
  category_before: string | null;
  category_after: string | null;
  staff_initials: string | null;
};

type AllergenReviewRow = {
  id: string;
  last_reviewed: string | null; // date
  reviewer: string | null;
  interval_days: number;
  created_at: string | null;
};

type TrainingRow = {
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

type StaffQcReviewRow = {
  id: string;
  reviewed_on: string;
  rating: number;
  notes: string | null;
  staff_id: string | null;
  manager_id: string | null;
  staff: { initials: string | null; name: string | null } | null;
  manager: { initials: string | null; name: string | null } | null;
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

/* ===== Calibration (simple tick + notes) =====
   Table assumed: calibration_checks
   Columns used:
   - id (uuid)
   - org_id
   - location_id
   - checked_on (date)
   - staff_initials (text)
   - cold_storage_checked (bool)
   - probes_checked (bool)
   - thermometers_checked (bool)
   - notes (text nullable)
   - created_at (timestamp)
*/
type CalibrationCheckRow = {
  id: string;
  checked_on: string; // yyyy-mm-dd
  staff_initials: string | null;
  all_equipment_calibrated: boolean | null;
  notes: string | null;
  created_at: string | null;
};

const nowISO = new Date().toISOString().slice(0, 10);

function safeDate(val: any): Date | null {
  if (!val) return null;
  const d = val instanceof Date ? val : new Date(val);
  if (Number.isNaN(d.getTime())) return null;
  return d;
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

function toISODate(val: any): string {
  const d = safeDate(val) ?? new Date();
  return d.toISOString().slice(0, 10);
}

function formatTimeHM(d: Date | null | undefined): string | null {
  if (!d) return null;
  const hours = String(d.getHours()).padStart(2, "0");
  const mins = String(d.getMinutes()).padStart(2, "0");
  return `${hours}:${mins}`;
}

function formatDDMMYYYY(val: any): string {
  const d = safeDate(val);
  if (!d) return "—";
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
}

const cls = (...p: Array<string | false | null | undefined>) => p.filter(Boolean).join(" ");

const isoDate = (d: Date) => d.toISOString().slice(0, 10);
const addDaysISO = (dmy: string, delta: number) => {
  const d = new Date(dmy);
  d.setDate(d.getDate() + delta);
  return isoDate(d);
};

const getDow1to7 = (dmy: string) => ((new Date(dmy).getDay() + 6) % 7) + 1;
const getDom = (dmy: string) => new Date(dmy).getDate();

function isDueOn(t: CleaningTask, dmy: string) {
  if (t.frequency === "daily") return true;
  if (t.frequency === "weekly") return t.weekday === getDow1to7(dmy);
  return t.month_day === getDom(dmy);
}

/* ===================== Temp failures (unified) ===================== */

async function fetchTempFailuresUnifiedForDay(orgId: string, locationId: string, d0: Date, d1: Date) {
  const { data, error } = await supabase
    .from("food_temp_logs")
    .select(
      `
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
    `
    )
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
    id: r.id,
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
    if (!existing) byLog.set(key, row);
    else {
      const a = safeDate(existing.created_at)?.getTime() ?? 0;
      const b = safeDate(row.created_at)?.getTime() ?? 0;
      if (b >= a) byLog.set(key, row);
    }
  }

  return logs.map((l) => {
    const ca = byLog.get(String(l.id)) ?? null;

    const atISO = l.at ? String(l.at) : null;
    const happened_on = toISODate(atISO);

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
      created_by: (ca?.recorded_by ?? l.staff_initials ?? null) ? String(ca?.recorded_by ?? l.staff_initials) : null,
      details,
      immediate_action: null,
      corrective_action: correctiveText,
      source: "temp_fail",
    } as UnifiedIncidentRow;
  });
}

/* ===================== UI Bits ===================== */

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
          <div className="text-[11px] font-extrabold uppercase tracking-[0.22em] text-slate-500">{title}</div>
          <div className="mt-1 flex items-baseline gap-2">
            <div className="text-2xl font-extrabold text-slate-900 truncate">{value}</div>
          </div>
          <div className="mt-1 text-xs text-slate-600 truncate">{sub}</div>
        </div>
        {icon ? (
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-900/5 text-lg">
            <span>{icon}</span>
          </div>
        ) : null}
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
    <div className="border-t border-slate-100 bg-slate-50/80 px-3 py-2 text-right text-xs text-slate-600">
      Showing {showingAll ? "all" : "latest 10"} of {total} rows.{" "}
      <button type="button" onClick={onToggle} className="font-semibold text-indigo-700 hover:underline">
        {showingAll ? "Show less" : "Show all"}
      </button>
    </div>
  );
}

/* ===================== Page ===================== */

export default function ManagerDashboardPage() {
  const [orgId, setOrgId] = useState<string | null>(null);
  const [locationId, setLocationId] = useState<string | null>(null);
  const [locations, setLocations] = useState<LocationOption[]>([]);
  const [locationLoading, setLocationLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const [selectedDateISO, setSelectedDateISO] = useState(nowISO);
  const centeredDate = useMemo(() => formatPrettyDate(selectedDateISO), [selectedDateISO]);

  /* ===== KPI state ===== */
  const [calibrationDue, setCalibrationDue] = useState(false);

  const [tempsSummary, setTempsSummary] = useState<TempSummary>({ today: 0, fails7d: 0 });
  const [cleaningTotal, setCleaningTotal] = useState(0);
  const [cleaningDoneTotal, setCleaningDoneTotal] = useState(0);
  const [incidentsToday, setIncidentsToday] = useState(0);
  const [incidents7d, setIncidents7d] = useState(0);
  const [trainingExpired, setTrainingExpired] = useState(0);
  const [trainingDueSoon, setTrainingDueSoon] = useState(0);

  /* ===== Today activity tables ===== */
  const [todayTemps, setTodayTemps] = useState<TempLogRow[]>([]);
  const [cleaningActivity, setCleaningActivity] = useState<CleaningActivityRow[]>([]);
  const [cleaningCategoryProgress, setCleaningCategoryProgress] = useState<CleaningCategoryProgress[]>([]);
  const [tempFailsToday, setTempFailsToday] = useState<UnifiedIncidentRow[]>([]);
  const [incidentsHistory, setIncidentsHistory] = useState<UnifiedIncidentRow[]>([]);

  const [showAllTemps, setShowAllTemps] = useState(false);
  const [showAllTempFails, setShowAllTempFails] = useState(false);
  const [showAllCleaning, setShowAllCleaning] = useState(false);
  const [showAllIncidents, setShowAllIncidents] = useState(false);

  /* ===== Day sign-offs ===== */
  const [signoffsToday, setSignoffsToday] = useState<SignoffRow[]>([]);
  const [signoffSummary, setSignoffSummary] = useState<SignoffSummary>({ todayCount: 0 });
  const [showAllSignoffs, setShowAllSignoffs] = useState(false);

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
  const [qcSummaryLoading, setQcSummaryLoading] = useState(false);

  const [managerTeamMember, setManagerTeamMember] = useState<TeamMemberOption | null>(null);

  const [qcForm, setQcForm] = useState({
    staff_id: "",
    reviewed_on: nowISO,
    rating: 3,
    notes: "",
  });

  /* ===== Individual staff assessment modal ===== */
  const [staffAssessOpen, setStaffAssessOpen] = useState(false);
  const [staffAssessLoading, setStaffAssessLoading] = useState(false);
  const [staffAssessErr, setStaffAssessErr] = useState<string | null>(null);
  const [staffAssessStaffId, setStaffAssessStaffId] = useState<string>("");
  const [staffAssessDays, setStaffAssessDays] = useState<number>(7);
  const [staffAssess, setStaffAssess] = useState<StaffAssessment | null>(null);

  /* ===== Incident modal ===== */
  const [incidentOpen, setIncidentOpen] = useState(false);

  /* ===== Allergens ===== */
  const [allergenReviews, setAllergenReviews] = useState<AllergenReviewRow[]>([]);
  const [showAllAllergenReviews, setShowAllAllergenReviews] = useState(false);

  const [allergenLogs, setAllergenLogs] = useState<AllergenChangeLogRow[]>([]);
  const [showAllAllergenLogs, setShowAllAllergenLogs] = useState(false);

  /* ===== Education & training ===== */
  const [trainingRows, setTrainingRows] = useState<TrainingRow[]>([]);
  const [showAllTraining, setShowAllTraining] = useState(false);

  const [trainingAreasRows, setTrainingAreasRows] = useState<TeamMemberOption[]>([]);
  const [showAllTrainingAreas, setShowAllTrainingAreas] = useState(false);

  /* ===== Calibration (simple) ===== */
  const [calibrationChecks, setCalibrationChecks] = useState<CalibrationCheckRow[]>([]);
  const [showAllCalibration, setShowAllCalibration] = useState(false);

  const [calibrationOpen, setCalibrationOpen] = useState(false);
  const [calibrationSaving, setCalibrationSaving] = useState(false);
  const [calibrationForm, setCalibrationForm] = useState({
    checked_on: nowISO,
    staff_initials: "",
    cold_storage_checked: false,
    probes_checked: false,
    thermometers_checked: false,
    notes: "",
  });

  useEffect(() => {
    if (calibrationDue) {
      setCalibrationOpen(true);
    }
  }, [calibrationDue]);

  useEffect(() => {
    // Keep the calibration date pinned to selected day (unless user changes it manually later)
    setCalibrationForm((f) => ({ ...f, checked_on: selectedDateISO }));
  }, [selectedDateISO]);

  /* ===== Actions dropdown (top bar) ===== */
  const [actionsOpen, setActionsOpen] = useState(false);
  const actionsBtnRef = useRef<HTMLButtonElement | null>(null);
  const actionsMenuRef = useRef<HTMLDivElement | null>(null);
  const [portalReady, setPortalReady] = useState(false);
  const [actionsPos, setActionsPos] = useState<{ top: number; left: number } | null>(null);

  const lastStaffAssessKeyRef = useRef<string>("");

  useEffect(() => setPortalReady(true), []);

  const updateActionsPos = () => {
    const btn = actionsBtnRef.current;
    if (!btn) return;

    const r = btn.getBoundingClientRect();

    // Keep menu fully on-screen on mobile.
    const MENU_W = 224; // matches w-56 (14rem)
    const MENU_H_EST = 320; // rough cap, avoids off-screen on short viewports

    const left = Math.min(Math.max(8, r.left), Math.max(8, window.innerWidth - MENU_W - 8));

    // Default: open below
    let top = r.bottom + 8;

    // If it would overflow bottom, open above
    if (top + MENU_H_EST > window.innerHeight - 8) {
      top = Math.max(8, r.top - 8 - MENU_H_EST);
    }

    setActionsPos({ top, left });
  };

  useEffect(() => {
    if (!actionsOpen) return;
    updateActionsPos();

    const onScroll = () => updateActionsPos();
    const onResize = () => updateActionsPos();

    window.addEventListener("scroll", onScroll, true);
    window.addEventListener("resize", onResize);

    return () => {
      window.removeEventListener("scroll", onScroll, true);
      window.removeEventListener("resize", onResize);
    };
  }, [actionsOpen]);

  useEffect(() => {
    if (!actionsOpen) return;

    const onDown = (ev: MouseEvent) => {
      const t = ev.target;
      if (!(t instanceof Node)) return;

      const btn = actionsBtnRef.current;
      const menu = actionsMenuRef.current;

      if (btn && btn.contains(t)) return;
      if (menu && menu.contains(t)) return;

      setActionsOpen(false);
    };

    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [actionsOpen]);

  function tmLabel(t: { initials: string | null; name: string | null }) {
    const ini = (t.initials ?? "").toString().trim().toUpperCase();
    const nm = (t.name ?? "").toString().trim();
    if (ini && nm) return `${ini} · ${nm}`;
    if (ini) return ini;
    return nm || "—";
  }

  async function loadTeamOptions(locId?: string | null) {
    if (!orgId) return;
    const useLoc = locId ?? locationId ?? null;

    try {
      let q = supabase
        .from("team_members")
        .select("id,name,initials,role,active,user_id,location_id")
        .eq("org_id", orgId)
        .eq("active", true)
        .order("name", { ascending: true })
        .limit(5000);

      if (useLoc) q = q.eq("location_id", useLoc);

      const { data, error } = await q;
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

      const byUser = await supabase
        .from("team_members")
        .select("id,name,initials,role,active,user_id,email,location_id")
        .eq("org_id", orgId)
        .eq("user_id", user.id)
        .maybeSingle();

      if (byUser.error) throw byUser.error;

      if (byUser.data) {
        setManagerTeamMember(byUser.data as any);
        return;
      }

      const email = (user.email ?? "").trim().toLowerCase();
      if (!email) {
        setManagerTeamMember(null);
        return;
      }

      const byEmail = await supabase
        .from("team_members")
        .select("id,name,initials,role,active,user_id,email,location_id")
        .eq("org_id", orgId)
        .ilike("email", email)
        .maybeSingle();

      if (byEmail.error) throw byEmail.error;

      if (!byEmail.data) {
        setManagerTeamMember(null);
        return;
      }

      if (!byEmail.data.user_id) {
        const upd = await supabase
          .from("team_members")
          .update({ user_id: user.id })
          .eq("org_id", orgId)
          .eq("id", byEmail.data.id)
          .is("user_id", null);

        if (upd.error) throw upd.error;
      }

      setManagerTeamMember({
        ...byEmail.data,
        user_id: user.id,
      } as any);
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
          rating,
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
          rating,
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
    if (!managerTeamMember?.id) return alert("Your login is not linked to a team member (team_members.user_id).");
    if (!qcForm.reviewed_on) return alert("Select date.");

    const rating = Number(qcForm.rating);
    if (!Number.isFinite(rating) || rating < 1 || rating > 5) return alert("Score must be 1–5.");

    setQcSaving(true);
    try {
      const { error } = await supabase.from("staff_qc_reviews").insert({
        org_id: orgId,
        staff_id: qcForm.staff_id,
        manager_id: managerTeamMember.id,
        location_id: locationId,
        reviewed_on: qcForm.reviewed_on,
        rating,
        notes: qcForm.notes?.trim() || null,
      });

      if (error) throw error;

      setQcForm((f) => ({
        ...f,
        staff_id: "",
        reviewed_on: selectedDateISO || isoDate(new Date()),
        rating: 3,
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
      const { error } = await supabase.from("staff_qc_reviews").delete().eq("id", id).eq("org_id", orgId);
      if (error) throw error;
      await loadQcSummary();
      await loadQcReviews();
    } catch (e: any) {
      console.error(e);
      alert(e?.message ?? "Failed to delete QC review.");
    }
  }

  function openCalibrationFromActions() {
    if (!orgId || !locationId) return;

    setActionsOpen(false);

    const ini = managerTeamMember?.initials?.trim().toUpperCase() ?? "";

    setCalibrationForm({
      checked_on: selectedDateISO || nowISO,
      staff_initials: ini,
      cold_storage_checked: false,
      probes_checked: false,
      thermometers_checked: false,
      notes: "",
    });

    setCalibrationOpen(true);
  }

  function openIncidentFromActions() {
    if (!orgId || !locationId) return;
    setActionsOpen(false);
    setIncidentOpen(true);
  }

  async function saveCalibrationCheck() {
    if (!orgId || !locationId) return;

    const checked_on = calibrationForm.checked_on || selectedDateISO || nowISO;
    const staff_initials = (calibrationForm.staff_initials || "").trim().toUpperCase();
    if (!staff_initials) return alert("Enter staff initials.");

    setCalibrationSaving(true);
    try {
      const { error } = await supabase.from("calibration_checks").insert({
        org_id: orgId,
        location_id: locationId,
        checked_on,
        staff_initials,
        cold_storage_checked: calibrationForm.cold_storage_checked,
        probes_checked: calibrationForm.probes_checked,
        thermometers_checked: calibrationForm.thermometers_checked,
        notes: calibrationForm.notes?.trim() || null,
      });

      if (error) throw error;

      setCalibrationOpen(false);
      await refreshAll();
    } catch (e: any) {
      console.error(e);
      alert(e?.message ?? "Failed to save calibration check.");
    } finally {
      setCalibrationSaving(false);
    }
  }

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

  useEffect(() => {
    if (!orgId) return;
    void loadLoggedInManager();
    if (locationId) void loadTeamOptions(locationId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orgId, locationId]);

  useEffect(() => {
    if (!staffAssessOpen) return;
    if (staffAssessStaffId) return;
    if (teamOptions.length === 0) return;
    setStaffAssessStaffId(teamOptions[0].id);
  }, [staffAssessOpen, staffAssessStaffId, teamOptions]);

  useEffect(() => {
    if (!signoffOpen) return;
    if (signoffInitials.trim()) return;

    const ini = managerTeamMember?.initials?.trim().toUpperCase() ?? "";
    if (ini) setSignoffInitials(ini);
  }, [signoffOpen, managerTeamMember, signoffInitials]);

  useEffect(() => {
    if (!calibrationOpen) return;
    if (calibrationForm.staff_initials.trim()) return;

    const ini = managerTeamMember?.initials?.trim().toUpperCase() ?? "";
    if (ini) setCalibrationForm((f) => ({ ...f, staff_initials: ini }));
  }, [calibrationOpen, managerTeamMember, calibrationForm.staff_initials]);

  useEffect(() => {
    if (!orgId || !locationId) return;
    void refreshAll();
    void loadQcReviews();
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

      const ninetyDaysAgo = new Date(d0);
      ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 89);

      const trainingBase = new Date(nowISO);
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
        trainingsForKpiRes,
        trainingRecordsRes,
        trainingAreasRes,
        signoffsDayRes,
        allergenReviewsRes,
        allergenLogsRes,
        calibrationChecksRes,
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
          .from("incidents")
          .select("id,happened_on,type,details,immediate_action,preventive_action,created_by,created_at")
          .eq("org_id", orgId)
          .eq("location_id", locationId)
          .gte("happened_on", isoDate(ninetyDaysAgo))
          .lte("happened_on", selectedDateISO)
          .order("happened_on", { ascending: false })
          .order("created_at", { ascending: false })
          .limit(500),

        supabase
          .from("incidents")
          .select("id", { count: "exact", head: true })
          .eq("org_id", orgId)
          .eq("location_id", locationId)
          .eq("happened_on", selectedDateISO),

        supabase
          .from("incidents")
          .select("id", { count: "exact", head: true })
          .eq("org_id", orgId)
          .eq("location_id", locationId)
          .gte("happened_on", isoDate(sevenDaysAgo))
          .lte("happened_on", selectedDateISO),

        supabase
          .from("trainings")
          .select(
            `
            id,
            expires_on,
            team_member:team_members!trainings_team_member_id_fkey!inner(location_id)
          `
          )
          .eq("org_id", orgId)
          .eq("team_member.location_id", locationId)
          .limit(5000),

        supabase
          .from("trainings")
          .select(
            `
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
          `
          )
          .eq("org_id", orgId)
          .eq("team_member.location_id", locationId)
          .order("expires_on", { ascending: true, nullsFirst: false })
          .order("awarded_on", { ascending: false, nullsFirst: false })
          .limit(500),

        supabase
          .from("team_members")
          .select("id,name,initials,role,active,user_id,training_areas,location_id")
          .eq("org_id", orgId)
          .eq("location_id", locationId)
          .eq("active", true)
          .order("name", { ascending: true })
          .limit(5000),

        supabase
          .from("daily_signoffs")
          .select("id, signoff_on, signed_by, notes, created_at, location_id")
          .eq("org_id", orgId)
          .eq("location_id", locationId)
          .eq("signoff_on", selectedDateISO)
          .order("created_at", { ascending: false })
          .limit(200),

        supabase
          .from("allergen_review")
          .select("id, last_reviewed, reviewer, interval_days, created_at")
          .eq("org_id", orgId)
          .order("created_at", { ascending: false })
          .limit(200),

        supabase
          .from("allergen_change_logs")
          .select("id, created_at, action, item_name, category_before, category_after, staff_initials")
          .eq("org_id", orgId)
          .eq("location_id", locationId)
          .order("created_at", { ascending: false })
          .limit(500),

        supabase
          .from("calibration_checks")
          .select("id, checked_on, staff_initials, cold_storage_checked, probes_checked, thermometers_checked, notes, created_at")
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
        trainingsForKpiRes.error ||
        trainingRecordsRes.error ||
        trainingAreasRes.error ||
        signoffsDayRes.error ||
        allergenReviewsRes.error ||
        allergenLogsRes.error ||
        calibrationChecksRes.error;

      if (firstErr) throw firstErr;

      setTempsSummary({
        today: tempsTodayRes.count ?? 0,
        fails7d: tempsFails7dRes.count ?? 0,
      });

      const tRows: Array<{ expires_on: string | null }> = (trainingsForKpiRes.data as any[]) ?? [];
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

      const trRows: any[] = (trainingRecordsRes.data as any[]) ?? [];
      setTrainingRows(
        trRows.map((r) => ({
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
                location_id: r.team_member.location_id ? String(r.team_member.location_id) : null,
              }
            : null,
        }))
      );
      setShowAllTraining(false);

      setTrainingAreasRows(((trainingAreasRes.data ?? []) as any[]) as TeamMemberOption[]);
      setShowAllTrainingAreas(false);

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

      const cleaningCatProg = Array.from(byCat.entries())
        .map(([category, v]) => ({ category, done: v.done, total: v.total }))
        .sort((a, b) => a.category.localeCompare(b.category));

      setCleaningCategoryProgress(cleaningCatProg);
      setCleaningTotal(cleaningCatProg.reduce((acc, c) => acc + c.total, 0));
      setCleaningDoneTotal(cleaningCatProg.reduce((acc, c) => acc + c.done, 0));

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
          } as CleaningActivityRow;
        })
      );

      const incRows: any[] = (incidentsListRes.data as any[]) ?? [];
      setIncidentsHistory(
        incRows.map((r: any) => ({
          id: String(r.id),
          happened_on: String(r.happened_on),
          created_at: r.created_at ? String(r.created_at) : null,
          type: r.type ?? "Incident",
          details: r.details ?? null,
          immediate_action: r.immediate_action ?? null,
          corrective_action: r.preventive_action ?? null,
          created_by: r.created_by ? String(r.created_by) : null,
          source: "incident",
        }))
      );

      setIncidentsToday(incidentsTodayRes.count ?? 0);
      setIncidents7d(incidents7dRes.count ?? 0);

      const todayRows: any[] = (todayTempLogsRes.data as any[]) ?? [];
      setTodayTemps(
        todayRows.map((r) => {
          const at = r.at ? new Date(r.at) : null;
          return {
            id: String(r.id),
            time: at ? formatTimeHM(at) : null,
            staff: r.staff_initials ? String(r.staff_initials) : null,
            area: r.area ?? null,
            item: r.note ?? null,
            temp_c: r.temp_c != null ? Number(r.temp_c) : null,
            status: r.status ?? null,
          } as TempLogRow;
        })
      );

      const tempFails = await fetchTempFailuresUnifiedForDay(orgId, locationId, d0, d1);
      setTempFailsToday(tempFails);

      const signoffRows: any[] = (signoffsDayRes.data as any[]) ?? [];
      setSignoffsToday(
        signoffRows.map((r) => ({
          id: String(r.id),
          signoff_on: String(r.signoff_on),
          signed_by: r.signed_by ? String(r.signed_by) : null,
          notes: r.notes ? String(r.notes) : null,
          created_at: r.created_at ? String(r.created_at) : null,
        }))
      );
      setSignoffSummary({ todayCount: signoffRows.length });

      const arRows: any[] = (allergenReviewsRes.data as any[]) ?? [];
      setAllergenReviews(
        arRows.map((r) => ({
          id: String(r.id),
          last_reviewed: r.last_reviewed ? String(r.last_reviewed) : null,
          reviewer: r.reviewer ?? null,
          interval_days: r.interval_days != null && Number.isFinite(Number(r.interval_days)) ? Number(r.interval_days) : 180,
          created_at: r.created_at ? String(r.created_at) : null,
        }))
      );
      setShowAllAllergenReviews(false);

      const allergenRows: any[] = (allergenLogsRes.data as any[]) ?? [];
      setAllergenLogs(
        allergenRows.map((r) => ({
          id: String(r.id),
          created_at: r.created_at ? String(r.created_at) : null,
          action: r.action ?? null,
          item_name: r.item_name ?? null,
          category_before: r.category_before ?? null,
          category_after: r.category_after ?? null,
          staff_initials: r.staff_initials ?? null,
        }))
      );
      setShowAllAllergenLogs(false);

      const calRows: any[] = (calibrationChecksRes.data as any[]) ?? [];

      const mappedCalRows: CalibrationCheckRow[] = calRows.map((r) => ({
        id: String(r.id),
        checked_on: String(r.checked_on),
        staff_initials: r.staff_initials ? String(r.staff_initials) : null,
        all_equipment_calibrated: !!r.cold_storage_checked && !!r.probes_checked && !!r.thermometers_checked,
        notes: r.notes ?? null,
        created_at: r.created_at ? String(r.created_at) : null,
      }));

      setCalibrationChecks(mappedCalRows);
      setShowAllCalibration(false);

      // 30-day due logic
      if (mappedCalRows.length === 0) {
        setCalibrationDue(true);
      } else {
        const latest = mappedCalRows[0];
        const last = new Date(latest.checked_on);
        last.setHours(0, 0, 0, 0);

        const due = new Date(last);
        due.setDate(due.getDate() + 30);

        const today = new Date(selectedDateISO);
        today.setHours(0, 0, 0, 0);

        setCalibrationDue(today > due);
      }
    } catch (e: any) {
      console.error(e);
      setErr(e?.message ?? "Failed to load manager dashboard.");
    } finally {
      setLoading(false);
    }
  }

  const tempsTone: "neutral" | "ok" | "warn" | "danger" =
    tempsSummary.today === 0 ? "warn" : tempsSummary.fails7d > 0 ? "danger" : "ok";

  const cleaningTone: "neutral" | "ok" | "warn" | "danger" =
    cleaningTotal === 0 ? "neutral" : cleaningDoneTotal === cleaningTotal ? "ok" : "warn";

  const incidentsTone: "neutral" | "ok" | "warn" | "danger" =
    incidentsToday > 0 ? "danger" : incidents7d > 0 ? "warn" : "ok";

  const trainingTone: "neutral" | "ok" | "warn" | "danger" =
    trainingExpired > 0 ? "danger" : trainingDueSoon > 0 ? "warn" : "ok";

  const tempsToRender = showAllTemps ? todayTemps : todayTemps.slice(0, 10);
  const tempFailsToRender = showAllTempFails ? tempFailsToday : tempFailsToday.slice(0, 10);
  const cleaningToRender = showAllCleaning ? cleaningActivity : cleaningActivity.slice(0, 10);
  const incidentsToRender = showAllIncidents ? incidentsHistory : incidentsHistory.slice(0, 10);
  const qcToRender = showAllQc ? qcReviews : qcReviews.slice(0, 10);
  const signoffsToRender = showAllSignoffs ? signoffsToday : signoffsToday.slice(0, 10);

  const allergenReviewsToRender = showAllAllergenReviews ? allergenReviews : allergenReviews.slice(0, 10);
  const allergenLogsToRender = showAllAllergenLogs ? allergenLogs : allergenLogs.slice(0, 10);

  const trainingToRender = showAllTraining ? trainingRows : trainingRows.slice(0, 10);
  const trainingAreasToRender = showAllTrainingAreas ? trainingAreasRows : trainingAreasRows.slice(0, 10);

  const calibrationToRender = showAllCalibration ? calibrationChecks : calibrationChecks.slice(0, 10);

  const cleaningAllDone = cleaningTotal > 0 && cleaningDoneTotal === cleaningTotal;
  const alreadySignedOff = signoffsToday.length > 0;

  async function createDaySignoff() {
    if (!orgId || !locationId) return;

    if (!cleaningAllDone) {
      alert("Finish all cleaning tasks due today before signing off.");
      return;
    }

    if (!signoffInitials.trim()) {
      alert("Enter your initials.");
      return;
    }

    setSignoffSaving(true);
    try {
      const { error } = await supabase.from("daily_signoffs").insert({
        org_id: orgId,
        location_id: locationId,
        signoff_on: selectedDateISO,
        signed_by: signoffInitials.trim().toUpperCase(),
        notes: signoffNotes.trim() || null,
      });

      if (error) throw error;

      setSignoffInitials("");
      setSignoffNotes("");
      setSignoffOpen(false);
      await refreshAll();
    } catch (e: any) {
      console.error(e);
      alert(e?.message ?? "Failed to sign off.");
    } finally {
      setSignoffSaving(false);
    }
  }

  async function openQcFromActions() {
    if (!orgId || !locationId) return;
    setActionsOpen(false);
    setQcForm((f) => ({
      ...f,
      reviewed_on: selectedDateISO || f.reviewed_on,
    }));
    setQcOpen(true);
    await Promise.all([loadTeamOptions(locationId), loadLoggedInManager(), loadQcReviews()]);
  }

  async function openStaffAssessFromActions() {
    if (!orgId || !locationId) return;
    setActionsOpen(false);
    setStaffAssessErr(null);
    setStaffAssess(null);
    setStaffAssessOpen(true);
    await loadTeamOptions(locationId);
  }
  async function loadStaffAssessment(staffId: string, days: number) {
    if (!orgId || !locationId) return;
    setStaffAssessLoading(true);
    setStaffAssessErr(null);

    try {
      const staff = teamOptions.find((t) => t.id === staffId);
      if (!staff) throw new Error("Staff not found in options.");

      const initials = staff.initials?.trim().toUpperCase() || "";
      if (!initials) throw new Error("Staff initials are required for assessment.");

      const end = new Date(selectedDateISO);
      end.setHours(23, 59, 59, 999);
      const start = new Date(end);
      start.setDate(start.getDate() - (days - 1));

      const startIsoDate = isoDate(start);
      const endIsoDate = isoDate(end);

      const qcStart = new Date(selectedDateISO);
      qcStart.setHours(0, 0, 0, 0);
      const tmp = new Date(qcStart);
      tmp.setDate(tmp.getDate() - 29);
      const qcStartIso = isoDate(tmp);

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
          .from("incidents")
          .select("id", { count: "exact", head: true })
          .eq("org_id", orgId)
          .eq("location_id", locationId)
          .eq("created_by", initials)
          .gte("happened_on", startIsoDate)
          .lte("happened_on", endIsoDate),

        supabase
          .from("staff_qc_reviews")
          .select("rating, reviewed_on")
          .eq("org_id", orgId)
          .eq("location_id", locationId)
          .eq("staff_id", staffId)
          .gte("reviewed_on", qcStartIso)
          .lte("reviewed_on", selectedDateISO)
          .limit(500),
      ]);

      const firstErr2 = cleaningRunsRes.error || tempLogsRes.error || tempFailsRes.error || incidentsRes.error || qcRes.error;
      if (firstErr2) throw firstErr2;

      const qcRows = (qcRes.data ?? []) as Array<{ rating: number }>;
      const qcCount30d = qcRows.length;
      const qcAvg30d =
        qcCount30d > 0
          ? Math.round((qcRows.reduce((a, r) => a + Number(r.rating || 0), 0) / qcCount30d) * 10) / 10
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
    } catch (e: any) {
      console.error(e);
      setStaffAssessErr(e?.message ?? "Failed to load staff assessment.");
    } finally {
      setStaffAssessLoading(false);
    }
  }

  return (
    <div className="w-full px-3 sm:px-4 md:mx-auto md:max-w-[1100px]">
      <header className="py-2">
        <div className="text-center">
          <div className="text-[11px] font-extrabold uppercase tracking-[0.22em] text-slate-400">Today</div>
          <h1 className="mt-1 text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">{centeredDate}</h1>
        </div>
      </header>

      {err && (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-800">{err}</div>
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
                <span className={cls("font-semibold", tempsSummary.fails7d > 0 && "text-red-700")}>{tempsSummary.fails7d}</span>
              </>
            }
          />

          <KpiTile title="Cleaning" icon="🧼" tone={cleaningTone} value={`${cleaningDoneTotal}/${cleaningTotal}`} sub="Tasks completed today" />
          <KpiTile title="Incidents" icon="⚠️" tone={incidentsTone} value={incidentsToday} sub={`Last 7d: ${incidents7d}`} />
          <KpiTile title="Training" icon="🎓" tone={trainingTone} value={`${trainingExpired} expired`} sub={`${trainingDueSoon} due in 30d`} />
          <KpiTile title="Calibration" icon="🛠" tone={calibrationDue ? "danger" : "ok"} value={calibrationDue ? "Due" : "Up to date"} sub="30-day cycle" />
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <label className="text-xs font-semibold text-slate-600">Location</label>
            <select
              value={locationId ?? ""}
              onChange={(e) => setLocationId(e.target.value || null)}
              className="h-9 rounded-xl border border-slate-300 bg-white/80 px-3 text-xs"
              disabled={locationLoading || locations.length === 0}
            >
              {locations.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <label className="text-xs font-semibold text-slate-600">Date</label>
            <input
              type="date"
              value={selectedDateISO}
              onChange={(e) => setSelectedDateISO(e.target.value || nowISO)}
              className="h-9 rounded-xl border border-slate-300 bg-white/80 px-3 text-xs"
            />
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setSelectedDateISO(addDaysISO(selectedDateISO, -1))}
              className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
            >
              ◀ Previous
            </button>
            <button
              type="button"
              onClick={() => setSelectedDateISO(nowISO)}
              className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
            >
              Today
            </button>
            <button
              type="button"
              onClick={() => setSelectedDateISO(addDaysISO(selectedDateISO, 1))}
              className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
            >
              Next ▶
            </button>
          </div>

          <div className="relative">
            <button
              ref={actionsBtnRef}
              type="button"
              onClick={() => setActionsOpen((v) => !v)}
              className={cls("rounded-xl px-4 py-2 text-sm font-semibold shadow-sm", "bg-indigo-600 text-white hover:bg-indigo-700")}
            >
              Actions ▾
            </button>

            {portalReady && actionsOpen && actionsPos
              ? createPortal(
                  <>
                    <div className="fixed inset-0 z-[9998]" onClick={() => setActionsOpen(false)} />
                    <div
                      ref={actionsMenuRef}
                      className="fixed z-[9999] w-56 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl max-h-[calc(100vh-16px)] overflow-y-auto"
                      style={{ top: actionsPos.top, left: actionsPos.left }}
                    >
                      <button
                        type="button"
                        onClick={openIncidentFromActions}
                        disabled={!orgId || !locationId}
                        className={cls(
                          "w-full px-4 py-2 text-left text-sm font-semibold",
                          !orgId || !locationId ? "text-slate-400 cursor-not-allowed" : "text-slate-800 hover:bg-slate-50"
                        )}
                      >
                        Log incident
                      </button>

                      <button
                        type="button"
                        onClick={openCalibrationFromActions}
                        disabled={!orgId || !locationId}
                        className={cls(
                          "w-full px-4 py-2 text-left text-sm font-semibold",
                          !orgId || !locationId ? "text-slate-400 cursor-not-allowed" : "text-slate-800 hover:bg-slate-50"
                        )}
                      >
                        Log calibration check
                      </button>

                      <button
                        type="button"
                        onClick={openStaffAssessFromActions}
                        className="w-full px-4 py-2 text-left text-sm font-semibold text-slate-800 hover:bg-slate-50"
                      >
                        Staff assessment
                      </button>

                      <button
                        type="button"
                        onClick={openQcFromActions}
                        disabled={!orgId || !locationId}
                        className={cls(
                          "w-full px-4 py-2 text-left text-sm font-semibold",
                          !orgId || !locationId ? "text-slate-400 cursor-not-allowed" : "text-slate-800 hover:bg-slate-50"
                        )}
                      >
                        Staff QC (Manager QC)
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setActionsOpen(false);
                          setSignoffOpen(true);
                        }}
                        disabled={!cleaningAllDone || alreadySignedOff}
                        className={cls(
                          "w-full px-4 py-2 text-left text-sm font-semibold",
                          !cleaningAllDone || alreadySignedOff ? "text-slate-400 cursor-not-allowed" : "text-slate-800 hover:bg-slate-50"
                        )}
                      >
                        {alreadySignedOff ? "Signed off" : "Sign off day"}
                      </button>

                      <div className="my-1 border-t border-slate-100" />

                      <button
                        type="button"
                        onClick={() => {
                          setActionsOpen(false);
                          void refreshAll();
                        }}
                        disabled={loading || !orgId || !locationId}
                        className={cls(
                          "w-full px-4 py-2 text-left text-sm font-semibold",
                          loading || !orgId || !locationId ? "text-slate-400 cursor-not-allowed" : "text-slate-700 hover:bg-slate-50"
                        )}
                      >
                        {loading ? "Refreshing…" : "Refresh"}
                      </button>
                    </div>
                  </>,
                  document.body
                )
              : null}
          </div>
        </div>
      </section>

      {/* ... all your existing dashboard sections remain unchanged ... */}

      {/* Signoff modal */}
      {signoffOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center p-4 sm:items-center">
          <div className="absolute inset-0 bg-black/30" onClick={() => setSignoffOpen(false)} />
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="relative w-full max-w-lg rounded-3xl border border-slate-200 bg-white p-4 shadow-xl"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-sm font-extrabold text-slate-900">Sign off day</div>
                <div className="text-xs text-slate-600">Date: {formatDDMMYYYY(selectedDateISO)}</div>
              </div>
              <button
                type="button"
                onClick={() => setSignoffOpen(false)}
                className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
              >
                Close
              </button>
            </div>

            <div className="mt-3 grid gap-3">
              {!cleaningAllDone ? (
                <div className="rounded-2xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-800">
                  You must complete all cleaning tasks due today before signing off.
                </div>
              ) : null}

              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                <label className="text-xs font-semibold text-slate-600">
                  Initials
                  <input
                    value={signoffInitials}
                    onChange={(e) => setSignoffInitials(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm"
                    placeholder="e.g. WS"
                  />
                </label>

                <label className="text-xs font-semibold text-slate-600">
                  Notes (optional)
                  <input
                    value={signoffNotes}
                    onChange={(e) => setSignoffNotes(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm"
                    placeholder="Anything to note?"
                  />
                </label>
              </div>

              <div className="flex items-center justify-end gap-2">
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
                  disabled={signoffSaving || !cleaningAllDone}
                  className={cls(
                    "rounded-xl px-4 py-2 text-sm font-semibold text-white",
                    signoffSaving || !cleaningAllDone ? "bg-slate-300 cursor-not-allowed" : "bg-indigo-600 hover:bg-indigo-700"
                  )}
                >
                  {signoffSaving ? "Saving…" : "Sign off"}
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}

      {/* Calibration modal */}
      {calibrationOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center p-4 sm:items-center">
          <div className="absolute inset-0 bg-black/30" onClick={() => setCalibrationOpen(false)} />
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="relative w-full max-w-lg rounded-3xl border border-slate-200 bg-white p-4 shadow-xl"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-sm font-extrabold text-slate-900">Calibration check</div>
                <div className="text-xs text-slate-600">Log the equipment check for {formatDDMMYYYY(calibrationForm.checked_on)}</div>
              </div>
              <button
                type="button"
                onClick={() => setCalibrationOpen(false)}
                className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
              >
                Close
              </button>
            </div>

            <div className="mt-3 grid gap-3">
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                <label className="text-xs font-semibold text-slate-600">
                  Date
                  <input
                    type="date"
                    value={calibrationForm.checked_on}
                    onChange={(e) => setCalibrationForm((f) => ({ ...f, checked_on: e.target.value || nowISO }))}
                    className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm"
                  />
                </label>

                <label className="text-xs font-semibold text-slate-600">
                  Initials
                  <input
                    value={calibrationForm.staff_initials}
                    onChange={(e) => setCalibrationForm((f) => ({ ...f, staff_initials: e.target.value }))}
                    className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm"
                    placeholder="e.g. WS"
                  />
                </label>
              </div>

              <div className="grid grid-cols-1 gap-2">
                <label className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                  <input
                    type="checkbox"
                    checked={calibrationForm.cold_storage_checked}
                    onChange={(e) => setCalibrationForm((f) => ({ ...f, cold_storage_checked: e.target.checked }))}
                  />
                  Cold storage checked
                </label>
                <label className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                  <input
                    type="checkbox"
                    checked={calibrationForm.probes_checked}
                    onChange={(e) => setCalibrationForm((f) => ({ ...f, probes_checked: e.target.checked }))}
                  />
                  Probes checked
                </label>
                <label className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                  <input
                    type="checkbox"
                    checked={calibrationForm.thermometers_checked}
                    onChange={(e) => setCalibrationForm((f) => ({ ...f, thermometers_checked: e.target.checked }))}
                  />
                  Thermometers checked
                </label>
              </div>

              <label className="text-xs font-semibold text-slate-600">
                Notes (optional)
                <textarea
                  value={calibrationForm.notes}
                  onChange={(e) => setCalibrationForm((f) => ({ ...f, notes: e.target.value }))}
                  className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm"
                  rows={3}
                />
              </label>

              <div className="flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setCalibrationOpen(false)}
                  className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={saveCalibrationCheck}
                  disabled={calibrationSaving}
                  className={cls(
                    "rounded-xl px-4 py-2 text-sm font-semibold text-white",
                    calibrationSaving ? "bg-slate-300 cursor-not-allowed" : "bg-indigo-600 hover:bg-indigo-700"
                  )}
                >
                  {calibrationSaving ? "Saving…" : "Save"}
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}

      {/* Staff assessment modal */}
      {staffAssessOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center p-4 sm:items-center">
          <div className="absolute inset-0 bg-black/30" onClick={() => setStaffAssessOpen(false)} />
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="relative w-full max-w-lg rounded-3xl border border-slate-200 bg-white p-4 shadow-xl"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-sm font-extrabold text-slate-900">Staff assessment</div>
                <div className="text-xs text-slate-600">Performance snapshot (by initials) for this location</div>
              </div>
              <button
                type="button"
                onClick={() => setStaffAssessOpen(false)}
                className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
              >
                Close
              </button>
            </div>

            <div className="mt-3 grid gap-3">
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                <label className="text-xs font-semibold text-slate-600">
                  Staff member
                  <select
                    value={staffAssessStaffId}
                    onChange={(e) => setStaffAssessStaffId(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm"
                  >
                    <option value="">Select…</option>
                    {teamOptions.map((t) => (
                      <option key={t.id} value={t.id}>
                        {tmLabel({ initials: t.initials, name: t.name })}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="text-xs font-semibold text-slate-600">
                  Range (days)
                  <select
                    value={staffAssessDays}
                    onChange={(e) => setStaffAssessDays(Number(e.target.value) || 7)}
                    className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm"
                  >
                    <option value={7}>7</option>
                    <option value={14}>14</option>
                    <option value={30}>30</option>
                  </select>
                </label>
              </div>

              {staffAssessErr ? (
                <div className="rounded-2xl border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-800">{staffAssessErr}</div>
              ) : null}

              {staffAssessLoading ? (
                <div className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-700">
                  Loading assessment…
                </div>
              ) : null}

              {staffAssess ? (
                <div className="grid grid-cols-2 gap-2">
                  <div className="rounded-2xl border border-slate-200 bg-white px-3 py-2">
                    <div className="text-[11px] font-extrabold uppercase tracking-[0.2em] text-slate-500">Staff</div>
                    <div className="mt-1 text-sm font-extrabold text-slate-900">{staffAssess.staffLabel}</div>
                    <div className="text-xs text-slate-600">{staffAssess.rangeDays} day range</div>
                  </div>

                  <div className="rounded-2xl border border-slate-200 bg-white px-3 py-2">
                    <div className="text-[11px] font-extrabold uppercase tracking-[0.2em] text-slate-500">QC avg</div>
                    <div className="mt-1 text-sm font-extrabold text-slate-900">{staffAssess.qcAvg30d ?? "—"}</div>
                    <div className="text-xs text-slate-600">{staffAssess.qcCount30d} reviews (30d)</div>
                  </div>

                  <div className="rounded-2xl border border-slate-200 bg-white px-3 py-2">
                    <div className="text-[11px] font-extrabold uppercase tracking-[0.2em] text-slate-500">Cleaning runs</div>
                    <div className="mt-1 text-sm font-extrabold text-slate-900">{staffAssess.cleaningRuns}</div>
                    <div className="text-xs text-slate-600">Completed</div>
                  </div>

                  <div className="rounded-2xl border border-slate-200 bg-white px-3 py-2">
                    <div className="text-[11px] font-extrabold uppercase tracking-[0.2em] text-slate-500">Temp logs</div>
                    <div className="mt-1 text-sm font-extrabold text-slate-900">{staffAssess.tempLogs}</div>
                    <div className="text-xs text-slate-600">Logged</div>
                  </div>

                  <div className="rounded-2xl border border-slate-200 bg-white px-3 py-2">
                    <div className="text-[11px] font-extrabold uppercase tracking-[0.2em] text-slate-500">Temp fails</div>
                    <div className={cls("mt-1 text-sm font-extrabold", staffAssess.tempFails > 0 ? "text-red-700" : "text-slate-900")}>
                      {staffAssess.tempFails}
                    </div>
                    <div className="text-xs text-slate-600">In range</div>
                  </div>

                  <div className="rounded-2xl border border-slate-200 bg-white px-3 py-2">
                    <div className="text-[11px] font-extrabold uppercase tracking-[0.2em] text-slate-500">Incidents</div>
                    <div className={cls("mt-1 text-sm font-extrabold", staffAssess.incidents > 0 ? "text-amber-700" : "text-slate-900")}>
                      {staffAssess.incidents}
                    </div>
                    <div className="text-xs text-slate-600">Created by staff</div>
                  </div>
                </div>
              ) : (
                <div className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-700">
                  Select a staff member to view results.
                </div>
              )}
            </div>
          </motion.div>
        </div>
      )}

      {/* Staff QC modal */} 
      {qcOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center p-4 sm:items-center">
          <div className="absolute inset-0 bg-black/30" onClick={() => setQcOpen(false)} />
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="relative w-full max-w-2xl rounded-3xl border border-slate-200 bg-white p-4 shadow-xl"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-sm font-extrabold text-slate-900">Staff QC</div>
                <div className="text-xs text-slate-600">Manager QC reviews for this location</div>
              </div>
              <button
                type="button"
                onClick={() => setQcOpen(false)}
                className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
              >
                Close
              </button>
            </div>

            <div className="mt-3 grid gap-3">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                <div className="text-xs font-extrabold uppercase tracking-[0.2em] text-slate-500">Add review</div>

                <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-4">
                  <label className="text-xs font-semibold text-slate-600 sm:col-span-2">
                    Staff
                    <select
                      value={qcForm.staff_id}
                      onChange={(e) => setQcForm((f) => ({ ...f, staff_id: e.target.value }))}
                      className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm"
                    >
                      <option value="">Select…</option>
                      {teamOptions.map((t) => (
                        <option key={t.id} value={t.id}>
                          {tmLabel({ initials: t.initials, name: t.name })}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="text-xs font-semibold text-slate-600">
                    Date
                    <input
                      type="date"
                      value={qcForm.reviewed_on}
                      onChange={(e) => setQcForm((f) => ({ ...f, reviewed_on: e.target.value || nowISO }))}
                      className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm"
                    />
                  </label>

                  <label className="text-xs font-semibold text-slate-600">
                    Score (1–5)
                    <input
                      type="number"
                      min={1}
                      max={5}
                      value={qcForm.rating}
                      onChange={(e) => setQcForm((f) => ({ ...f, rating: Number(e.target.value) }))}
                      className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm"
                    />
                  </label>
                </div>

                <label className="mt-2 block text-xs font-semibold text-slate-600">
                  Notes (optional)
                  <textarea
                    value={qcForm.notes}
                    onChange={(e) => setQcForm((f) => ({ ...f, notes: e.target.value }))}
                    className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm"
                    rows={2}
                  />
                </label>

                <div className="mt-2 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => void loadQcReviews()}
                    disabled={qcLoading || qcSummaryLoading}
                    className={cls(
                      "rounded-xl border px-4 py-2 text-sm font-semibold",
                      qcLoading || qcSummaryLoading ? "border-slate-200 bg-white text-slate-300 cursor-not-allowed" : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                    )}
                  >
                    Refresh
                  </button>
                  <button
                    type="button"
                    onClick={addQcReview}
                    disabled={qcSaving}
                    className={cls(
                      "rounded-xl px-4 py-2 text-sm font-semibold text-white",
                      qcSaving ? "bg-slate-300 cursor-not-allowed" : "bg-indigo-600 hover:bg-indigo-700"
                    )}
                  >
                    {qcSaving ? "Saving…" : "Add"}
                  </button>
                </div>
              </div>

              <div className="overflow-hidden rounded-3xl border border-white/40 bg-white/80 shadow-lg shadow-slate-900/5 backdrop-blur">
                <div className="border-b border-slate-100 px-4 py-3">
                  <div className="text-xs font-extrabold uppercase tracking-[0.22em] text-slate-500">Recent QC reviews</div>
                </div>

                <div className="overflow-x-auto">
                  <table className="min-w-full text-left text-xs">
                    <thead className="bg-slate-50/70">
                      <tr className="text-slate-600">
                        <th className="px-4 py-2 font-semibold">Date</th>
                        <th className="px-4 py-2 font-semibold">Staff</th>
                        <th className="px-4 py-2 font-semibold">Manager</th>
                        <th className="px-4 py-2 font-semibold">Score</th>
                        <th className="px-4 py-2 font-semibold">Notes</th>
                        <th className="px-4 py-2 font-semibold" />
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {qcToRender.length === 0 ? (
                        <tr>
                          <td className="px-4 py-4 text-slate-500" colSpan={6}>
                            No QC reviews yet.
                          </td>
                        </tr>
                      ) : (
                        qcToRender.map((r) => (
                          <tr key={r.id} className="hover:bg-slate-50/50">
                            <td className="px-4 py-2 text-slate-700">{formatDDMMYYYY(r.reviewed_on)}</td>
                            <td className="px-4 py-2 text-slate-700">{tmLabel({ initials: r.staff?.initials ?? null, name: r.staff?.name ?? null })}</td>
                            <td className="px-4 py-2 text-slate-700">
                              {tmLabel({ initials: r.manager?.initials ?? null, name: r.manager?.name ?? null })}
                            </td>
                            <td className="px-4 py-2 font-extrabold text-slate-900">{r.rating}</td>
                            <td className="px-4 py-2 text-slate-700">{r.notes ?? "—"}</td>
                            <td className="px-4 py-2 text-right">
                              <button
                                type="button"
                                onClick={() => void deleteQcReview(r.id)}
                                className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50"
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
          </motion.div>
        </div>
      )}

      {/* Incident modal – with defaultInitials */}
      {incidentOpen && orgId && locationId && (
        <IncidentModal
          open={incidentOpen}
          onClose={() => setIncidentOpen(false)}
          defaultDate={selectedDateISO}
          orgId={orgId}
          locationId={locationId}
          defaultInitials={managerTeamMember?.initials?.toUpperCase() ?? ""}
          onSaved={refreshAll}
        />
      )}
    </div>
  );
}

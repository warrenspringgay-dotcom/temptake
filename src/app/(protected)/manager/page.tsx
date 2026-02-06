"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { motion } from "framer-motion";
import { supabase } from "@/lib/supabaseBrowser";
import { getActiveOrgIdClient } from "@/lib/orgClient";
import { getActiveLocationIdClient } from "@/lib/locationClient";
import IncidentModal from "@/components/IncidentModal";

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

type TrainingSummary = {
  expired: number;
  dueSoon: number;
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

type TeamMemberOption = {
  id: string;
  name: string | null;
  initials: string | null;
  role: string | null;
  active: boolean | null;
  user_id: string | null;
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

async function fetchTempFailuresUnifiedForDay(
  orgId: string,
  locationId: string,
  d0: Date,
  d1: Date
) {
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

    let corrective = ca?.action ? String(ca.action) : null;

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
      source: "temp_fail",
    } as UnifiedIncidentRow;
  });
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

const cls = (...p: Array<string | false | null | undefined>) =>
  p.filter(Boolean).join(" ");

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
          <div className="text-[11px] font-extrabold uppercase tracking-[0.22em] text-slate-500">
            {title}
          </div>
          <div className="mt-1 flex items-baseline gap-2">
            <div className="text-2xl font-extrabold text-slate-900 truncate">
              {value}
            </div>
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

/* ---------- Table footer toggle ---------- */

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
      <button
        type="button"
        onClick={onToggle}
        className="font-semibold text-indigo-700 hover:underline"
      >
        {showingAll ? "Show less" : "Show all"}
      </button>
    </div>
  );
}

/* ---------- Page ---------- */

export default function ManagerDashboardPage() {
  const [orgId, setOrgId] = useState<string | null>(null);
  const [locationId, setLocationId] = useState<string | null>(null);
  const [locations, setLocations] = useState<LocationOption[]>([]);
  const [locationLoading, setLocationLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const [selectedDateISO, setSelectedDateISO] = useState(nowISO);
  const centeredDate = useMemo(
    () => formatPrettyDate(selectedDateISO),
    [selectedDateISO]
  );

  /* ===== KPI state ===== */
  const [tempsSummary, setTempsSummary] = useState<TempSummary>({
    today: 0,
    fails7d: 0,
  });
  const [cleaningTotal, setCleaningTotal] = useState(0);
  const [cleaningDoneTotal, setCleaningDoneTotal] = useState(0);
  const [incidentsToday, setIncidentsToday] = useState(0);
  const [incidents7d, setIncidents7d] = useState(0);
  const [trainingExpired, setTrainingExpired] = useState(0);
  const [trainingDueSoon, setTrainingDueSoon] = useState(0);

  /* ===== Today activity tables ===== */
  const [todayTemps, setTodayTemps] = useState<TempLogRow[]>([]);
  const [cleaningActivity, setCleaningActivity] = useState<CleaningActivityRow[]>(
    []
  );
  const [cleaningCategoryProgress, setCleaningCategoryProgress] = useState<
    CleaningCategoryProgress[]
  >([]);
  const [tempFailsToday, setTempFailsToday] = useState<UnifiedIncidentRow[]>([]);
  const [incidentsHistory, setIncidentsHistory] = useState<UnifiedIncidentRow[]>(
    []
  );

  const [showAllTemps, setShowAllTemps] = useState(false);
  const [showAllTempFails, setShowAllTempFails] = useState(false);
  const [showAllCleaning, setShowAllCleaning] = useState(false);
  const [showAllIncidents, setShowAllIncidents] = useState(false);

  /* ===== Day sign-offs ===== */
  const [signoffsToday, setSignoffsToday] = useState<SignoffRow[]>([]);
  const [signoffSummary, setSignoffSummary] = useState<SignoffSummary>({
    todayCount: 0,
  });
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

  const [managerTeamMember, setManagerTeamMember] =
    useState<TeamMemberOption | null>(null);

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

  const [incidentOpen, setIncidentOpen] = useState(false);

  const [allergenLogs, setAllergenLogs] = useState<AllergenChangeLogRow[]>([]);
  const [showAllAllergenLogs, setShowAllAllergenLogs] = useState(false);

  const lastStaffAssessKeyRef = useRef<string>("");

  /* ===== Actions dropdown (top bar) ===== */
  const [actionsOpen, setActionsOpen] = useState(false);
  const actionsBtnRef = useRef<HTMLButtonElement | null>(null);
  const actionsMenuRef = useRef<HTMLDivElement | null>(null);

  const [portalReady, setPortalReady] = useState(false);
  const [actionsPos, setActionsPos] = useState<{ top: number; right: number } | null>(
    null
  );

  useEffect(() => setPortalReady(true), []);

  const updateActionsPos = () => {
    const btn = actionsBtnRef.current;
    if (!btn) return;
    const r = btn.getBoundingClientRect();
    const right = Math.max(8, window.innerWidth - r.right);
    const top = r.bottom + 8;
    setActionsPos({ top, right });
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

  useEffect(() => {
    if (!staffAssessOpen) return;
    if (!orgId || !locationId) return;
    if (!staffAssessStaffId) return;

    const key = `${staffAssessStaffId}|${staffAssessDays}|${selectedDateISO}|${locationId}`;
    if (lastStaffAssessKeyRef.current === key) return;
    lastStaffAssessKeyRef.current = key;

    void loadStaffAssessment(staffAssessStaffId, staffAssessDays);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    staffAssessOpen,
    staffAssessStaffId,
    staffAssessDays,
    selectedDateISO,
    orgId,
    locationId,
  ]);

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
    if (!managerTeamMember?.id)
      return alert(
        "Your login is not linked to a team member (team_members.user_id)."
      );
    if (!qcForm.reviewed_on) return alert("Select date.");

    const rating = Number(qcForm.rating);
    if (!Number.isFinite(rating) || rating < 1 || rating > 5)
      return alert("Score must be 1–5.");

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
    if (!orgId) return;
    void loadTeamOptions();
    void loadLoggedInManager();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orgId]);

  useEffect(() => {
    if (!signoffOpen) return;
    if (signoffInitials.trim()) return;

    const ini = managerTeamMember?.initials?.trim().toUpperCase() ?? "";
    if (ini) setSignoffInitials(ini);
  }, [signoffOpen, managerTeamMember, signoffInitials]);

  useEffect(() => {
    if (!orgId || !locationId) return;
    refreshAll();
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
        trainingsRes,
        signoffsDayRes,
        allergenLogsRes,
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

        supabase
          .from("allergen_change_logs")
          .select(
            "id, created_at, action, item_name, category_before, category_after, staff_initials"
          )
          .eq("org_id", orgId)
          .eq("location_id", locationId)
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
        trainingsRes.error ||
        signoffsDayRes.error ||
        allergenLogsRes.error;

      if (firstErr) throw firstErr;

      setTempsSummary({
        today: tempsTodayRes.count ?? 0,
        fails7d: tempsFails7dRes.count ?? 0,
      });

      const tRows: Array<{ expires_on: string | null }> =
        (trainingsRes.data as any[]) ?? [];
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

      const tempFails = await fetchTempFailuresUnifiedForDay(
        orgId,
        locationId,
        d0,
        d1
      );
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
      setSignoffSummary({
        todayCount: signoffRows.length,
      });

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
    cleaningTotal === 0
      ? "neutral"
      : cleaningDoneTotal === cleaningTotal
      ? "ok"
      : "warn";

  const incidentsTone: "neutral" | "ok" | "warn" | "danger" =
    incidentsToday > 0 ? "danger" : incidents7d > 0 ? "warn" : "ok";

  const trainingTone: "neutral" | "ok" | "warn" | "danger" =
    trainingExpired > 0 ? "danger" : trainingDueSoon > 0 ? "warn" : "ok";

  const tempsToRender = showAllTemps ? todayTemps : todayTemps.slice(0, 10);
  const tempFailsToRender = showAllTempFails
    ? tempFailsToday
    : tempFailsToday.slice(0, 10);
  const cleaningToRender = showAllCleaning
    ? cleaningActivity
    : cleaningActivity.slice(0, 10);
  const incidentsToRender = showAllIncidents
    ? incidentsHistory
    : incidentsHistory.slice(0, 10);
  const qcToRender = showAllQc ? qcReviews : qcReviews.slice(0, 10);
  const signoffsToRender = showAllSignoffs
    ? signoffsToday
    : signoffsToday.slice(0, 10);
  const allergenLogsToRender = showAllAllergenLogs
    ? allergenLogs
    : allergenLogs.slice(0, 10);

  const cleaningAllDone =
    cleaningTotal > 0 && cleaningDoneTotal === cleaningTotal;
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
    await Promise.all([loadTeamOptions(), loadLoggedInManager(), loadQcReviews()]);
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

      const [cleaningRunsRes, tempLogsRes, tempFailsRes, incidentsRes, qcRes] =
        await Promise.all([
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

      const firstErr2 =
        cleaningRunsRes.error ||
        tempLogsRes.error ||
        tempFailsRes.error ||
        incidentsRes.error ||
        qcRes.error;

      if (firstErr2) throw firstErr2;

      const qcRows = (qcRes.data ?? []) as Array<{ rating: number }>;
      const qcCount30d = qcRows.length;
      const qcAvg30d =
        qcCount30d > 0
          ? Math.round(
              (qcRows.reduce((a, r) => a + Number(r.rating || 0), 0) / qcCount30d) *
                10
            ) / 10
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
    <>
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
                <span
                  className={cls(
                    "font-semibold",
                    tempsSummary.fails7d > 0 && "text-red-700"
                  )}
                >
                  {tempsSummary.fails7d}
                </span>
              </>
            }
          />
          <KpiTile
            title="Cleaning"
            icon="🧼"
            tone={cleaningTone}
            value={`${cleaningDoneTotal}/${cleaningTotal}`}
            sub="Tasks completed today"
          />
          <KpiTile
            title="Incidents"
            icon="⚠️"
            tone={incidentsTone}
            value={incidentsToday}
            sub={`Last 7d: ${incidents7d}`}
          />
          <KpiTile
            title="Training"
            icon="🎓"
            tone={trainingTone}
            value={`${trainingExpired} expired`}
            sub={`${trainingDueSoon} due in 30d`}
          />
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <label className="text-xs font-semibold text-slate-600">
              Location
            </label>
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

          {/* ✅ Actions button (menu is PORTALED to body so it can't hide behind layout/overflow) */}
          <div className="relative">
            <button
              ref={actionsBtnRef}
              type="button"
              onClick={() => {
                setActionsOpen((v) => !v);
                // if opening, position will be calculated in effect
              }}
              className={cls(
                "rounded-xl px-4 py-2 text-sm font-semibold shadow-sm",
                "bg-indigo-600 text-white hover:bg-indigo-700"
              )}
            >
              Actions ▾
            </button>

            {portalReady && actionsOpen && actionsPos
              ? createPortal(
                  <>
                    {/* Click-catcher overlay */}
                    <div
                      className="fixed inset-0 z-[9998]"
                      onClick={() => setActionsOpen(false)}
                    />
                    <div
                      ref={actionsMenuRef}
                      className="fixed z-[9999] w-56 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl"
                      style={{ top: actionsPos.top, right: actionsPos.right }}
                    >
                      <button
                        type="button"
                        onClick={() => {
                          setActionsOpen(false);
                          setIncidentOpen(true);
                        }}
                        className="w-full px-4 py-2 text-left text-sm font-semibold text-slate-800 hover:bg-slate-50"
                      >
                        Log incident
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setActionsOpen(false);
                          setStaffAssessOpen(true);
                        }}
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
                          !orgId || !locationId
                            ? "text-slate-400 cursor-not-allowed"
                            : "text-slate-800 hover:bg-slate-50"
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
                          !cleaningAllDone || alreadySignedOff
                            ? "text-slate-400 cursor-not-allowed"
                            : "text-slate-800 hover:bg-slate-50"
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
                          loading || !orgId || !locationId
                            ? "text-slate-400 cursor-not-allowed"
                            : "text-slate-700 hover:bg-slate-50"
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

      {/* Cleaning category progress */}
      <section className="mt-4 rounded-3xl border border-white/40 bg-white/80 p-4 shadow-md shadow-slate-900/5 backdrop-blur">
        <div className="mb-3">
          <div className="text-[11px] font-extrabold uppercase tracking-[0.22em] text-slate-400">
            Cleaning progress
          </div>
          <div className="mt-0.5 text-sm font-semibold text-slate-900">
            By category (selected day)
          </div>
        </div>

        <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white/90">
          <table className="min-w-full text-xs">
            <thead className="bg-slate-50">
              <tr className="text-left text-slate-500">
                <th className="px-3 py-2">Category</th>
                <th className="px-3 py-2">Done</th>
                <th className="px-3 py-2">Total</th>
                <th className="px-3 py-2">Completion</th>
              </tr>
            </thead>
            <tbody>
              {cleaningCategoryProgress.length === 0 ? (
                <tr>
                  <td
                    colSpan={4}
                    className="px-3 py-4 text-center text-slate-500"
                  >
                    No cleaning tasks scheduled for this day.
                  </td>
                </tr>
              ) : (
                cleaningCategoryProgress.map((r) => {
                  const pct =
                    r.total > 0 ? Math.round((r.done / r.total) * 100) : 0;
                  const pill =
                    pct === 100
                      ? "bg-emerald-100 text-emerald-800"
                      : pct >= 50
                      ? "bg-amber-100 text-amber-800"
                      : "bg-red-100 text-red-800";

                  return (
                    <tr
                      key={r.category}
                      className="border-t border-slate-100 text-slate-800"
                    >
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
          <div className="text-[11px] font-extrabold uppercase tracking-[0.22em] text-slate-400">
            Incidents
          </div>
          <div className="mt-0.5 text-sm font-semibold text-slate-900">
            Incident log & corrective actions (last 90 days)
          </div>
        </div>

        <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white/90">
          <table className="min-w-full text-xs">
            <thead className="bg-slate-50">
              <tr className="text-left text-slate-500">
                <th className="px-3 py-2">Date</th>
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
                  <td
                    colSpan={6}
                    className="px-3 py-4 text-center text-slate-500"
                  >
                    No incidents logged.
                  </td>
                </tr>
              ) : (
                incidentsToRender.map((r) => (
                  <tr
                    key={r.id}
                    className="border-t border-slate-100 text-slate-800"
                  >
                    <td className="px-3 py-2 whitespace-nowrap">
                      {formatDDMMYYYY(r.happened_on)}
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap">
                      {r.created_at
                        ? new Date(r.created_at).toLocaleTimeString("en-GB", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })
                        : "—"}
                    </td>
                    <td className="px-3 py-2 font-semibold">
                      {r.type ?? "Incident"}
                    </td>
                    <td className="px-3 py-2">
                      {r.created_by?.toUpperCase() ?? "—"}
                    </td>
                    <td className="px-3 py-2 max-w-[18rem] truncate">
                      {r.details ?? "—"}
                    </td>
                    <td className="px-3 py-2 max-w-[18rem] truncate">
                      {r.immediate_action ?? "—"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <TableFooterToggle
          total={incidentsHistory.length}
          showingAll={showAllIncidents}
          onToggle={() => setShowAllIncidents((v) => !v)}
        />
      </section>

      {/* Activity */}
      <section className="mt-4 rounded-3xl border border-white/40 bg-white/80 p-4 shadow-md shadow-slate-900/5 backdrop-blur">
        <div className="mb-3">
          <div className="text-[11px] font-extrabold uppercase tracking-[0.22em] text-slate-400">
            Today&apos;s activity
          </div>
          <div className="mt-0.5 text-sm font-semibold text-slate-900">
            Temps + cleaning (category-based)
          </div>
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
                  {todayTemps.length === 0 ? (
                    <tr>
                      <td
                        colSpan={6}
                        className="px-3 py-4 text-center text-slate-500"
                      >
                        No temperature logs.
                      </td>
                    </tr>
                  ) : (
                    tempsToRender.map((r) => (
                      <tr
                        key={r.id}
                        className="border-t border-slate-100 text-slate-800"
                      >
                        <td className="px-3 py-2">{r.time}</td>
                        <td className="px-3 py-2">{r.staff}</td>
                        <td className="px-3 py-2">{r.area}</td>
                        <td className="px-3 py-2">{r.item}</td>
                        <td className="px-3 py-2">
                          {r.temp_c != null ? `${r.temp_c}°C` : "—"}
                        </td>
                        <td className="px-3 py-2">
                          {r.status ? (
                            <span
                              className={cls(
                                "inline-flex rounded-full px-2 py-[1px] text-[10px] font-extrabold uppercase",
                                r.status === "pass"
                                  ? "bg-emerald-100 text-emerald-800"
                                  : "bg-red-100 text-red-800"
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

            {/* Temp failures & corrective actions */}
            <h3 className="mt-4 mb-2 text-[11px] font-extrabold uppercase tracking-[0.22em] text-slate-500">
              Temp failures & corrective actions
            </h3>

            <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white/90">
              <table className="min-w-full text-xs">
                <thead className="bg-slate-50">
                  <tr className="text-left text-slate-500">
                    <th className="px-3 py-2">Time</th>
                    <th className="px-3 py-2">By</th>
                    <th className="px-3 py-2">Details</th>
                    <th className="px-3 py-2">Corrective</th>
                  </tr>
                </thead>
                <tbody>
                  {tempFailsToRender.length === 0 ? (
                    <tr>
                      <td
                        colSpan={4}
                        className="px-3 py-4 text-center text-slate-500"
                      >
                        No temp failures.
                      </td>
                    </tr>
                  ) : (
                    tempFailsToRender.map((r) => (
                      <tr
                        key={r.id}
                        className="border-t border-slate-100 text-slate-800"
                      >
                        <td className="px-3 py-2 whitespace-nowrap">
                          {r.created_at
                            ? new Date(r.created_at).toLocaleTimeString(
                                "en-GB",
                                { hour: "2-digit", minute: "2-digit" }
                              )
                            : "—"}
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap">
                          {r.created_by?.toUpperCase() ?? "—"}
                        </td>
                        <td className="px-3 py-2 max-w-[18rem] truncate">
                          {r.details ?? "—"}
                        </td>
                        <td className="px-3 py-2 max-w-[18rem] truncate">
                          {r.corrective_action ?? "—"}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <TableFooterToggle
              total={tempFailsToday.length}
              showingAll={showAllTempFails}
              onToggle={() => setShowAllTempFails((v) => !v)}
            />
          </div>

          <div>
            <h3 className="mb-2 text-[11px] font-extrabold uppercase tracking-[0.22em] text-slate-500">
              Cleaning runs
            </h3>

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
                      <td
                        colSpan={4}
                        className="px-3 py-4 text-center text-slate-500"
                      >
                        No cleaning tasks completed.
                      </td>
                    </tr>
                  ) : (
                    cleaningToRender.map((r) => (
                      <tr
                        key={r.id}
                        className="border-t border-slate-100 text-slate-800"
                      >
                        <td className="px-3 py-2">{r.time ?? "—"}</td>
                        <td className="px-3 py-2">
                          <div className="font-semibold">{r.category}</div>
                          {r.task ? (
                            <div className="text-[11px] text-slate-500 truncate max-w-[18rem]">
                              {r.task}
                            </div>
                          ) : null}
                        </td>
                        <td className="px-3 py-2">{r.staff ?? "—"}</td>
                        <td className="px-3 py-2 max-w-[14rem] truncate">
                          {r.notes ?? "—"}
                        </td>
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

      {/* Day sign-offs table */}
      <section className="mt-4 rounded-3xl border border-white/40 bg-white/80 p-4 shadow-md shadow-slate-900/5 backdrop-blur">
        <div className="mb-3">
          <div className="text-[11px] font-extrabold uppercase tracking-[0.22em] text-slate-400">
            Day sign-offs
          </div>
          <div className="mt-0.5 text-sm font-semibold text-slate-900">
            Daily sign-offs for selected day · Total: {signoffSummary.todayCount}
          </div>
        </div>

        <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white/90">
          <table className="min-w-full text-xs">
            <thead className="bg-slate-50">
              <tr className="text-left text-slate-500">
                <th className="px-3 py-2">Date</th>
                <th className="px-3 py-2">Time</th>
                <th className="px-3 py-2">Signed by</th>
                <th className="px-3 py-2">Notes / corrective actions</th>
              </tr>
            </thead>
            <tbody>
              {signoffsToRender.length === 0 ? (
                <tr>
                  <td
                    colSpan={4}
                    className="px-3 py-6 text-center text-slate-500"
                  >
                    No sign-offs logged for this day.
                  </td>
                </tr>
              ) : (
                signoffsToRender.map((r) => {
                  const t = r.created_at ? formatTimeHM(new Date(r.created_at)) : null;
                  return (
                    <tr
                      key={r.id}
                      className="border-t border-slate-100 text-slate-800"
                    >
                      <td className="px-3 py-2 whitespace-nowrap">
                        {formatDDMMYYYY(r.signoff_on)}
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap">{t ?? "—"}</td>
                      <td className="px-3 py-2 font-semibold whitespace-nowrap">
                        {r.signed_by ? r.signed_by.toUpperCase() : "—"}
                      </td>
                      <td className="px-3 py-2 max-w-[28rem] truncate">
                        {r.notes ?? "—"}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <TableFooterToggle
          total={signoffsToday.length}
          showingAll={showAllSignoffs}
          onToggle={() => setShowAllSignoffs((v) => !v)}
        />
      </section>

      {/* Manager QC Summary table */}
      <section className="mt-4 rounded-3xl border border-white/40 bg-white/80 p-4 shadow-md shadow-slate-900/5 backdrop-blur">
        <div className="mb-3 flex items-center justify-between gap-3">
          <div>
            <div className="text-[11px] font-extrabold uppercase tracking-[0.22em] text-slate-400">
              Manager QC
            </div>
            <div className="mt-0.5 text-sm font-semibold text-slate-900">
              Recent QC reviews (selected location)
            </div>
          </div>

          <button
            type="button"
            onClick={async () => {
              if (!orgId || !locationId) return;
              setQcForm((f) => ({
                ...f,
                reviewed_on: selectedDateISO || f.reviewed_on,
              }));
              setQcOpen(true);
              await Promise.all([loadTeamOptions(), loadLoggedInManager(), loadQcReviews()]);
            }}
            className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50"
          >
            Open QC
          </button>
        </div>

        <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white/90">
          <table className="min-w-full text-xs">
            <thead className="bg-slate-50">
              <tr className="text-left text-slate-500">
                <th className="px-3 py-2">Date</th>
                <th className="px-3 py-2">Staff</th>
                <th className="px-3 py-2">Manager</th>
                <th className="px-3 py-2">Score</th>
                <th className="px-3 py-2">Notes</th>
              </tr>
            </thead>
            <tbody>
              {qcSummaryLoading ? (
                <tr>
                  <td colSpan={5} className="px-3 py-6 text-center text-slate-500">
                    Loading…
                  </td>
                </tr>
              ) : qcToRender.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-3 py-6 text-center text-slate-500">
                    No QC reviews logged.
                  </td>
                </tr>
              ) : (
                qcToRender.map((r) => {
                  const pill =
                    r.rating >= 4
                      ? "bg-emerald-100 text-emerald-800"
                      : r.rating === 3
                      ? "bg-amber-100 text-amber-800"
                      : "bg-red-100 text-red-800";

                  return (
                    <tr key={r.id} className="border-t border-slate-100 text-slate-800">
                      <td className="px-3 py-2 whitespace-nowrap">
                        {formatDDMMYYYY(r.reviewed_on)}
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap">
                        {tmLabel(r.staff ?? { initials: null, name: "—" })}
                      </td>
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
                          {r.rating}/5
                        </span>
                      </td>
                      <td className="px-3 py-2 max-w-[24rem] truncate">
                        {r.notes ?? "—"}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <TableFooterToggle
          total={qcReviews.length}
          showingAll={showAllQc}
          onToggle={() => setShowAllQc((v) => !v)}
        />
      </section>

      {/* Allergen edit log */}
      <section className="mt-4 mb-6 rounded-3xl border border-white/40 bg-white/80 p-4 shadow-md shadow-slate-900/5 backdrop-blur">
        <div className="mb-3">
          <div className="text-[11px] font-extrabold uppercase tracking-[0.22em] text-slate-400">
            Allergens
          </div>
          <div className="mt-0.5 text-sm font-semibold text-slate-900">
            Allergen edit log (this location)
          </div>
        </div>

        <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white/90">
          <table className="min-w-full text-xs">
            <thead className="bg-slate-50">
              <tr className="text-left text-slate-500">
                <th className="px-3 py-2">Date</th>
                <th className="px-3 py-2">Time</th>
                <th className="px-3 py-2">Item</th>
                <th className="px-3 py-2">Action</th>
                <th className="px-3 py-2">Category change</th>
                <th className="px-3 py-2">By</th>
              </tr>
            </thead>
            <tbody>
              {allergenLogsToRender.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-3 py-4 text-center text-slate-500">
                    No allergen edits logged.
                  </td>
                </tr>
              ) : (
                allergenLogsToRender.map((r) => (
                  <tr key={r.id} className="border-t border-slate-100 text-slate-800">
                    <td className="px-3 py-2 whitespace-nowrap">
                      {formatDDMMYYYY(r.created_at)}
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap">
                      {formatTimeHM(safeDate(r.created_at)) ?? "—"}
                    </td>
                    <td className="px-3 py-2 max-w-[14rem] truncate">
                      {r.item_name ?? "—"}
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap">{r.action ?? "—"}</td>
                    <td className="px-3 py-2 max-w-[16rem] truncate">
                      {(r.category_before ?? "—") + " → " + (r.category_after ?? "—")}
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap">
                      {r.staff_initials?.toUpperCase() ?? "—"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <TableFooterToggle
          total={allergenLogs.length}
          showingAll={showAllAllergenLogs}
          onToggle={() => setShowAllAllergenLogs((v) => !v)}
        />
      </section>

      {/* Sign-off modal */}
      {signoffOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/30"
          onClick={() => setSignoffOpen(false)}
        >
          <div
            className={cls(
              "mx-auto mt-10 w-full max-w-xl rounded-2xl border border-slate-200 bg-white/90 p-4 text-slate-900 shadow-lg backdrop-blur"
            )}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-3 flex items-center justify-between">
              <div>
                <div className="text-base font-semibold">Sign off day</div>
                <div className="mt-0.5 text-xs text-slate-500">
                  {formatDDMMYYYY(selectedDateISO)} ·{" "}
                  {locations.find((l) => l.id === locationId)?.name ?? "—"}
                </div>
              </div>
              <button
                onClick={() => setSignoffOpen(false)}
                className="rounded-md p-2 text-slate-500 hover:bg-slate-100"
                aria-label="Close"
              >
                ✕
              </button>
            </div>

            {!cleaningAllDone && (
              <div className="mb-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
                You can’t sign off until all cleaning tasks due today are completed.
              </div>
            )}

            {alreadySignedOff && (
              <div className="mb-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
                This day is already signed off.
              </div>
            )}

            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs text-slate-500">Initials</label>
                <input
                  value={signoffInitials}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setSignoffInitials(e.target.value.toUpperCase())
                  }
                  placeholder="WS"
                  className="h-10 w-full rounded-xl border border-slate-300 bg-white/80 px-3 text-sm"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs text-slate-500">
                  Notes (optional)
                </label>
                <input
                  value={signoffNotes}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setSignoffNotes(e.target.value)
                  }
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
                disabled={!cleaningAllDone || alreadySignedOff || signoffSaving}
                className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700 disabled:opacity-60"
              >
                {signoffSaving ? "Signing…" : "Sign off"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Individual staff assessment modal */}
      {staffAssessOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/30 overflow-y-auto overscroll-contain p-3 sm:p-4"
          onClick={() => setStaffAssessOpen(false)}
        >
          <div
            className={cls(
              "mx-auto my-6 w-full max-w-3xl rounded-2xl border border-slate-200 bg-white/90 p-4 text-slate-900 shadow-lg backdrop-blur"
            )}
            onClick={(e) => e.stopPropagation()}
          >
            {/* ... unchanged ... */}
            <div className="mb-3 flex items-center justify-between">
              <div>
                <div className="text-base font-semibold">
                  Individual staff assessment
                </div>
                <div className="mt-0.5 text-xs text-slate-500">
                  Manager view of individual performance.
                </div>
              </div>
              <button
                onClick={() => setStaffAssessOpen(false)}
                className="rounded-md p-2 text-slate-500 hover:bg-slate-100"
                aria-label="Close"
              >
                ✕
              </button>
            </div>

            {staffAssessErr && (
              <div className="mb-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
                {staffAssessErr}
              </div>
            )}

            <div className="rounded-2xl border border-slate-200 bg-white/90 p-3">
              <div className="grid gap-3 md:grid-cols-3">
                <div>
                  <label className="mb-1 block text-xs text-slate-500">
                    Staff
                  </label>
                  <select
                    value={staffAssessStaffId}
                    onChange={(e: React.ChangeEvent<HTMLSelectElement>) => {
                      setStaffAssessStaffId(e.target.value);
                    }}
                    className="h-10 w-full rounded-xl border border-slate-300 bg-white/80 px-3 text-sm"
                  >
                    <option value="">Select staff…</option>
                    {teamOptions.map((t) => (
                      <option key={t.id} value={t.id}>
                        {tmLabel(t)}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mb-1 block text-xs text-slate-500">
                    Range (days)
                  </label>
                  <select
                    value={staffAssessDays}
                    onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                      setStaffAssessDays(Number(e.target.value) || 7)
                    }
                    className="h-10 w-full rounded-xl border border-slate-300 bg-white/80 px-3 text-sm"
                  >
                    {[7, 14, 30, 60, 90].map((n) => (
                      <option key={n} value={n}>
                        Last {n} days
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex items-end">
                  <button
                    type="button"
                    onClick={() => {
                      if (!staffAssessStaffId) {
                        alert("Select staff first.");
                        return;
                      }
                      void loadStaffAssessment(staffAssessStaffId, staffAssessDays);
                    }}
                    disabled={staffAssessLoading || !orgId || !locationId}
                    className="w-full rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700 disabled:opacity-60"
                  >
                    {staffAssessLoading ? "Loading…" : "Load"}
                  </button>
                </div>
              </div>

              <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                <KpiTile
                  title="Cleaning runs"
                  icon="🧼"
                  tone="neutral"
                  value={staffAssess?.cleaningRuns ?? "—"}
                  sub={
                    staffAssess
                      ? `Completed in last ${staffAssess.rangeDays}d`
                      : "Select staff + load"
                  }
                />
                <KpiTile
                  title="Temp logs"
                  icon="🌡"
                  tone="neutral"
                  value={staffAssess?.tempLogs ?? "—"}
                  sub={
                    staffAssess ? `Recorded in last ${staffAssess.rangeDays}d` : "—"
                  }
                />
                <KpiTile
                  title="Temp fails"
                  icon="🚫"
                  tone={staffAssess && staffAssess.tempFails > 0 ? "danger" : "ok"}
                  value={staffAssess?.tempFails ?? "—"}
                  sub={staffAssess ? `Fails in last ${staffAssess.rangeDays}d` : "—"}
                />
                <KpiTile
                  title="Incidents"
                  icon="⚠️"
                  tone={staffAssess && staffAssess.incidents > 0 ? "warn" : "ok"}
                  value={staffAssess?.incidents ?? "—"}
                  sub={staffAssess ? `Logged in last ${staffAssess.rangeDays}d` : "—"}
                />
                <KpiTile
                  title="QC avg (30d)"
                  icon="📋"
                  tone="neutral"
                  value={
                    staffAssess
                      ? staffAssess.qcAvg30d != null
                        ? `${staffAssess.qcAvg30d}/5`
                        : "—"
                      : "—"
                  }
                  sub={
                    staffAssess ? `Based on ${staffAssess.qcCount30d} reviews` : "—"
                  }
                />
                <KpiTile
                  title="Staff"
                  icon="👤"
                  tone="neutral"
                  value={staffAssess?.staffLabel ?? "—"}
                  sub="Selected team member"
                />
              </div>

              <div className="mt-4 text-xs text-slate-500">
                Note: this uses initials across logs (done_by, staff_initials,
                created_by). If you switch to IDs everywhere later, this becomes
                rock-solid.
              </div>
            </div>
          </div>
        </div>
      )}

      {/* QC modal */}
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
                  Manager is your logged-in team member. Staff list is team members.
                </div>
              </div>

              <button
                onClick={() => setQcOpen(false)}
                className="rounded-md p-2 text-slate-500 hover:bg-slate-100"
              >
                ✕
              </button>
            </div>

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
                    onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                      setQcForm((f) => ({ ...f, staff_id: e.target.value }))
                    }
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
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setQcForm((f) => ({ ...f, reviewed_on: e.target.value }))
                    }
                    className="h-10 w-full rounded-xl border border-slate-300 bg-white/80 px-3 text-sm"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-xs text-slate-500">Score</label>
                  <select
                    value={qcForm.rating}
                    onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                      setQcForm((f) => ({ ...f, rating: Number(e.target.value) }))
                    }
                    className="h-10 w-full rounded-xl border border-slate-300 bg-white/80 px-3 text-sm"
                  >
                    {[1, 2, 3, 4, 5].map((n) => (
                      <option key={n} value={n}>
                        {n}/5
                      </option>
                    ))}
                  </select>
                </div>

                {/* Notes: big box, full width */}
                <div className="md:col-span-4">
                  <label className="mb-1 block text-xs text-slate-500">Notes</label>
                  <textarea
                    value={qcForm.notes}
                    onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                      setQcForm((f) => ({ ...f, notes: e.target.value }))
                    }
                    placeholder="Optional…"
                    rows={4}
                    className="w-full rounded-xl border border-slate-300 bg-white/80 px-3 py-2 text-sm leading-5 resize-y min-h-[96px]"
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
                        r.rating >= 4
                          ? "bg-emerald-100 text-emerald-800"
                          : r.rating === 3
                          ? "bg-amber-100 text-amber-800"
                          : "bg-red-100 text-red-800";

                      return (
                        <tr key={r.id} className="border-t border-slate-100 text-slate-800">
                          <td className="px-3 py-2 whitespace-nowrap">
                            {formatDDMMYYYY(r.reviewed_on)}
                          </td>
                          <td className="px-3 py-2 whitespace-nowrap">
                            {tmLabel(r.staff ?? { initials: null, name: "—" })}
                          </td>
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
                              {r.rating}/5
                            </span>
                          </td>
                          <td className="px-3 py-2 max-w-[18rem] truncate">
                            {r.notes ?? "—"}
                          </td>
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

            <TableFooterToggle
              total={qcReviews.length}
              showingAll={showAllQc}
              onToggle={() => setShowAllQc((v) => !v)}
            />
          </div>
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
    </>
  );
}

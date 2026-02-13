// src/app/(protected)/staff/page.tsx
"use client";

import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseBrowser";
import { getActiveOrgIdClient } from "@/lib/orgClient";
import { getActiveLocationIdClient } from "@/lib/locationClient";
import { logIncident } from "@/app/actions/incidents";

type TeamMember = {
  id: string;
  org_id: string;
  user_id: string | null;
  location_id: string | null;
  name: string;
  role: string | null;
  initials: string;
  streak_days: number | null;
  last_activity_on: string | null;
  training_areas: string[];
};

type StaffKpis = {
  tempsToday: number;
  temps7d: number;
  fails7d: number;

  cleaningToday: number;
  cleaning7d: number;

  incidentsToday: number;
  incidents7d: number;

  qcAvg30d: number | null;
  qcCount30d: number;

  trainingExpired: number;
  trainingDueSoon: number;

  streakDays: number;
  lastActivityOn: string | null;

  correctivesToday: number;
  correctives7d: number;
};

type TempCorrectiveRow = {
  id: string;
  time: string; // HH:mm
  area: string;
  item: string;
  fail_temp_c: number | null;
  action: string;
  recheck_temp_c: number | null;
  recheck_time: string | null;
  recheck_status: string | null;
};

type TempLogRow = {
  id: string;
  time: string | null;
  area: string | null;
  item: string | null;
  temp_c: number | null;
  status: string | null;
  staff: string | null;
};

type IncidentRow = {
  id: string;
  happened_on: string | null;
  created_at: string | null;
  type: string | null;
  details: string | null;
  immediate_action: string | null;
  preventive_action: string | null;
  created_by: string | null;
};

type TrainingRow = {
  id: string;
  type: string | null;
  awarded_on: string | null;
  expires_on: string | null;
  provider_name: string | null;
  course_key: string | null;
  notes: string | null;
  created_at: string | null;
};

type QcReviewRow = {
  id: string;
  reviewed_on: string;
  rating: number;
  notes: string | null;
  manager: { initials: string | null; name: string | null } | null;
};

const cls = (...p: Array<string | false | null | undefined>) =>
  p.filter(Boolean).join(" ");

function isoDate(d: Date) {
  return d.toISOString().slice(0, 10);
}

function safeDate(val: any): Date | null {
  if (!val) return null;
  const d = val instanceof Date ? val : new Date(val);
  if (Number.isNaN(d.getTime())) return null;
  return d;
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

export default function StaffDashboardPage() {
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const [orgId, setOrgId] = useState<string | null>(null);
  const [locationId, setLocationId] = useState<string | null>(null);

  const [me, setMe] = useState<TeamMember | null>(null);

  const [kpis, setKpis] = useState<StaffKpis>({
    tempsToday: 0,
    temps7d: 0,
    fails7d: 0,

    cleaningToday: 0,
    cleaning7d: 0,

    incidentsToday: 0,
    incidents7d: 0,

    qcAvg30d: null,
    qcCount30d: 0,

    trainingExpired: 0,
    trainingDueSoon: 0,

    streakDays: 0,
    lastActivityOn: null,

    correctivesToday: 0,
    correctives7d: 0,
  });

  const [todayTemps, setTodayTemps] = useState<TempLogRow[]>([]);
  const [incidents, setIncidents] = useState<IncidentRow[]>([]);
  const [trainings, setTrainings] = useState<TrainingRow[]>([]);
  const [qcReviews, setQcReviews] = useState<QcReviewRow[]>([]);

  const [correctivesTodayRows, setCorrectivesTodayRows] = useState<TempCorrectiveRow[]>([]);
  const [showAllCorrectives, setShowAllCorrectives] = useState(false);

  const [showAllTemps, setShowAllTemps] = useState(false);
  const [showAllIncidents, setShowAllIncidents] = useState(false);
  const [showAllTraining, setShowAllTraining] = useState(false);
  const [showAllQc, setShowAllQc] = useState(false);

  // ✅ Incident modal state
  const [incidentOpen, setIncidentOpen] = useState(false);
  const [incidentSaving, setIncidentSaving] = useState(false);
  const [incidentDate, setIncidentDate] = useState<string>(isoDate(new Date()));
  const [incidentType, setIncidentType] = useState<string>("General");
  const [incidentDetails, setIncidentDetails] = useState<string>("");
  const [incidentCorrective, setIncidentCorrective] = useState<string>("");
  const [incidentPreventive, setIncidentPreventive] = useState<string>("");
  const [incidentInitials, setIncidentInitials] = useState<string>("");

  const todayISO = useMemo(() => isoDate(new Date()), []);
  const sevenDaysAgoISO = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - 7);
    return isoDate(d);
  }, []);

  useEffect(() => {
    (async () => {
      const o = await getActiveOrgIdClient();
      const loc = await getActiveLocationIdClient();
      setOrgId(o ?? null);
      setLocationId(loc ?? null);
    })();
  }, []);

  useEffect(() => {
    if (!orgId) return;
    void loadEverything();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orgId, locationId]);

  // Auto-fill initials when opening incident modal
  useEffect(() => {
    if (!incidentOpen) return;
    if (incidentInitials.trim()) return;
    const ini = me?.initials?.trim().toUpperCase() ?? "";
    if (ini) setIncidentInitials(ini);
  }, [incidentOpen, incidentInitials, me]);

  async function loadEverything() {
    setLoading(true);
    setErr(null);

    try {
      const {
        data: { user },
        error: userErr,
      } = await supabase.auth.getUser();
      if (userErr || !user) throw new Error("Not logged in.");

      // 1) Find current team member record by user_id
      const { data: tm, error: tmErr } = await supabase
        .from("team_members")
        .select(
          "id,org_id,user_id,location_id,name,role,initials,streak_days,last_activity_on,training_areas"
        )
        .eq("org_id", orgId)
        .eq("user_id", user.id)
        .maybeSingle();

      if (tmErr) throw tmErr;
      if (!tm) {
        setMe(null);
        setTodayTemps([]);
        setIncidents([]);
        setTrainings([]);
        setQcReviews([]);
        setCorrectivesTodayRows([]);
        setKpis((k) => ({
          ...k,
          tempsToday: 0,
          temps7d: 0,
          fails7d: 0,
          cleaningToday: 0,
          cleaning7d: 0,
          incidentsToday: 0,
          incidents7d: 0,
          qcAvg30d: null,
          qcCount30d: 0,
          trainingExpired: 0,
          trainingDueSoon: 0,
          streakDays: 0,
          lastActivityOn: null,
          correctivesToday: 0,
          correctives7d: 0,
        }));
        throw new Error(
          "Your login is not linked to a team member yet (team_members.user_id is empty)."
        );
      }

      const meRow = tm as TeamMember;
      setMe(meRow);

      const effectiveLocationId = locationId ?? meRow.location_id ?? null;
      if (!effectiveLocationId) throw new Error("No location selected.");

      const myIni = meRow.initials?.trim().toUpperCase();
      if (!myIni) throw new Error("Your team member record needs initials.");

      // Date windows
      const startToday = new Date();
      startToday.setHours(0, 0, 0, 0);
      const endToday = new Date(startToday);
      endToday.setDate(endToday.getDate() + 1);

      const start7d = new Date();
      start7d.setDate(start7d.getDate() - 7);

      const start30d = new Date();
      start30d.setDate(start30d.getDate() - 29);
      start30d.setHours(0, 0, 0, 0);

      // Training KPI base (today)
      const trainingBase = new Date();
      trainingBase.setHours(0, 0, 0, 0);
      const thirtyDaysAhead = new Date(trainingBase);
      thirtyDaysAhead.setDate(thirtyDaysAhead.getDate() + 30);

      // 2) Pull “my” data using same tables as manager page.
      // Note: temps use OR filter so it works even if some rows didn’t set created_by.
      const [
        tempsTodayRes,
        temps7dRes,
        fails7dRes,
        todayTempLogsRes,

        cleaningTodayRes,
        cleaning7dRes,

        incidentsTodayRes,
        incidents7dRes,
        myIncidentsRes,

        trainingRecordsRes,

        qcRes,

        corrTodayRes,
        corr7dRes,
      ] = await Promise.all([
        supabase
          .from("food_temp_logs")
          .select("id", { count: "exact", head: true })
          .eq("org_id", orgId)
          .eq("location_id", effectiveLocationId)
          .eq("voided", false)
          .or(`created_by.eq.${user.id},staff_initials.eq.${myIni}`)
          .gte("at", startToday.toISOString())
          .lt("at", endToday.toISOString()),

        supabase
          .from("food_temp_logs")
          .select("id", { count: "exact", head: true })
          .eq("org_id", orgId)
          .eq("location_id", effectiveLocationId)
          .eq("voided", false)
          .or(`created_by.eq.${user.id},staff_initials.eq.${myIni}`)
          .gte("at", start7d.toISOString()),

        supabase
          .from("food_temp_logs")
          .select("id", { count: "exact", head: true })
          .eq("org_id", orgId)
          .eq("location_id", effectiveLocationId)
          .eq("voided", false)
          .eq("status", "fail")
          .eq("staff_initials", myIni)
          .gte("at", start7d.toISOString()),

        supabase
          .from("food_temp_logs")
          .select("id,at,area,note,temp_c,status,staff_initials,created_by,voided")
          .eq("org_id", orgId)
          .eq("location_id", effectiveLocationId)
          .eq("voided", false)
          .or(`created_by.eq.${user.id},staff_initials.eq.${myIni}`)
          .gte("at", startToday.toISOString())
          .lt("at", endToday.toISOString())
          .order("at", { ascending: false })
          .limit(200),

        supabase
          .from("cleaning_task_runs")
          .select("id", { count: "exact", head: true })
          .eq("org_id", orgId)
          .eq("location_id", effectiveLocationId)
          .eq("run_on", todayISO)
          .eq("done_by", myIni),

        supabase
          .from("cleaning_task_runs")
          .select("id", { count: "exact", head: true })
          .eq("org_id", orgId)
          .eq("location_id", effectiveLocationId)
          .eq("done_by", myIni)
          .gte("run_on", sevenDaysAgoISO)
          .lte("run_on", todayISO),

        supabase
          .from("incidents")
          .select("id", { count: "exact", head: true })
          .eq("org_id", orgId)
          .eq("location_id", effectiveLocationId)
          .eq("created_by", myIni)
          .eq("happened_on", todayISO),

        supabase
          .from("incidents")
          .select("id", { count: "exact", head: true })
          .eq("org_id", orgId)
          .eq("location_id", effectiveLocationId)
          .eq("created_by", myIni)
          .gte("happened_on", sevenDaysAgoISO)
          .lte("happened_on", todayISO),

        supabase
          .from("incidents")
          .select("id,happened_on,type,details,immediate_action,preventive_action,created_by,created_at")
          .eq("org_id", orgId)
          .eq("location_id", effectiveLocationId)
          .eq("created_by", myIni)
          .gte("happened_on", isoDate(start30d))
          .lte("happened_on", todayISO)
          .order("happened_on", { ascending: false })
          .order("created_at", { ascending: false })
          .limit(200),

        supabase
          .from("trainings")
          .select("id,type,awarded_on,expires_on,provider_name,course_key,notes,created_at,team_member_id")
          .eq("org_id", orgId)
          .eq("team_member_id", meRow.id)
          .order("expires_on", { ascending: true, nullsFirst: false })
          .order("awarded_on", { ascending: false, nullsFirst: false })
          .limit(500),

        supabase
          .from("staff_qc_reviews")
          .select(
            `
            id,
            reviewed_on,
            rating,
            notes,
            manager:team_members!staff_qc_reviews_manager_fkey(initials,name)
          `
          )
          .eq("org_id", orgId)
          .eq("location_id", effectiveLocationId)
          .eq("staff_id", meRow.id)
          .gte("reviewed_on", isoDate(start30d))
          .lte("reviewed_on", todayISO)
          .order("reviewed_on", { ascending: false })
          .order("created_at", { ascending: false })
          .limit(200),

        // Correctives today
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
              status
            )
          `
          )
          .eq("org_id", orgId)
          .eq("location_id", effectiveLocationId)
          .gte("created_at", startToday.toISOString())
          .lt("created_at", endToday.toISOString())
          .order("created_at", { ascending: false })
          .limit(500),

        // Correctives 7d (for KPI count)
        supabase
          .from("food_temp_corrective_actions")
          .select(
            `
            id,
            recorded_by,
            created_at,
            temp_log:food_temp_logs!food_temp_corrective_actions_temp_log_id_fkey(staff_initials)
          `
          )
          .eq("org_id", orgId)
          .eq("location_id", effectiveLocationId)
          .gte("created_at", start7d.toISOString())
          .order("created_at", { ascending: false })
          .limit(2000),
      ]);

      const firstErr =
        tempsTodayRes.error ||
        temps7dRes.error ||
        fails7dRes.error ||
        todayTempLogsRes.error ||
        cleaningTodayRes.error ||
        cleaning7dRes.error ||
        incidentsTodayRes.error ||
        incidents7dRes.error ||
        myIncidentsRes.error ||
        trainingRecordsRes.error ||
        qcRes.error ||
        corrTodayRes.error ||
        corr7dRes.error;

      if (firstErr) throw firstErr;

      // Temps table
      const tempRows: any[] = (todayTempLogsRes.data as any[]) ?? [];
      const mappedTemps: TempLogRow[] = tempRows.map((r) => {
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
      });
      setTodayTemps(mappedTemps);
      setShowAllTemps(false);

      // Incidents table
      const incRows: any[] = (myIncidentsRes.data as any[]) ?? [];
      const mappedIncidents: IncidentRow[] = incRows.map((r) => ({
        id: String(r.id),
        happened_on: r.happened_on ? String(r.happened_on) : null,
        created_at: r.created_at ? String(r.created_at) : null,
        type: r.type ?? null,
        details: r.details ?? null,
        immediate_action: r.immediate_action ?? null,
        preventive_action: r.preventive_action ?? null,
        created_by: r.created_by ? String(r.created_by) : null,
      }));
      setIncidents(mappedIncidents);
      setShowAllIncidents(false);

      // Training
      const trRows: any[] = (trainingRecordsRes.data as any[]) ?? [];
      const mappedTraining: TrainingRow[] = trRows.map((r) => ({
        id: String(r.id),
        type: r.type ?? null,
        awarded_on: r.awarded_on ? String(r.awarded_on) : null,
        expires_on: r.expires_on ? String(r.expires_on) : null,
        provider_name: r.provider_name ?? null,
        course_key: r.course_key ?? null,
        notes: r.notes ?? null,
        created_at: r.created_at ? String(r.created_at) : null,
      }));
      setTrainings(mappedTraining);
      setShowAllTraining(false);

      // Training KPI
      let trainingExpired = 0;
      let trainingDueSoon = 0;
      for (const t of mappedTraining) {
        if (!t.expires_on) continue;
        const exp = new Date(t.expires_on);
        exp.setHours(0, 0, 0, 0);
        if (Number.isNaN(exp.getTime())) continue;

        if (exp < trainingBase) trainingExpired++;
        else if (exp <= thirtyDaysAhead) trainingDueSoon++;
      }

      // QC KPI + list
      const qcRows: any[] = (qcRes.data as any[]) ?? [];
      const mappedQc: QcReviewRow[] = qcRows.map((r) => ({
        id: String(r.id),
        reviewed_on: String(r.reviewed_on),
        rating: Number(r.rating ?? 0),
        notes: r.notes ?? null,
        manager: r.manager
          ? { initials: r.manager.initials ?? null, name: r.manager.name ?? null }
          : null,
      }));
      setQcReviews(mappedQc);
      setShowAllQc(false);

      const qcCount30d = mappedQc.length;
      const qcAvg30d =
        qcCount30d > 0
          ? Math.round(
              (mappedQc.reduce((a, r) => a + Number(r.rating || 0), 0) / qcCount30d) * 10
            ) / 10
          : null;

      // Correctives filtering (match initials from recorded_by or temp_log staff_initials)
      const corrTodayRaw: any[] = (corrTodayRes.data as any[]) ?? [];
      const corrTodayMine = corrTodayRaw.filter((r) => {
        const recBy = (r.recorded_by ?? "").toString().trim().toUpperCase();
        const tlIni = (r.temp_log?.staff_initials ?? "")
          .toString()
          .trim()
          .toUpperCase();
        return (myIni && recBy === myIni) || (myIni && tlIni === myIni);
      });

      const corr7dRaw: any[] = (corr7dRes.data as any[]) ?? [];
      const corr7dMine = corr7dRaw.filter((r) => {
        const recBy = (r.recorded_by ?? "").toString().trim().toUpperCase();
        const tlIni = (r.temp_log?.staff_initials ?? "")
          .toString()
          .trim()
          .toUpperCase();
        return (myIni && recBy === myIni) || (myIni && tlIni === myIni);
      });

      const mappedCorrectives: TempCorrectiveRow[] = corrTodayMine.map((r) => {
        const created = r.created_at ? new Date(r.created_at) : null;
        const recheckAt = r.recheck_at ? new Date(r.recheck_at) : null;

        const tl = r.temp_log ?? null;
        const tlAt = tl?.at ? new Date(tl.at) : null;

        return {
          id: String(r.id),
          time:
            formatTimeHM(created) ??
            (tlAt ? formatTimeHM(tlAt) ?? "—" : "—"),
          area: (tl?.area ?? "—").toString(),
          item: (tl?.note ?? "—").toString(),
          fail_temp_c: tl?.temp_c != null ? Number(tl.temp_c) : null,
          action: (r.action ?? "—").toString(),
          recheck_temp_c:
            r.recheck_temp_c != null ? Number(r.recheck_temp_c) : null,
          recheck_time: recheckAt ? formatTimeHM(recheckAt) : null,
          recheck_status: r.recheck_status ? String(r.recheck_status) : null,
        };
      });

      setCorrectivesTodayRows(mappedCorrectives);
      setShowAllCorrectives(false);

      // Final KPIs
      setKpis({
        tempsToday: tempsTodayRes.count ?? 0,
        temps7d: temps7dRes.count ?? 0,
        fails7d: fails7dRes.count ?? 0,

        cleaningToday: cleaningTodayRes.count ?? 0,
        cleaning7d: cleaning7dRes.count ?? 0,

        incidentsToday: incidentsTodayRes.count ?? 0,
        incidents7d: incidents7dRes.count ?? 0,

        qcAvg30d,
        qcCount30d,

        trainingExpired,
        trainingDueSoon,

        streakDays: Number(meRow.streak_days ?? 0),
        lastActivityOn: meRow.last_activity_on ?? null,

        correctivesToday: corrTodayMine.length,
        correctives7d: corr7dMine.length,
      });
    } catch (e: any) {
      console.error(e);
      setErr(e?.message ?? "Failed to load staff dashboard.");
    } finally {
      setLoading(false);
    }
  }

  async function submitIncident() {
    if (!orgId) return;

    const initials = incidentInitials.trim().toUpperCase();
    if (!initials) return alert("Enter initials.");
    if (!incidentType.trim()) return alert("Select a type.");
    if (!incidentDetails.trim()) return alert("Details are required.");

    const effectiveLocationId = locationId ?? me?.location_id ?? null;
    if (!effectiveLocationId) return alert("No location selected.");

    setIncidentSaving(true);
    try {
      const res = await logIncident({
        happened_on: incidentDate,
        location_id: effectiveLocationId,
        type: incidentType.trim(),
        details: incidentDetails.trim(),
        immediate_action: incidentCorrective.trim() || null,
        preventive_action: incidentPreventive.trim() || null,
        created_by: initials,
      });

      if (!res.ok) throw new Error(res.message);

      setIncidentDetails("");
      setIncidentCorrective("");
      setIncidentPreventive("");
      setIncidentOpen(false);

      await loadEverything();
    } catch (e: any) {
      console.error(e);
      alert(e?.message ?? "Failed to log incident.");
    } finally {
      setIncidentSaving(false);
    }
  }

  const correctivesToRender = showAllCorrectives
    ? correctivesTodayRows
    : correctivesTodayRows.slice(0, 10);

  const tempsToRender = showAllTemps ? todayTemps : todayTemps.slice(0, 10);
  const incidentsToRender = showAllIncidents ? incidents : incidents.slice(0, 10);
  const trainingToRender = showAllTraining ? trainings : trainings.slice(0, 10);
  const qcToRender = showAllQc ? qcReviews : qcReviews.slice(0, 10);

  const tempsTone: "ok" | "warn" | "danger" =
    kpis.tempsToday === 0 ? "warn" : kpis.fails7d > 0 ? "danger" : "ok";

  const trainingTone: "ok" | "warn" | "danger" =
    kpis.trainingExpired > 0 ? "danger" : kpis.trainingDueSoon > 0 ? "warn" : "ok";

  return (
    <div className="py-3 w-full px-3 sm:px-4 md:mx-auto md:max-w-[1100px]">
      <div className="text-center">
        <div className="text-[11px] font-extrabold uppercase tracking-[0.22em] text-slate-400">
          Staff dashboard
        </div>
        <h1 className="mt-1 text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
          {me?.name ?? "Your stats"}
        </h1>
        {me?.role ? (
          <div className="mt-1 text-xs font-semibold text-slate-500">{me.role}</div>
        ) : null}
      </div>

      {err && (
        <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-800">
          {err}
        </div>
      )}

      {/* KPIs */}
      <section className="mt-4 rounded-3xl border border-white/40 bg-white/80 p-3 sm:p-4 shadow-lg shadow-slate-900/5 backdrop-blur">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-2xl border border-slate-200 bg-white/90 p-4 shadow-sm">
            <div className="text-[11px] font-extrabold uppercase tracking-[0.22em] text-slate-500">
              Streak
            </div>
            <div className="mt-2 text-3xl font-extrabold text-slate-900">
              {kpis.streakDays}
            </div>
            <div className="mt-2 text-[11px] font-medium text-slate-600">Days</div>
          </div>

          <div
            className={cls(
              "rounded-2xl border bg-white/90 p-4 shadow-sm",
              tempsTone === "danger"
                ? "border-red-200"
                : tempsTone === "warn"
                ? "border-amber-200"
                : "border-emerald-200"
            )}
          >
            <div className="text-[11px] font-extrabold uppercase tracking-[0.22em] text-slate-500">
              Temps
            </div>
            <div className="mt-2 text-3xl font-extrabold text-slate-900">
              {kpis.tempsToday}
            </div>
            <div className="mt-2 text-[11px] font-medium text-slate-600">
              7d: <span className="font-semibold">{kpis.temps7d}</span> · fails 7d:{" "}
              <span className={cls("font-semibold", kpis.fails7d > 0 && "text-red-700")}>
                {kpis.fails7d}
              </span>
            </div>
            <div className="mt-1 text-[11px] font-medium text-slate-600">
              Correctives today:{" "}
              <span className="font-semibold">{kpis.correctivesToday}</span> · 7d:{" "}
              <span className="font-semibold">{kpis.correctives7d}</span>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white/90 p-4 shadow-sm">
            <div className="text-[11px] font-extrabold uppercase tracking-[0.22em] text-slate-500">
              Cleaning
            </div>
            <div className="mt-2 text-3xl font-extrabold text-slate-900">
              {kpis.cleaningToday}
            </div>
            <div className="mt-2 text-[11px] font-medium text-slate-600">
              7d: <span className="font-semibold">{kpis.cleaning7d}</span> · Based on initials match
            </div>
          </div>

          <div
            className={cls(
              "rounded-2xl border bg-white/90 p-4 shadow-sm",
              trainingTone === "danger"
                ? "border-red-200"
                : trainingTone === "warn"
                ? "border-amber-200"
                : "border-emerald-200"
            )}
          >
            <div className="text-[11px] font-extrabold uppercase tracking-[0.22em] text-slate-500">
              Training
            </div>
            <div className="mt-2 text-xl font-extrabold text-slate-900">
              {kpis.trainingExpired > 0 ? `${kpis.trainingExpired} expired` : "Up to date"}
            </div>
            <div className="mt-2 text-[11px] font-medium text-slate-600">
              Due in 30d: <span className="font-semibold">{kpis.trainingDueSoon}</span>
            </div>
            <div className="mt-1 text-[11px] font-medium text-slate-600">
              QC avg (30d):{" "}
              <span className="font-semibold">
                {kpis.qcAvg30d != null ? `${kpis.qcAvg30d}/5` : "—"}
              </span>{" "}
              <span className="text-slate-400">({kpis.qcCount30d})</span>
            </div>
          </div>
        </div>

        <div className="mt-3 text-center text-[11px] text-slate-500">
          Last activity: <span className="font-semibold">{kpis.lastActivityOn ?? "—"}</span>
        </div>
      </section>

      {/* Training areas */}
      <section className="mt-4 rounded-3xl border border-white/40 bg-white/80 p-4 shadow-md shadow-slate-900/5 backdrop-blur">
        <div className="mb-3">
          <div className="text-[11px] font-extrabold uppercase tracking-[0.22em] text-slate-400">
            Training areas
          </div>
          <div className="mt-0.5 text-sm font-semibold text-slate-900">
            What you’re assigned to
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {(me?.training_areas ?? []).length === 0 ? (
            <div className="text-sm text-slate-600">No training areas set.</div>
          ) : (
            me!.training_areas.map((a) => (
              <span
                key={a}
                className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-700"
              >
                {a}
              </span>
            ))
          )}
        </div>
      </section>

      {/* Today temps */}
      <section className="mt-4 rounded-3xl border border-white/40 bg-white/80 p-4 shadow-md shadow-slate-900/5 backdrop-blur">
        <div className="mb-3 flex items-center justify-between gap-3">
          <div>
            <div className="text-[11px] font-extrabold uppercase tracking-[0.22em] text-slate-400">
              Temperature logs
            </div>
            <div className="mt-0.5 text-sm font-semibold text-slate-900">
              Your logs (today)
            </div>
          </div>

          {todayTemps.length > 10 ? (
            <button
              type="button"
              onClick={() => setShowAllTemps((v) => !v)}
              className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
            >
              {showAllTemps ? "Show less" : "Show all"}
            </button>
          ) : null}
        </div>

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
                    No temperature logs today.
                  </td>
                </tr>
              ) : (
                tempsToRender.map((r) => (
                  <tr key={r.id} className="border-t border-slate-100 text-slate-800">
                    <td className="px-3 py-2 whitespace-nowrap">{r.time ?? "—"}</td>
                    <td className="px-3 py-2">{r.area ?? "—"}</td>
                    <td className="px-3 py-2">{r.item ?? "—"}</td>
                    <td className="px-3 py-2 whitespace-nowrap">
                      {r.temp_c != null ? `${r.temp_c}°C` : "—"}
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap">
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
      </section>

      {/* Correctives */}
      <section className="mt-4 rounded-3xl border border-white/40 bg-white/80 p-4 shadow-md shadow-slate-900/5 backdrop-blur">
        <div className="mb-3 flex items-center justify-between gap-3">
          <div>
            <div className="text-[11px] font-extrabold uppercase tracking-[0.22em] text-slate-400">
              Temperature corrective actions
            </div>
            <div className="mt-0.5 text-sm font-semibold text-slate-900">
              Your corrective actions (today)
            </div>
          </div>

          {correctivesTodayRows.length > 10 ? (
            <button
              type="button"
              onClick={() => setShowAllCorrectives((v) => !v)}
              className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
            >
              {showAllCorrectives ? "Show less" : "Show all"}
            </button>
          ) : null}
        </div>

        <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white/90">
          <table className="min-w-full text-xs">
            <thead className="bg-slate-50">
              <tr className="text-left text-slate-500">
                <th className="px-3 py-2">Time</th>
                <th className="px-3 py-2">Area</th>
                <th className="px-3 py-2">Item</th>
                <th className="px-3 py-2">Fail temp</th>
                <th className="px-3 py-2">Corrective action</th>
                <th className="px-3 py-2">Re-check</th>
                <th className="px-3 py-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {correctivesToRender.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-3 py-4 text-center text-slate-500">
                    No temperature corrective actions logged today.
                  </td>
                </tr>
              ) : (
                correctivesToRender.map((r) => (
                  <tr key={r.id} className="border-t border-slate-100 text-slate-800">
                    <td className="px-3 py-2 whitespace-nowrap">{r.time}</td>
                    <td className="px-3 py-2">{r.area}</td>
                    <td className="px-3 py-2">{r.item}</td>
                    <td className="px-3 py-2 whitespace-nowrap">
                      {r.fail_temp_c != null ? `${r.fail_temp_c}°C` : "—"}
                    </td>
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
                            r.recheck_status === "pass"
                              ? "bg-emerald-100 text-emerald-800"
                              : "bg-red-100 text-red-800"
                          )}
                        >
                          {r.recheck_status}
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
      </section>

      {/* My incidents */}
      <section className="mt-4 rounded-3xl border border-white/40 bg-white/80 p-4 shadow-md shadow-slate-900/5 backdrop-blur">
        <div className="mb-3 flex items-center justify-between gap-3">
          <div>
            <div className="text-[11px] font-extrabold uppercase tracking-[0.22em] text-slate-400">
              Incidents
            </div>
            <div className="mt-0.5 text-sm font-semibold text-slate-900">
              Your incidents (last 30 days)
            </div>
          </div>

          {incidents.length > 10 ? (
            <button
              type="button"
              onClick={() => setShowAllIncidents((v) => !v)}
              className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
            >
              {showAllIncidents ? "Show less" : "Show all"}
            </button>
          ) : null}
        </div>

        <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white/90">
          <table className="min-w-full text-xs">
            <thead className="bg-slate-50">
              <tr className="text-left text-slate-500">
                <th className="px-3 py-2">Date</th>
                <th className="px-3 py-2">Time</th>
                <th className="px-3 py-2">Type</th>
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
                    <td className="px-3 py-2 whitespace-nowrap">{formatDDMMYYYY(r.happened_on)}</td>
                    <td className="px-3 py-2 whitespace-nowrap">
                      {r.created_at
                        ? new Date(r.created_at).toLocaleTimeString("en-GB", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })
                        : "—"}
                    </td>
                    <td className="px-3 py-2 font-semibold whitespace-nowrap">{r.type ?? "Incident"}</td>
                    <td className="px-3 py-2 max-w-[22rem] truncate">{r.details ?? "—"}</td>
                    <td className="px-3 py-2 max-w-[22rem] truncate">{r.immediate_action ?? "—"}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Training records */}
      <section className="mt-4 rounded-3xl border border-white/40 bg-white/80 p-4 shadow-md shadow-slate-900/5 backdrop-blur">
        <div className="mb-3 flex items-center justify-between gap-3">
          <div>
            <div className="text-[11px] font-extrabold uppercase tracking-[0.22em] text-slate-400">
              Training records
            </div>
            <div className="mt-0.5 text-sm font-semibold text-slate-900">
              Your certificates & renewals
            </div>
          </div>

          {trainings.length > 10 ? (
            <button
              type="button"
              onClick={() => setShowAllTraining((v) => !v)}
              className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
            >
              {showAllTraining ? "Show less" : "Show all"}
            </button>
          ) : null}
        </div>

        <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white/90">
          <table className="min-w-full text-xs">
            <thead className="bg-slate-50">
              <tr className="text-left text-slate-500">
                <th className="px-3 py-2">Type</th>
                <th className="px-3 py-2">Awarded</th>
                <th className="px-3 py-2">Expires</th>
                <th className="px-3 py-2">Provider</th>
                <th className="px-3 py-2">Course</th>
                <th className="px-3 py-2">Notes</th>
              </tr>
            </thead>
            <tbody>
              {trainingToRender.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-3 py-4 text-center text-slate-500">
                    No training records found.
                  </td>
                </tr>
              ) : (
                trainingToRender.map((t) => (
                  <tr key={t.id} className="border-t border-slate-100 text-slate-800">
                    <td className="px-3 py-2 font-semibold whitespace-nowrap">{t.type ?? "—"}</td>
                    <td className="px-3 py-2 whitespace-nowrap">{formatDDMMYYYY(t.awarded_on)}</td>
                    <td className="px-3 py-2 whitespace-nowrap">{formatDDMMYYYY(t.expires_on)}</td>
                    <td className="px-3 py-2 whitespace-nowrap">{t.provider_name ?? "—"}</td>
                    <td className="px-3 py-2 max-w-[14rem] truncate">{t.course_key ?? "—"}</td>
                    <td className="px-3 py-2 max-w-[18rem] truncate">{t.notes ?? "—"}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* QC reviews */}
      <section className="mt-4 rounded-3xl border border-white/40 bg-white/80 p-4 shadow-md shadow-slate-900/5 backdrop-blur">
        <div className="mb-3 flex items-center justify-between gap-3">
          <div>
            <div className="text-[11px] font-extrabold uppercase tracking-[0.22em] text-slate-400">
              QC reviews
            </div>
            <div className="mt-0.5 text-sm font-semibold text-slate-900">
              Reviews about you (last 30 days)
            </div>
          </div>

          {qcReviews.length > 10 ? (
            <button
              type="button"
              onClick={() => setShowAllQc((v) => !v)}
              className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
            >
              {showAllQc ? "Show less" : "Show all"}
            </button>
          ) : null}
        </div>

        <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white/90">
          <table className="min-w-full text-xs">
            <thead className="bg-slate-50">
              <tr className="text-left text-slate-500">
                <th className="px-3 py-2">Date</th>
                <th className="px-3 py-2">Manager</th>
                <th className="px-3 py-2">Score</th>
                <th className="px-3 py-2">Notes</th>
              </tr>
            </thead>
            <tbody>
              {qcToRender.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-3 py-4 text-center text-slate-500">
                    No QC reviews yet.
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

                  const mgrIni = r.manager?.initials?.toUpperCase() ?? "—";
                  const mgrName = r.manager?.name ?? "";
                  const mgrLabel = mgrName ? `${mgrIni} · ${mgrName}` : mgrIni;

                  return (
                    <tr key={r.id} className="border-t border-slate-100 text-slate-800">
                      <td className="px-3 py-2 whitespace-nowrap">{formatDDMMYYYY(r.reviewed_on)}</td>
                      <td className="px-3 py-2 whitespace-nowrap">{mgrLabel}</td>
                      <td className="px-3 py-2">
                        <span className={cls("inline-flex rounded-full px-2 py-[1px] text-[10px] font-extrabold uppercase", pill)}>
                          {r.rating}/5
                        </span>
                      </td>
                      <td className="px-3 py-2 max-w-[28rem] truncate">{r.notes ?? "—"}</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Actions */}
      <div className="mt-4 flex items-center justify-end gap-2">
        <button
          type="button"
          onClick={() => {
            setIncidentDate(isoDate(new Date()));
            setIncidentType("General");
            setIncidentDetails("");
            setIncidentCorrective("");
            setIncidentPreventive("");
            setIncidentOpen(true);
          }}
          disabled={loading || !orgId}
          className={cls(
            "rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50",
            (loading || !orgId) && "opacity-60"
          )}
        >
          Log incident
        </button>

        <button
          type="button"
          onClick={loadEverything}
          disabled={loading || !orgId}
          className={cls(
            "rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700",
            (loading || !orgId) && "opacity-60"
          )}
        >
          {loading ? "Refreshing…" : "Refresh"}
        </button>
      </div>

      {/* Incident modal */}
      {incidentOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/30 overflow-y-auto overscroll-contain p-3 sm:p-4"
          onClick={() => setIncidentOpen(false)}
        >
          <div
            className="mx-auto my-6 w-full max-w-xl rounded-2xl border border-slate-200 bg-white/90 p-4 text-slate-900 shadow-lg backdrop-blur"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-3 flex items-center justify-between">
              <div>
                <div className="text-base font-semibold">Log incident</div>
                <div className="mt-0.5 text-xs text-slate-500">
                  This creates an entry in the Incident log.
                </div>
              </div>
              <button
                onClick={() => setIncidentOpen(false)}
                className="rounded-md p-2 text-slate-500 hover:bg-slate-100"
                aria-label="Close"
              >
                ✕
              </button>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs text-slate-500">Date</label>
                <input
                  type="date"
                  value={incidentDate}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setIncidentDate(e.target.value)
                  }
                  className="h-10 w-full rounded-xl border border-slate-300 bg-white/80 px-3 text-sm"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs text-slate-500">Initials</label>
                <input
                  value={incidentInitials}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setIncidentInitials(e.target.value.toUpperCase())
                  }
                  placeholder="WS"
                  className="h-10 w-full rounded-xl border border-slate-300 bg-white/80 px-3 text-sm"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="mb-1 block text-xs text-slate-500">Type</label>
                <select
                  value={incidentType}
                  onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                    setIncidentType(e.target.value)
                  }
                  className="h-10 w-full rounded-xl border border-slate-300 bg-white/80 px-3 text-sm"
                >
                  <option value="General">General</option>
                  <option value="Cleaning issue">Cleaning issue</option>
                  <option value="Equipment failure">Equipment failure</option>
                  <option value="Contamination risk">Contamination risk</option>
                  <option value="Pest / contamination">Pest / contamination</option>
                  <option value="Injury / accident">Injury / accident</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div className="sm:col-span-2">
                <label className="mb-1 block text-xs text-slate-500">Details</label>
                <textarea
                  value={incidentDetails}
                  onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                    setIncidentDetails(e.target.value)
                  }
                  placeholder="What happened?"
                  className="min-h-[90px] w-full rounded-xl border border-slate-300 bg-white/80 px-3 py-2 text-sm"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="mb-1 block text-xs text-slate-500">
                  Corrective action (recommended)
                </label>
                <textarea
                  value={incidentCorrective}
                  onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                    setIncidentCorrective(e.target.value)
                  }
                  placeholder="What did you do to fix it?"
                  className="min-h-[70px] w-full rounded-xl border border-slate-300 bg-white/80 px-3 py-2 text-sm"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="mb-1 block text-xs text-slate-500">
                  Preventive action (optional)
                </label>
                <textarea
                  value={incidentPreventive}
                  onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                    setIncidentPreventive(e.target.value)
                  }
                  placeholder="What will stop it happening again?"
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
                onClick={submitIncident}
                disabled={incidentSaving}
                className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700 disabled:opacity-60"
              >
                {incidentSaving ? "Saving…" : "Save incident"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

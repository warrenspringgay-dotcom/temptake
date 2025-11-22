// src/components/FoodTempLogger.tsx
"use client";

import React, { useEffect, useMemo, useState } from "react";

import { supabase } from "@/lib/supabaseBrowser";
import { getActiveOrgIdClient } from "@/lib/orgClient";
import { getActiveLocationIdClient } from "@/lib/locationClient";
import {
  TARGET_PRESETS,
  TARGET_BY_KEY,
  type TargetPreset,
} from "@/lib/temp-constants";
import { CLEANING_CATEGORIES } from "@/components/ManageCleaningTasksModal";

/* =============== Types =============== */
type CanonRow = {
  id: string;
  date: string | null; // yyyy-mm-dd
  time: string | null; // HH:mm
  staff_initials: string | null;
  location: string | null;
  item: string | null;
  target_key: string | null;
  temp_c: number | null;
  status: "pass" | "fail" | null;
};

type Props = {
  initials?: string[];
  locations?: string[]; // no longer used, kept only so callers don't break
};

/* leaderboard / employee of month */
type EmployeeOfMonth = {
  display_name: string | null;
  points: number | null;
  temp_logs_count: number | null;
  cleaning_count: number | null;
};

/* cleaning rota types */
type Frequency = "daily" | "weekly" | "monthly";
type CleanTask = {
  id: string;
  org_id: string;
  area: string | null;
  task: string;
  category: string | null;
  frequency: Frequency;
  weekday: number | null;
  month_day: number | null;
};
type CleanRun = {
  task_id: string;
  run_on: string;
  done_by: string | null;
};

/* =============== Small helpers =============== */

function sameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function formatPrettyDate(d: Date) {
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

  const weekday = WEEKDAYS[d.getDay()];
  const day = d.getDate();
  const month = MONTHS[d.getMonth()];
  const year = d.getFullYear();

  // No comma – always: Friday 14 November 2025
  return `${weekday} ${day} ${month} ${year}`;
}

const LS_LAST_INITIALS = "tt_last_initials";

const cls = (...parts: Array<string | false | undefined>) =>
  parts.filter(Boolean).join(" ");

const firstLetter = (s: string | null | undefined) =>
  (s?.trim()?.charAt(0) || "").toUpperCase();

function toISODate(val: any): string | null {
  if (!val) return null;
  const d = new Date(val);
  if (isNaN(d.getTime())) return null;
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function toTimeHM(val: any): string | null {
  if (!val) return null;
  const d = new Date(val);
  if (isNaN(d.getTime())) return null;
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return `${hh}:${mm}`;
}

function formatDDMMYYYY(iso: string | null) {
  if (!iso) return "—";
  const [y, m, d] = iso.split("-");
  if (!y || !m || !d) return iso!;
  return `${d}/${m}/${y}`;
}

function inferStatus(
  temp: number | null,
  preset?: TargetPreset
): "pass" | "fail" | null {
  if (temp == null || !preset) return null;
  const { minC, maxC } = preset;
  if (minC != null && temp < minC) return "fail";
  if (maxC != null && temp > maxC) return "fail";
  return "pass";
}

function normalizeRowsFromFood(data: any[]): CanonRow[] {
  return data.map((r) => {
    const temp =
      typeof r.temp_c === "number"
        ? r.temp_c
        : r.temp_c != null
        ? Number(r.temp_c)
        : null;

    const rawAt = r.at ?? r.created_at ?? null;

    return {
      id: String(r.id ?? crypto.randomUUID()),
      date: toISODate(rawAt),
      time: toTimeHM(rawAt),
      staff_initials:
        (r.staff_initials ?? r.initials ?? null)?.toString() ?? null,
      location: (r.area ?? r.location ?? null)?.toString() ?? null,
      item: (r.note ?? r.item ?? null)?.toString() ?? null,
      target_key: r.target_key != null ? String(r.target_key) : null,
      temp_c: temp,
      status: (r.status as any) ?? null,
    };
  });
}

/* cleaning rota helpers */
const isoToday = () => new Date().toISOString().slice(0, 10);
const nice = (yyyy_mm_dd: string) =>
  new Date(yyyy_mm_dd).toLocaleDateString(undefined, {
    weekday: "short",
    day: "2-digit",
    month: "short",
  });
const getDow1to7 = (ymd: string) => {
  const date = new Date(ymd);
  return ((date.getDay() + 6) % 7) + 1; // Mon=1..Sun=7
};
const getDom = (ymd: string) => new Date(ymd).getDate();

function isDueOn(t: CleanTask, ymd: string) {
  switch (t.frequency) {
    case "daily":
      return true;
    case "weekly":
      return t.weekday === getDow1to7(ymd);
    case "monthly":
      return t.month_day === getDom(ymd);
    default:
      return false;
  }
}

function CategoryPill({
  title,
  total,
  open,
  onClick,
}: {
  title: string;
  total: number;
  open: number;
  onClick: () => void;
}) {
  const hasOpen = open > 0;
  const color = hasOpen
    ? "bg-red-50/90 text-red-700 border-red-200"
    : "bg-emerald-50/90 text-emerald-700 border-emerald-200";

  return (
    <button
      onClick={onClick}
      className={cls(
        "flex min-h-[64px] flex-col justify-between rounded-xl border px-3 py-2 text-left text-sm shadow-sm transition",
        "backdrop-blur-sm",
        "hover:brightness-105",
        color
      )}
    >
      <div className="text-[13px] leading-tight">{title}</div>
      <div className="mt-1 text-lg font-semibold leading-none">
        {total}
        <span className="ml-1 text-[11px] opacity-75">({open} open)</span>
      </div>
    </button>
  );
}

function Pill({ done, onClick }: { done: boolean; onClick: () => void }) {
  return done ? (
    <button
      className="shrink-0 rounded-full bg-emerald-500/10 px-2 py-0.5 text-xs font-medium text-emerald-800 hover:bg-emerald-500/20"
      onClick={onClick}
      title="Mark incomplete"
    >
      Complete
    </button>
  ) : (
    <button
      className="shrink-0 rounded-full bg-red-500/10 px-2 py-0.5 text-xs font-medium text-red-700 hover:bg-red-500/20"
      onClick={onClick}
      title="Mark complete"
    >
      Incomplete
    </button>
  );
}

/* =============== Component =============== */
export default function FoodTempLogger({
  initials: initialsSeed = [],
}: Props) {
  // DATA
  const [rows, setRows] = useState<CanonRow[]>([]);
  const [initials, setInitials] = useState<string[]>(() =>
    Array.from(new Set([...initialsSeed]))
  );
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  // Employee of the month (from leaderboard view)
  const [employeeOfMonth, setEmployeeOfMonth] =
    useState<EmployeeOfMonth | null>(null);

  // KPIs (training & allergen due/overdue)
  const [kpi, setKpi] = useState({
    trainingDueSoon: 0,
    trainingOver: 0,
    allergenDueSoon: 0,
    allergenOver: 0,
  });

  // Cleaning rota (today)
  const [tasks, setTasks] = useState<CleanTask[]>([]);
  const [runs, setRuns] = useState<CleanRun[]>([]);
  const runsKey = useMemo(() => {
    const m = new Map<string, CleanRun>();
    for (const r of runs) m.set(`${r.task_id}|${r.run_on}`, r);
    return m;
  }, [runs]);

  // initials selector for runs
  const [ini, setIni] = useState<string>("");

  // Completion modal (single + “complete all”)
  const [confirm, setConfirm] = useState<{
    ids: string[];
    run_on: string;
  } | null>(null);
  const [confirmLabel, setConfirmLabel] =
    useState<string>("Confirm completion");
  const [confirmInitials, setConfirmInitials] = useState("");

  // Logs: show-all toggle (10 latest by default)
  const [showAllLogs, setShowAllLogs] = useState(false);

  // Header date – always today now
  const headerDateObj = new Date();
  const isTodayHeader = sameDay(headerDateObj, new Date());

  /* prime initials from localStorage */
  useEffect(() => {
    try {
      const lsIni = localStorage.getItem(LS_LAST_INITIALS) || "";
      if (lsIni) {
        setIni(lsIni.toUpperCase());
        setInitials((prev) =>
          Array.from(new Set([lsIni.toUpperCase(), ...prev]))
        );
      }
    } catch {
      // ignore
    }
  }, []);

  /* initials list (org-scoped) */
  useEffect(() => {
    (async () => {
      try {
        const orgId = await getActiveOrgIdClient();
        if (!orgId) return;

        const { data: tm } = await supabase
          .from("team_members")
          .select("initials,name,email")
          .eq("org_id", orgId)
          .order("initials", { ascending: true });

        const fromDb =
          (tm ?? [])
            .map(
              (r: any) =>
                r.initials?.toString().toUpperCase() ||
                firstLetter(r.name) ||
                firstLetter(r.email)
            )
            .filter(Boolean) || [];

        const merged = Array.from(new Set([...initialsSeed, ...fromDb]));
        if (merged.length) setInitials(merged);
      } catch {
        // ignore
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialsSeed]);

  /* KPI fetch (org-level) */
  useEffect(() => {
    (async () => {
      try {
        const orgId = await getActiveOrgIdClient();
        if (!orgId) return;

        const soon = new Date();
        soon.setDate(soon.getDate() + 14);
        const todayD = new Date();

        let trainingDueSoon = 0;
        let trainingOver = 0;
        let allergenDueSoon = 0;
        let allergenOver = 0;

        try {
          const { data } = await supabase
            .from("team_members")
            .select("training_expires_at,training_expiry,expires_at")
            .eq("org_id", orgId);

          (data ?? []).forEach((r: any) => {
            const raw =
              r.training_expires_at ??
              r.training_expiry ??
              r.expires_at ??
              null;
            if (!raw) return;
            const d = new Date(raw);
            if (isNaN(d.getTime())) return;
            if (d < todayD) trainingOver++;
            else if (d <= soon) trainingDueSoon++;
          });
        } catch {}

        try {
          const { data } = await supabase
            .from("allergen_review")
            .select("last_reviewed,interval_days")
            .eq("org_id", orgId);

          (data ?? []).forEach((r: any) => {
            const last = r.last_reviewed ? new Date(r.last_reviewed) : null;
            const interval = Number(r.interval_days ?? 0);
            if (!last || !Number.isFinite(interval)) return;
            const due = new Date(last);
            due.setDate(due.getDate() + interval);
            if (due < todayD) allergenOver++;
            else if (due <= soon) allergenDueSoon++;
          });
        } catch {}

        setKpi({ trainingDueSoon, trainingOver, allergenDueSoon, allergenOver });
      } catch {
        // ignore
      }
    })();
  }, []);

  /* Employee of the month fetch (leaderboard) */
  useEffect(() => {
    (async () => {
      try {
        const orgId = await getActiveOrgIdClient();
        if (!orgId) return;

        const { data, error } = await supabase
          .from("leaderboard")
          .select("display_name, points, temp_logs_count, cleaning_count")
          .eq("org_id", orgId)
          .order("points", { ascending: false })
          .limit(1);

        if (error) throw error;
        setEmployeeOfMonth(data?.[0] ?? null);
      } catch {
        setEmployeeOfMonth(null);
      }
    })();
  }, []);

  /* rows (org + location scoped) */
  async function loadRows() {
    setLoading(true);
    setErr(null);
    try {
      const orgId = await getActiveOrgIdClient();
      if (!orgId) {
        setRows([]);
        setLoading(false);
        return;
      }

      const locationId = await getActiveLocationIdClient();

      let query = supabase
        .from("food_temp_logs")
        .select("*")
        .eq("org_id", orgId);

      if (locationId) {
        query = query.eq("location_id", locationId);
      }

      const { data, error } = await query
        .order("at", { ascending: false })
        .limit(300);

      if (error) throw error;
      setRows(normalizeRowsFromFood(data ?? []));
    } catch (e: any) {
      setErr(e?.message || "Failed to fetch logs.");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    loadRows();
  }, []);

  async function refreshRows() {
    await loadRows();
  }

  /* Cleaning rota: load today's due + runs (org + location scoped) */
  async function loadRotaToday() {
    try {
      const org_id = await getActiveOrgIdClient();
      const locationId = await getActiveLocationIdClient();
      if (!org_id || !locationId) return;

      const todayISO = isoToday();

      const { data: tData } = await supabase
        .from("cleaning_tasks")
        .select(
          "id, org_id, location_id, area, task, category, frequency, weekday, month_day"
        )
        .eq("org_id", org_id)
        .eq("location_id", locationId);

      const all: CleanTask[] =
        (tData ?? []).map((r: any) => ({
          id: String(r.id),
          org_id: String(r.org_id),
          area: r.area ?? null,
          task: r.task ?? r.name ?? "",
          category: r.category ?? null,
          frequency: (r.frequency ?? "daily") as Frequency,
          weekday: r.weekday ? Number(r.weekday) : null,
          month_day: r.month_day ? Number(r.month_day) : null,
        })) || [];

      setTasks(all);

      const { data: rData } = await supabase
        .from("cleaning_task_runs")
        .select("task_id,run_on,done_by,location_id")
        .eq("org_id", org_id)
        .eq("location_id", locationId)
        .eq("run_on", todayISO);

      setRuns(
        (rData ?? []).map((r: any) => ({
          task_id: String(r.task_id),
          run_on: r.run_on as string,
          done_by: r.done_by ?? null,
        }))
      );
    } catch {
      // ignore
    }
  }
  useEffect(() => {
    loadRotaToday();
  }, []);

  const todayISOKey = isoToday();
  const dueTodayAll = useMemo(
    () => tasks.filter((t) => isDueOn(t, todayISOKey)),
    [tasks, todayISOKey]
  );
  const dueDaily = useMemo(
    () => dueTodayAll.filter((t) => t.frequency === "daily"),
    [dueTodayAll]
  );
  const dueNonDaily = useMemo(
    () => dueTodayAll.filter((t) => t.frequency !== "daily"),
    [dueTodayAll]
  );
  const doneCount = useMemo(
    () =>
      dueTodayAll.filter((t) => runsKey.has(`${t.id}|${todayISOKey}`)).length,
    [dueTodayAll, runsKey, todayISOKey]
  );

  const dailyByCat = useMemo(() => {
    const map = new Map<string, CleanTask[]>();
    for (const c of CLEANING_CATEGORIES) map.set(c, []);
    for (const t of dueDaily) {
      const key = t.category ?? "Opening checks";
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(t);
    }
    return map;
  }, [dueDaily]);

  // List of tasks included in the current confirm modal (for display)
  const confirmTasks = useMemo(
    () => (confirm ? tasks.filter((t) => confirm.ids.includes(t.id)) : []),
    [confirm, tasks]
  );

  /* Logs: slice for 10-row view vs full */
  const rowsToShow = useMemo(
    () => (showAllLogs ? rows : rows.slice(0, 10)),
    [rows, showAllLogs]
  );

  /* grouped rows by date (based on rowsToShow) */
  const grouped = useMemo(() => {
    const map = new Map<string, CanonRow[]>();
    for (const r of rowsToShow) {
      const key = r.date ?? "—";
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(r);
    }
    return Array.from(map.entries())
      .sort((a, b) => (a[0] < b[0] ? 1 : -1))
      .map(([date, list]) => ({ date, list }));
  }, [rowsToShow]);

  /* complete api (org + location scoped) */
  async function completeTasks(ids: string[], iniVal: string) {
    if (!ids.length) {
      setConfirm(null);
      setConfirmInitials("");
      return;
    }

    try {
      const org_id = await getActiveOrgIdClient();
      const locationId = await getActiveLocationIdClient();

      if (!org_id) {
        alert("No organisation found.");
        return;
      }
      if (!locationId) {
        alert("No location selected.");
        return;
      }

      const run_on = todayISOKey;

      const payload = ids.map((id) => ({
        org_id,
        location_id: locationId,
        task_id: id,
        run_on,
        done_by: iniVal.toUpperCase(),
      }));

      const { error } = await supabase
        .from("cleaning_task_runs")
        .upsert(payload, {
          onConflict: "task_id,run_on",
          ignoreDuplicates: true,
        });

      if (error) throw error;

      // 🎉 Confetti after successful completion
      try {
        const confettiModule = await import("canvas-confetti");
        confettiModule.default();
      } catch {
        // ignore confetti load errors
      }

      await loadRotaToday();
    } catch (e: any) {
      alert(e?.message || "Failed to save completion.");
    } finally {
      setConfirm(null);
      setConfirmInitials("");
    }
  }

  async function uncompleteTask(id: string) {
    try {
      const org_id = await getActiveOrgIdClient();
      const locationId = await getActiveLocationIdClient();
      if (!org_id || !locationId) return;

      const { error } = await supabase
        .from("cleaning_task_runs")
        .delete()
        .eq("org_id", org_id)
        .eq("location_id", locationId)
        .eq("task_id", id)
        .eq("run_on", todayISOKey);
      if (error) throw error;
      setRuns((prev) =>
        prev.filter((r) => !(r.task_id === id && r.run_on === todayISOKey))
      );
    } catch (e: any) {
      alert(e?.message || "Failed to undo completion.");
    }
  }

  /* ========================= RENDER ========================= */

  return (
    <div className="space-y-6">
      {/* Big centred header */}
      <div className="text-center">
        <h1 className="text-lg font-semibold text-slate-900 sm:text-xl">
          {/* Title intentionally blank per your current design */}
        </h1>

        <div className="mt-3">
          <div className="text-xs font-semibold uppercase tracking-[0.25em] text-slate-400">
            {isTodayHeader ? "Today" : "Selected date"}
          </div>
          <div className="mt-1 text-xl font-semibold text-slate-900 sm:text-2xl">
            {formatPrettyDate(headerDateObj)}
          </div>
        </div>
      </div>

      {/* KPI grid + pills */}
      <div className="space-y-4 rounded-3xl border border-white/30 bg-white/70 p-4 shadow-lg shadow-slate-900/10 backdrop-blur">
        {(() => {
          const todayISO = new Date().toISOString().slice(0, 10);
          const since = new Date(Date.now() - 7 * 24 * 3600 * 1000);
          const in7d = (d: string | null) =>
            d ? new Date(d) >= since : false;

          const entriesToday = rows.filter((r) => r.date === todayISO).length;
          const fails7 = rows.filter(
            (r) => in7d(r.date) && r.status === "fail"
          ).length;

          const entriesTodayIsEmpty = entriesToday === 0;
          const entriesTodayIcon = entriesTodayIsEmpty ? "❌" : "✅";
          const entriesTodayTile =
            "rounded-xl p-3 min-h-[76px] flex flex-col justify-between border shadow-sm backdrop-blur-sm " +
            (entriesTodayIsEmpty
              ? "border-red-200 bg-red-50/90 text-red-800"
              : "border-emerald-200 bg-emerald-50/90 text-emerald-900");

          const hasCleaning = dueTodayAll.length > 0;
          const allCleaningDone =
            hasCleaning && doneCount === dueTodayAll.length;
          const cleaningIcon = !hasCleaning
            ? "ℹ️"
            : allCleaningDone
            ? "✅"
            : "❌";
          const cleaningColor = !hasCleaning
            ? "border-gray-200 bg-white/80 text-gray-800"
            : allCleaningDone
            ? "border-emerald-200 bg-emerald-50/90 text-emerald-900"
            : "border-red-200 bg-red-50/90 text-red-800";

          const cleaningTileBase =
            "rounded-xl p-3 min-h-[76px] text-left flex flex-col justify-between border shadow-sm backdrop-blur-sm transition hover:brightness-105";

          const failsTileColor =
            fails7 > 0
              ? "border-red-200 bg-red-50/90 text-red-800"
              : "border-gray-200 bg-white/80 text-gray-800";
          const failsIcon = fails7 > 0 ? "⚠️" : "✅";

          const eomName = employeeOfMonth?.display_name || "—";
          const eomPoints = employeeOfMonth?.points ?? 0;
          const eomTemp = employeeOfMonth?.temp_logs_count ?? 0;
          const eomClean = employeeOfMonth?.cleaning_count ?? 0;

          return (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {/* tile 1: Entries today */}
              <div className={entriesTodayTile}>
                <div className="flex items-center justify-between text-xs">
                  <span>Entries today</span>
                  <span className="text-base">{entriesTodayIcon}</span>
                </div>
                <div className="mt-1 text-2xl font-semibold">
                  {entriesToday}
                </div>
                <div className="mt-1 hidden text-[11px] opacity-80 md:block">
                  {entriesTodayIsEmpty
                    ? "No temperatures logged yet today."
                    : "Great — at least one log recorded."}
                </div>
              </div>

              {/* tile 2: Failures (7d) */}
              <div
                className={
                  "flex min-h-[76px] flex-col justify-between rounded-xl border p-3 text-xs shadow-sm backdrop-blur-sm " +
                  failsTileColor
                }
              >
                <div className="flex items-center justify-between text-xs">
                  <span>Failures (7d)</span>
                  <span className="text-base">{failsIcon}</span>
                </div>
                <div className="mt-1 text-2xl font-semibold">{fails7}</div>
                <div className="mt-1 hidden text-[11px] opacity-80 md:block">
                  {fails7 > 0
                    ? "Check and record any corrective actions."
                    : "No failed temperature checks in the last week."}
                </div>
              </div>

              {/* tile 3: Employee of the month (from leaderboard) */}
              <div className="flex min-h-[76px] flex-col justify-between rounded-xl border border-amber-200 bg-amber-50/90 p-3 text-amber-900 shadow-sm backdrop-blur-sm">
                <div className="flex items-center justify-between text-xs">
                  <span>Employee of the month</span>
                  <span className="text-lg">🏆</span>
                </div>
                <div className="mt-1 truncate text-lg font-semibold">
                  {eomName}
                </div>
                <div className="mt-1 text-[11px] opacity-80 md:block">
                  {eomPoints
                    ? `${eomPoints} pts · Temps ${eomTemp} · Cleaning ${eomClean}`
                    : "Based on points from cleaning & temp logs."}
                </div>
              </div>

              {/* tile 4: Cleaning (today) */}
              <button
                type="button"
                onClick={() => {
                  const ids = dueTodayAll
                    .filter((t) => !runsKey.has(`${t.id}|${todayISOKey}`))
                    .map((t) => t.id);
                  setConfirm({ ids, run_on: todayISOKey });
                  setConfirmLabel("Complete all today");
                  setConfirmInitials(ini || initials[0] || "");
                }}
                className={`${cleaningTileBase} ${cleaningColor}`}
                title="View and complete today’s cleaning tasks"
              >
                <div className="flex items-center justify-between text-xs">
                  <span>Cleaning (today)</span>
                  <span className="text-base">{cleaningIcon}</span>
                </div>
                <div className="mt-1 text-2xl font-semibold">
                  {doneCount}/{dueTodayAll.length}
                </div>
                <div className="mt-1 hidden text-[11px] underline opacity-80 md:block">
                  {hasCleaning
                    ? allCleaningDone
                      ? "All cleaning tasks completed."
                      : "Click to complete remaining tasks."
                    : "No cleaning tasks scheduled for today."}
                </div>
              </button>
            </div>
          );
        })()}

        {/* KPI pills row – simple training/allergen overview */}
        <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-slate-600">
          <span className="rounded-full bg-amber-50 px-2 py-0.5">
            Training due soon:{" "}
            <span className="font-semibold">{kpi.trainingDueSoon}</span>
          </span>
          <span className="rounded-full bg-red-50 px-2 py-0.5">
            Training overdue:{" "}
            <span className="font-semibold">{kpi.trainingOver}</span>
          </span>
          <span className="rounded-full bg-amber-50 px-2 py-0.5">
            Allergen review due soon:{" "}
            <span className="font-semibold">{kpi.allergenDueSoon}</span>
          </span>
          <span className="rounded-full bg-red-50 px-2 py-0.5">
            Allergen review overdue:{" "}
            <span className="font-semibold">{kpi.allergenOver}</span>
          </span>
        </div>

        {err && (
          <div className="mt-2 rounded-md border border-red-200 bg-red-50/90 px-3 py-2 text-sm text-red-800">
            {err}
          </div>
        )}
      </div>

      {/* ======= Today’s Cleaning Tasks (dashboard card) ======= */}
      <div className="rounded-3xl border border-white/30 bg-white/70 p-4 shadow-lg shadow-slate-900/10 backdrop-blur">
        <div className="mb-2 flex items-center gap-2">
          <h2 className="text-lg font-semibold">Today’s Cleaning Tasks</h2>

          <div className="ml-auto flex items-center gap-2">
            <div className="rounded-xl border border-gray-200 bg-white/70 px-3 py-1.5 text-sm shadow-sm">
              {doneCount}/{dueTodayAll.length}
            </div>
            <button
              className="inline-flex items-center justify-center whitespace-nowrap rounded-2xl bg-gradient-to-r from-emerald-500 via-lime-500 to-emerald-500 px-3 py-1.5 text-sm font-medium text-white shadow-sm shadow-emerald-500/30 hover:brightness-105 disabled:opacity-60"
              onClick={() => {
                const ids = dueTodayAll
                  .filter((t) => !runsKey.has(`${t.id}|${todayISOKey}`))
                  .map((t) => t.id);
                setConfirm({ ids, run_on: todayISOKey });
                setConfirmLabel("Complete all today");
                setConfirmInitials(ini || initials[0] || "");
              }}
              disabled={
                !dueTodayAll.length ||
                dueTodayAll.every((t) =>
                  runsKey.has(`${t.id}|${todayISOKey}`)
                )
              }
            >
              Complete All
            </button>
          </div>
        </div>

        {/* Weekly/Monthly only */}
        <div className="space-y-2">
          <div className="text-[11px] font-semibold uppercase text-gray-500">
            Weekly / Monthly
          </div>
          {dueNonDaily.length === 0 ? (
            <div className="rounded-xl border border-gray-200 bg-white/70 p-3 text-sm text-gray-500 shadow-sm">
              No tasks.
            </div>
          ) : (
            <>
              {dueNonDaily.map((t) => {
                const key = `${t.id}|${todayISOKey}`;
                const done = runsKey.has(key);
                const run = runsKey.get(key) || null;
                return (
                  <div
                    key={t.id}
                    className="flex items-start justify-between gap-2 rounded-xl border border-gray-200 bg-white/80 px-2 py-2 text-sm shadow-sm backdrop-blur-sm"
                  >
                    <div className={done ? "text-gray-500 line-through" : ""}>
                      <div className="font-medium">{t.task}</div>
                      <div className="text-xs text-gray-500">
                        {t.category ?? t.area ?? "—"} •{" "}
                        {t.frequency === "weekly" ? "Weekly" : "Monthly"}
                      </div>
                      {run?.done_by && (
                        <div className="text-[11px] text-gray-400">
                          Done by {run.done_by}
                        </div>
                      )}
                    </div>
                    <Pill
                      done={done}
                      onClick={() =>
                        done
                          ? uncompleteTask(t.id)
                          : completeTasks(
                              [t.id],
                              ini || initials[0] || ""
                            )
                      }
                    />
                  </div>
                );
              })}
            </>
          )}
        </div>

        {/* Daily – category summary only */}
        <div className="mt-4 space-y-2">
          <div className="text-[11px] font-semibold uppercase text-gray-500">
            Daily tasks (by category)
          </div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
            {CLEANING_CATEGORIES.map((cat) => {
              const list = dailyByCat.get(cat) ?? [];
              const open = list.filter(
                (t) => !runsKey.has(`${t.id}|${todayISOKey}`)
              ).length;
              return (
                <CategoryPill
                  key={cat}
                  title={cat}
                  total={list.length}
                  open={open}
                  onClick={() => {
                    const ids = list
                      .filter((t) => !runsKey.has(`${t.id}|${todayISOKey}`))
                      .map((t) => t.id);
                    setConfirm({ ids, run_on: todayISOKey });
                    setConfirmLabel(`Complete: ${cat}`);
                    setConfirmInitials(ini || initials[0] || "");
                  }}
                />
              );
            })}
          </div>
        </div>
      </div>

      {/* ======= LOGS (read-only) ======= */}
      <div className="rounded-3xl border border-white/30 bg-white/70 p-4 shadow-lg shadow-slate-900/10 backdrop-blur">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Temperature Logs</h2>
          <button
            onClick={refreshRows}
            className="rounded-2xl border border-slate-200 bg-white/80 px-3 py-1.5 text-sm text-slate-800 shadow-sm hover:bg-white"
          >
            Refresh
          </button>
        </div>

        {/* Desktop/tablet – grouped by date */}
        <div className="hidden overflow-x-auto md:block">
          <table className="w-full table-fixed text-sm">
            <thead className="bg-slate-50/80 text-slate-600">
              <tr className="text-left text-[11px] font-semibold uppercase tracking-wide">
                <th className="w-[6rem] px-3 py-2">Time</th>
                <th className="w-16 px-3 py-2">Initials</th>
                <th className="w-[9rem] px-3 py-2">Location</th>
                <th className="w-[10rem] px-3 py-2">Item</th>
                <th className="w-[10rem] px-3 py-2">Target</th>
                <th className="w-[7rem] px-3 py-2">Temp (°C)</th>
                <th className="w-[6.5rem] px-3 py-2 text-right">Status</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-6 text-center text-gray-500">
                    Loading…
                  </td>
                </tr>
              ) : grouped.length ? (
                grouped.map((g) => (
                  <React.Fragment key={g.date}>
                    {/* Date header row */}
                    <tr className="border-t bg-slate-50/80">
                      <td
                        colSpan={7}
                        className="px-3 py-2 text-sm font-semibold text-slate-700"
                      >
                        {formatDDMMYYYY(g.date)}
                      </td>
                    </tr>
                    {/* Rows for that date */}
                    {g.list.map((r) => {
                      const preset: TargetPreset | undefined = r.target_key
                        ? (TARGET_BY_KEY as any)[r.target_key]
                        : undefined;
                      const st = r.status ?? inferStatus(r.temp_c, preset);
                      return (
                        <tr key={r.id} className="border-t bg-white/80">
                          <td className="px-3 py-2 text-xs text-gray-500">
                            {r.time ?? "—"}
                          </td>
                          <td className="px-3 py-2 font-medium uppercase">
                            {r.staff_initials ?? "—"}
                          </td>
                          <td className="px-3 py-2">
                            {r.location ?? "—"}
                          </td>
                          <td className="px-3 py-2">{r.item ?? "—"}</td>
                          <td className="px-3 py-2">
                            {preset
                              ? `${preset.label}${
                                  preset.minC != null || preset.maxC != null
                                    ? ` (${preset.minC ?? "−∞"}–${
                                        preset.maxC ?? "+∞"
                                      } °C)`
                                    : ""
                                }`
                              : "—"}
                          </td>
                          <td className="px-3 py-2">
                            {r.temp_c ?? "—"}
                          </td>
                          <td className="px-3 py-2 text-right">
                            {st ? (
                              <span
                                className={cls(
                                  "inline-flex rounded-full px-2 py-0.5 text-xs font-medium",
                                  st === "pass"
                                    ? "bg-emerald-100 text-emerald-800"
                                    : "bg-red-100 text-red-800"
                                )}
                              >
                                {st}
                              </span>
                            ) : (
                              "—"
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </React.Fragment>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="py-6 text-center text-gray-500">
                    No entries
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile cards */}
        <div className="space-y-2 md:hidden">
          {loading ? (
            <div className="py-4 text-center text-sm text-gray-500">
              Loading…
            </div>
          ) : grouped.length ? (
            grouped.map((g) => (
              <div key={g.date}>
                <div className="mb-1 text-xs font-medium text-gray-600">
                  {formatDDMMYYYY(g.date)}
                </div>
                <div className="space-y-2">
                  {g.list.map((r) => {
                    const preset: TargetPreset | undefined = r.target_key
                      ? (TARGET_BY_KEY as any)[r.target_key]
                      : undefined;
                    const st = r.status ?? inferStatus(r.temp_c, preset);
                    return (
                      <div
                        key={r.id}
                        className="rounded-xl border border-slate-200 bg-white/80 p-3 shadow-sm"
                      >
                        <div className="flex items-center justify-between">
                          <div className="text-sm font-medium">
                            {r.item ?? "—"}
                          </div>
                          {st && (
                            <span
                              className={cls(
                                "ml-2 rounded-full px-2 py-0.5 text-[11px] font-medium",
                                st === "pass"
                                  ? "bg-emerald-100 text-emerald-800"
                                  : "bg-red-100 text-red-800"
                              )}
                            >
                              {st}
                            </span>
                          )}
                        </div>
                        <div className="mt-1 text-xs text-gray-600">
                          {r.time ?? "—"} • {r.location ?? "—"} •{" "}
                          {r.staff_initials ?? "—"} • {r.temp_c ?? "—"}°C
                        </div>
                        <div className="mt-1 text-[11px] text-gray-500">
                          Target:{" "}
                          {preset
                            ? `${preset.label}${
                                preset.minC != null || preset.maxC != null
                                  ? ` (${preset.minC ?? "−∞"}–${
                                      preset.maxC ?? "+∞"
                                    } °C)`
                                  : ""
                              }`
                            : "—"}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))
          ) : (
            <div className="py-4 text-center text-sm text-gray-500">
              No entries
            </div>
          )}
        </div>

        {/* Logs footer: tally + View all */}
        {!loading && rows.length > 0 && (
          <div className="mt-3 flex items-center justify-between text-xs text-slate-600">
            <span>
              {rowsToShow.length} of {rows.length} logs shown
            </span>
            {rows.length > rowsToShow.length ? (
              <button
                type="button"
                className="rounded-full border border-slate-200 bg-white/80 px-3 py-1 text-xs font-medium text-slate-800 shadow-sm hover:bg-white"
                onClick={() => setShowAllLogs(true)}
              >
                View all
              </button>
            ) : rows.length > 10 ? (
              <button
                type="button"
                className="rounded-full border border-slate-200 bg-white/80 px-3 py-1 text-xs font-medium text-slate-800 shadow-sm hover:bg-white"
                onClick={() => setShowAllLogs(false)}
              >
                Show latest 10
              </button>
            ) : null}
          </div>
        )}
      </div>

      {/* Cleaning completion modal */}
      {confirm && (
        <div
          className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm"
          onClick={() => setConfirm(null)}
        >
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!confirmInitials.trim()) return;
              completeTasks(confirm.ids, confirmInitials.trim());
            }}
            onClick={(e) => e.stopPropagation()}
            className="mx-auto mt-6 flex h-[60vh] w-full max-w-sm flex-col overflow-hidden rounded-t-2xl border border-white/30 bg-white/90 shadow-xl shadow-slate-900/25 backdrop-blur sm:mt-24 sm:h-auto sm:max-w-md sm:rounded-2xl"
          >
            <div className="sticky top-0 z-10 border-b bg-white/90 px-4 py-3 text-base font-semibold">
              {confirmLabel}
            </div>
            <div className="grow space-y-3 overflow-y-auto px-4 py-3 text-sm">
              <div className="rounded-xl border border-slate-200 bg-slate-50/90 p-2">
                <div className="font-medium">
                  {confirm.ids.length} task(s)
                </div>
                <div className="mt-1 text-xs text-gray-500">
                  For <strong>{nice(confirm.run_on)}</strong>
                </div>
              </div>

              {confirmTasks.length > 0 && (
                <div className="rounded-xl border border-slate-200 bg-white/90 p-2">
                  <div className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-gray-500">
                    Tasks to mark complete
                  </div>
                  <ul className="space-y-2 text-sm">
                    {confirmTasks.map((t) => (
                      <li
                        key={t.id}
                        className="rounded-lg border border-slate-100 bg-slate-50/80 px-2 py-1.5"
                      >
                        <div className="font-medium">{t.task}</div>
                        <div className="text-[11px] text-gray-500">
                          {t.category ?? t.area ?? "—"} •{" "}
                          {t.frequency === "daily"
                            ? "Daily"
                            : t.frequency === "weekly"
                            ? "Weekly"
                            : "Monthly"}
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
            <div className="sticky bottom-0 z-10 flex flex-wrap items-center justify-between gap-3 border-t bg-white/90 px-4 py-3">
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600">Initials</span>
                <select
                  className="rounded-xl border border-slate-200 bg-white/80 px-2 py-1.5 text-sm uppercase shadow-sm"
                  value={confirmInitials}
                  onChange={(e) =>
                    setConfirmInitials(e.target.value.toUpperCase())
                  }
                  required
                >
                  <option value="" disabled>
                    Select…
                  </option>
                  {initials.map((i) => (
                    <option key={i} value={i}>
                      {i}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  className="rounded-md px-3 py-1.5 text-sm hover:bg-gray-50"
                  onClick={() => setConfirm(null)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-2xl bg-gradient-to-r from-emerald-500 via-lime-500 to-emerald-500 px-3 py-1.5 text-sm font-medium text-white shadow-sm shadow-emerald-500/30 hover:brightness-105"
                >
                  Mark tasks complete
                </button>
              </div>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

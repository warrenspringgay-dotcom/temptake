// src/app/dashboard/page.tsx
"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { supabase } from "@/lib/supabaseBrowser";
import { getActiveOrgIdClient } from "@/lib/orgClient";
import { getActiveLocationIdClient } from "@/lib/locationClient";

/* ---------- CONFIG ---------- */

const WALL_TABLE = "kitchen_wall";

/* ---------- Types ---------- */

type KpiState = {
  tempLogsToday: number;
  tempFails7d: number;
  cleaningDueToday: number;
  cleaningDoneToday: number;
  trainingDueSoon: number;
  trainingOver: number;
  allergenDueSoon: number;
  allergenOver: number;
};

type LeaderboardEntry = {
  display_name: string | null;
  points: number | null;
  temp_logs_count: number | null;
  cleaning_count: number | null;
};

type WallPost = {
  id: string;
  initials: string;
  message: string;
  created_at: string;
  colorClass: string;
};

type CleanTask = {
  id: string;
  org_id: string;
  area: string | null;
  task: string;
  category: string | null;
  frequency: "daily" | "weekly" | "monthly";
  weekday: number | null;
  month_day: number | null;
};

type CleanRun = {
  task_id: string;
  run_on: string;
  done_by: string | null;
};

/* ---------- helpers ---------- */

const isoToday = () => new Date().toISOString().slice(0, 10);

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

  return `${weekday} ${day} ${month} ${year}`;
}

const cls = (...parts: Array<string | false | null | undefined>) =>
  parts.filter(Boolean).join(" ");

function toISODate(val: any): string | null {
  if (!val) return null;
  const d = new Date(val);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString().slice(0, 10);
}

function getDow1to7(ymd: string) {
  const date = new Date(ymd);
  return ((date.getDay() + 6) % 7) + 1; // Mon=1..Sun=7
}
function getDom(ymd: string) {
  return new Date(ymd).getDate();
}

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

/* ---------- Component ---------- */

export default function DashboardPage() {
  const [kpi, setKpi] = useState<KpiState>({
    tempLogsToday: 0,
    tempFails7d: 0,
    cleaningDueToday: 0,
    cleaningDoneToday: 0,
    trainingDueSoon: 0,
    trainingOver: 0,
    allergenDueSoon: 0,
    allergenOver: 0,
  });

  const [eom, setEom] = useState<LeaderboardEntry | null>(null);
  const [wallPosts, setWallPosts] = useState<WallPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const headerDate = formatPrettyDate(new Date());

  useEffect(() => {
    let cancelled = false;

    (async () => {
      setLoading(true);
      setErr(null);
      try {
        const orgId = await getActiveOrgIdClient();
        const locationId = await getActiveLocationIdClient();
        const today = isoToday();

        if (!orgId) {
          setLoading(false);
          return;
        }

        await Promise.all([
          loadTempsKpi(orgId, locationId, today, cancelled),
          loadCleaningKpi(orgId, locationId, today, cancelled),
          loadTrainingAndAllergenKpi(orgId, cancelled),
          loadLeaderBoard(orgId, cancelled),
          loadWallPosts(orgId, cancelled),
        ]);
      } catch (e: any) {
        if (!cancelled) setErr(e?.message ?? "Failed to load dashboard.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  /* ---------- loaders ---------- */

  async function loadTempsKpi(
    orgId: string,
    _locationId: string | null,
    todayISO: string,
    cancelled: boolean
  ) {
    const since = new Date();
    since.setDate(since.getDate() - 7);

    const { data, error } = await supabase
      .from("food_temp_logs")
      .select("at,status,org_id,location_id,temp_c")
      .eq("org_id", orgId)
      .order("at", { ascending: false })
      .limit(400);

    if (error) throw error;
    if (cancelled) return;

    let tempLogsToday = 0;
    let tempFails7d = 0;

    (data ?? []).forEach((r: any) => {
      const at = r.at ?? r.created_at ?? null;
      const d = at ? new Date(at) : null;
      if (!d || Number.isNaN(d.getTime())) return;

      const iso = d.toISOString().slice(0, 10);
      const status: string | null = r.status ?? null;

      if (iso === todayISO) tempLogsToday += 1;
      if (d >= since && status === "fail") tempFails7d += 1;
    });

    setKpi((prev) => ({
      ...prev,
      tempLogsToday,
      tempFails7d,
    }));
  }

  async function loadCleaningKpi(
    orgId: string,
    locationId: string | null,
    todayISO: string,
    cancelled: boolean
  ) {
    if (!locationId) {
      setKpi((prev) => ({
        ...prev,
        cleaningDueToday: 0,
        cleaningDoneToday: 0,
      }));
      return;
    }

    const { data: tData } = await supabase
      .from("cleaning_tasks")
      .select(
        "id, org_id, location_id, area, task, category, frequency, weekday, month_day"
      )
      .eq("org_id", orgId)
      .eq("location_id", locationId);

    const allTasks: CleanTask[] =
      (tData ?? []).map((r: any) => ({
        id: String(r.id),
        org_id: String(r.org_id),
        area: r.area ?? null,
        task: r.task ?? r.name ?? "",
        category: r.category ?? null,
        frequency: (r.frequency ?? "daily") as CleanTask["frequency"],
        weekday: r.weekday ? Number(r.weekday) : null,
        month_day: r.month_day ? Number(r.month_day) : null,
      })) || [];

    const dueTodayAll = allTasks.filter((t) => isDueOn(t, todayISO));

    const { data: rData } = await supabase
      .from("cleaning_task_runs")
      .select("task_id,run_on,done_by,location_id")
      .eq("org_id", orgId)
      .eq("location_id", locationId)
      .eq("run_on", todayISO);

    const runs: CleanRun[] =
      (rData ?? []).map((r: any) => ({
        task_id: String(r.task_id),
        run_on: r.run_on as string,
        done_by: r.done_by ?? null,
      })) || [];

    if (cancelled) return;

    const runsKey = new Set(runs.map((r) => `${r.task_id}|${r.run_on}`));
    const cleaningDoneToday = dueTodayAll.filter((t) =>
      runsKey.has(`${t.id}|${todayISO}`)
    ).length;

    setKpi((prev) => ({
      ...prev,
      cleaningDueToday: dueTodayAll.length,
      cleaningDoneToday,
    }));
  }

  async function loadTrainingAndAllergenKpi(
    orgId: string,
    cancelled: boolean
  ) {
    const soon = new Date();
    soon.setDate(soon.getDate() + 14);
    const todayD = new Date();

    let trainingDueSoon = 0;
    let trainingOver = 0;
    let allergenDueSoon = 0;
    let allergenOver = 0;

    // Training
    try {
      const { data } = await supabase
        .from("team_members")
        .select("*")
        .eq("org_id", orgId);

      (data ?? []).forEach((r: any) => {
        const raw =
          r.training_expires_at ??
          r.training_expiry ??
          r.expires_at ??
          null;
        if (!raw) return;
        const d = new Date(raw);
        if (Number.isNaN(d.getTime())) return;
        if (d < todayD) trainingOver++;
        else if (d <= soon) trainingDueSoon++;
      });
    } catch {
      // leave at 0
    }

    // Allergen review
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
    } catch {
      // ignore
    }

    if (cancelled) return;

    setKpi((prev) => ({
      ...prev,
      trainingDueSoon,
      trainingOver,
      allergenDueSoon,
      allergenOver,
    }));
  }

  async function loadLeaderBoard(orgId: string, cancelled: boolean) {
    try {
      const { data, error } = await supabase
        .from("leaderboard")
        .select("display_name, points, temp_logs_count, cleaning_count")
        .eq("org_id", orgId)
        .order("points", { ascending: false })
        .limit(1);

      if (error) throw error;
      if (cancelled) return;
      setEom(data?.[0] ?? null);
    } catch {
      if (!cancelled) setEom(null);
    }
  }

  async function loadWallPosts(orgId: string, cancelled: boolean) {
    try {
      const { data, error } = await supabase
        .from(WALL_TABLE)
        .select(
          "id, org_id, location_id, author_initials, message, color, created_at"
        )
        .eq("org_id", orgId)
        .order("created_at", { ascending: false })
        .limit(3);

      if (error) throw error;
      if (cancelled) return;

      const mapped: WallPost[] =
        (data ?? []).map((r: any) => ({
          id: String(r.id),
          initials:
            r.author_initials ??
            r.staff_initials ??
            r.initials ??
            "??",
          message: r.message ?? "",
          created_at: r.created_at ?? new Date().toISOString(),
          colorClass: (r.color as string) || "bg-yellow-200",
        })) || [];

      setWallPosts(mapped);
    } catch (e) {
      console.error("Failed to load wall posts", e);
      if (!cancelled) setWallPosts([]);
    }
  }

  /* ---------- derived ---------- */

  const alertsCount =
    kpi.trainingOver + kpi.allergenOver + (kpi.tempFails7d > 0 ? 1 : 0);

  const hasAnyKpiAlert =
    kpi.tempFails7d > 0 ||
    kpi.trainingOver > 0 ||
    kpi.trainingDueSoon > 0 ||
    kpi.allergenOver > 0 ||
    kpi.allergenDueSoon > 0;

  const alertsSummary = (() => {
    const bits: string[] = [];
    if (kpi.tempFails7d > 0) bits.push(`${kpi.tempFails7d} failed temps (7d)`);
    if (kpi.trainingOver > 0) bits.push(`${kpi.trainingOver} training overdue`);
    if (kpi.allergenOver > 0)
      bits.push(`${kpi.allergenOver} allergen review overdue`);
    if (!bits.length)
      return "No training, allergen or temperature issues flagged.";
    return bits.join(" · ");
  })();

  const openTempModal = () => {
    if (typeof window === "undefined") return;
    window.dispatchEvent(new Event("tt-open-temp-modal"));
  };

  /* ---------- render ---------- */

  return (
    <div className="max-w-5xl mx-auto px-3 sm:px-4 py-4 space-y-5">
      {/* Header – compact, date only */}
      <header className="text-center space-y-1">
        <h1 className="text-xl sm:text-2xl font-semibold text-slate-900">
          {headerDate}
        </h1>
        <p className="text-xs sm:text-sm text-slate-500">
          At-a-glance view of safety, cleaning and compliance.
        </p>
      </header>

      {/* KPI row */}
      <section className="rounded-3xl border border.white/40 border-white/40 bg.white/80 bg-white/80 p-4 shadow-lg shadow-slate-900/5 backdrop-blur space-y-3">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {/* Temps today – CLICKABLE: opens temp quick-entry modal */}
          <motion.button
            type="button"
            onClick={openTempModal}
            initial={{ opacity: 0, y: 10, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ type: "spring", stiffness: 260, damping: 20 }}
            whileHover={{ y: -3 }}
            className={cls(
              "rounded-2xl border p-3 shadow-sm text-sm flex flex-col justify-between min-h-[88px] w-full text-left",
              kpi.tempLogsToday === 0
                ? "border-red-200 bg-red-50/90 text-red-800"
                : "border-emerald-200 bg-emerald-50/90 text-emerald-900"
            )}
          >
            <div className="flex items-center justify-between text-[11px] uppercase tracking-[0.15em]">
              <span>Temperature logs</span>
              <span className="text-base" aria-hidden="true">
                {kpi.tempLogsToday === 0 ? "❌" : "✅"}
              </span>
            </div>
            <div className="mt-1 text-2xl font-semibold">
              {kpi.tempLogsToday}
            </div>
            <div className="mt-1 text-[11px] opacity-80">
              {kpi.tempLogsToday === 0
                ? "No temperatures logged yet today."
                : "At least one temperature check recorded."}
            </div>
          </motion.button>

          {/* Cleaning today – CLICKABLE: go to cleaning rota */}
          <Link href="/cleaning-rota" className="w-full">
            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{
                type: "spring",
                stiffness: 260,
                damping: 20,
                delay: 0.05,
              }}
              whileHover={{ y: -3 }}
              className={cls(
                "rounded-2xl border p-3 shadow-sm text-sm flex flex-col justify-between min-h-[88px]",
                kpi.cleaningDueToday === 0
                  ? "border-slate-200 bg-white/90 text-slate-900"
                  : kpi.cleaningDoneToday === kpi.cleaningDueToday
                  ? "border-emerald-200 bg-emerald-50/90 text-emerald-900"
                  : "border-amber-200 bg-amber-50/90 text-amber-900"
              )}
            >
              <div className="flex items-center justify-between text-[11px] uppercase tracking-[0.15em]">
                <span>Cleaning (today)</span>
                <span className="text-base" aria-hidden="true">
                  🧽
                </span>
              </div>
              <div className="mt-1 text-2xl font-semibold">
                {kpi.cleaningDoneToday}/{kpi.cleaningDueToday}
              </div>
              <div className="mt-1 text-[11px] opacity-80">
                {kpi.cleaningDueToday === 0
                  ? "No cleaning tasks scheduled for today."
                  : kpi.cleaningDoneToday === kpi.cleaningDueToday
                  ? "All scheduled cleaning tasks completed."
                  : "Some scheduled cleaning tasks still open."}
              </div>
            </motion.div>
          </Link>

          {/* Alerts – CLICKABLE: go to manager view (alerts) */}
          <Link href="/manager" className="w-full">
            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{
                type: "spring",
                stiffness: 260,
                damping: 20,
                delay: 0.1,
              }}
              whileHover={{ y: -3 }}
              className={cls(
                "rounded-2xl border p-3 shadow-sm text-sm flex flex-col justify-between min-h-[88px]",
                hasAnyKpiAlert
                  ? "border-red-200 bg-red-50/90 text-red-800"
                  : "border-emerald-200 bg-emerald-50/90 text-emerald-900"
              )}
            >
              <div className="flex items-center justify-between text-[11px] uppercase tracking-[0.15em]">
                <span>Alerts</span>
                <span className="text-base" aria-hidden="true">
                  {hasAnyKpiAlert ? "⚠️" : "✅"}
                </span>
              </div>
              <div className="mt-1 text-2xl font-semibold">
                {alertsCount}
              </div>
              <div className="mt-1 text-[11px] opacity-80">
                {alertsSummary}
              </div>
            </motion.div>
          </Link>
        </div>

        {err && (
          <div className="mt-2 rounded-xl border border-red-200 bg-red-50/90 px-3 py-2 text-xs text-red-800">
            {err}
          </div>
        )}
      </section>


      {/* Middle row: wall + EOM */}
      <section className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {/* Kitchen wall latest posts */}
        <div className="rounded-3xl border border-white/40 bg-white/80 p-4 shadow-md shadow-slate-900/5 backdrop-blur flex flex-col">
          <div className="mb-2 flex items-center justify-between gap-2">
            <div>
              <h2 className="text-sm font-semibold text-slate-900">
                Kitchen wall – latest posts
              </h2>
              <p className="text-[11px] text-slate-500">
                The last three notes pinned to the kitchen wall.
              </p>
            </div>
            <Link
              href="/wall"
              className="text-[11px] font-medium text-amber-700 hover:text-amber-800 underline-offset-2 hover:underline"
            >
              View wall
            </Link>
          </div>

          {wallPosts.length === 0 ? (
            <div className="mt-1 rounded-2xl border border-dashed border-slate-200 bg-slate-50/70 px-3 py-4 text-xs text-slate-500 flex-1 flex items-center">
              No posts yet. When the team adds messages on the wall, the latest
              three will show here.
            </div>
          ) : (
            <div className="mt-1 grid grid-cols-1 gap-2 sm:grid-cols-3">
              {wallPosts.map((p, idx) => (
                <motion.div
                  key={p.id}
                  className={cls(
                    "flex flex-col justify-between rounded-2xl px-3 py-2 text-xs shadow-sm border border-slate-100",
                    p.colorClass || "bg-yellow-200"
                  )}
                  initial={{ opacity: 0, y: 10, scale: 0.97 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{
                    type: "spring",
                    stiffness: 260,
                    damping: 20,
                    delay: idx * 0.05,
                  }}
                  whileHover={{ y: -3 }}
                >
                  <div className="flex items-center justify-between mb-1">
                    <div className="text-base font-bold tracking-wide text-slate-900">
                      {p.initials || "??"}
                    </div>
                    <span className="text-[10px] text-slate-500">
                      {toISODate(p.created_at) ?? ""}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-800 line-clamp-3">
                    {p.message}
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>

        {/* Employee of the month */}
        <div className="rounded-3xl border border-amber-200 bg-amber-50/90 p-4 shadow-md shadow-amber-200/60 flex flex-col">
          <div className="mb-2 flex items-center justify-between gap-2">
            <h2 className="text-sm font-semibold text-amber-900">
              Employee of the month
            </h2>
            <span className="text-xl" aria-hidden="true">
              🏆
            </span>
          </div>

          {eom ? (
            <>
              <div className="text-lg font-bold text-amber-900 truncate">
                {eom.display_name}
              </div>
              <div className="mt-1 text-xs text-amber-900/90 space-y-0.5">
                <div>
                  Total points:{" "}
                  <span className="font-semibold">
                    {eom.points ?? 0}
                  </span>
                </div>
                <div>
                  Cleaning tasks:{" "}
                  <span className="font-semibold">
                    {eom.cleaning_count ?? 0}
                  </span>
                  {" · "}Temp logs:{" "}
                  <span className="font-semibold">
                    {eom.temp_logs_count ?? 0}
                  </span>
                </div>
              </div>
              <p className="mt-3 text-[11px] text-amber-900/80">
                Based on completed cleaning tasks and temperature logs this
                month.
              </p>
            </>
          ) : (
            <p className="text-xs text-amber-900/80">
              No leaderboard data yet. Once your team completes cleaning tasks
              and logs temperatures, the top performer will be highlighted here.
            </p>
          )}

          <div className="mt-3">
            <Link
              href="/leaderboard"
              className="inline-flex items-center rounded-2xl bg-amber-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-amber-700"
            >
              View full leaderboard
            </Link>
          </div>
        </div>
      </section>

      {/* Quick actions with emojis + animation */}
      <section className="rounded-3xl border border-white/40 bg-white/80 p-4 shadow-md shadow-slate-900/5 backdrop-blur space-y-3">
        <h2 className="text-sm font-semibold text-slate-900">Quick actions</h2>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <QuickLink href="/routines" label="Routines" icon="📋" />
          <QuickLink href="/allergens" label="Allergens" icon="⚠️" />
          <QuickLink href="/cleaning-rota" label="Cleaning rota" icon="🧽" />
          <QuickLink href="/team" label="Team & training" icon="👥" />
          <QuickLink href="/reports" label="Reports" icon="📊" />
          <QuickLink href="/locations" label="Locations & sites" icon="📍" />
          <QuickLink href="/manager" label="Manager view" icon="💼" />
          <QuickLink href="/help" label="Help & support" icon="❓" />
        </div>
      </section>

      {loading && (
        <p className="text-center text-[11px] text-slate-400">
          Loading dashboard…
        </p>
      )}
    </div>
  );
}

/* ---------- Quick link button with emoji + hover bounce ---------- */

function QuickLink({
  href,
  label,
  icon,
}: {
  href: string;
  label: string;
  icon: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ type: "spring", stiffness: 260, damping: 22 }}
      whileHover={{ y: -3 }}
    >
      <Link
        href={href}
        className="flex items-center justify-center gap-1 rounded-2xl border border-slate-200 bg-white/80 px-3 py-2 text-xs font-medium text-slate-800 shadow-sm hover:bg-slate-50"
      >
        <span aria-hidden="true">{icon}</span>
        <span>{label}</span>
      </Link>
    </motion.div>
  );
}

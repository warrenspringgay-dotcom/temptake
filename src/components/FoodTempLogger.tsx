// src/app/(protected)/dashboard/page.tsx
"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import type { AuthChangeEvent, Session } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabaseBrowser";
import { getActiveOrgIdClient } from "@/lib/orgClient";
import { getActiveLocationIdClient } from "@/lib/locationClient";
import OnboardingBanner from "@/components/OnboardingBanner";
import WelcomeGate from "@/components/WelcomeGate";
import type { User } from "@supabase/supabase-js";

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

type FourWeekBannerState =
  | { kind: "none" }
  | {
      kind: "show";
      issues: number;
      periodFrom: string;
      periodTo: string;
      reason: "overdue" | "month_end" | "issues";
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

// dd-mm-yyyy (local date parts)
function formatDDMMYYYY(val: any): string | null {
  if (!val) return null;
  const d = new Date(val);
  if (Number.isNaN(d.getTime())) return null;

  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = String(d.getFullYear());

  return `${dd}-${mm}-${yyyy}`;
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

function clampPct(n: number) {
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(100, n));
}

function daysBetween(aISO: string, bISO: string) {
  const a = new Date(aISO);
  const b = new Date(bISO);
  if (Number.isNaN(a.getTime()) || Number.isNaN(b.getTime())) return 999999;
  const a0 = new Date(a);
  const b0 = new Date(b);
  a0.setHours(0, 0, 0, 0);
  b0.setHours(0, 0, 0, 0);
  return Math.round((b0.getTime() - a0.getTime()) / 86400000);
}

function isLikelyMonthEnd(d = new Date()) {
  // "First login after month end" heuristic:
  // If it's within first 3 days of the month, treat as month end review time.
  const day = d.getDate();
  return day <= 3;
}

/* ---------- Small UI helpers ---------- */

const KPI_HEIGHT = "min-h-[132px]";

function ProgressBar({
  pct,
  tone,
}: {
  pct: number;
  tone: "danger" | "warn" | "ok" | "neutral";
}) {
  const bg =
    tone === "danger"
      ? "bg-red-200/70"
      : tone === "warn"
      ? "bg-amber-200/70"
      : tone === "ok"
      ? "bg-emerald-200/70"
      : "bg-slate-200/70";

  const fill =
    tone === "danger"
      ? "bg-red-500"
      : tone === "warn"
      ? "bg-amber-500"
      : tone === "ok"
      ? "bg-emerald-500"
      : "bg-slate-500";

  const p = clampPct(pct);

  return (
    <div className={cls("h-3 w-full overflow-hidden rounded-full", bg)}>
      <div
        className={cls("h-full rounded-full transition-all duration-300", fill)}
        style={{ width: `${p}%` }}
      />
    </div>
  );
}

function KpiTile({
  title,
  icon,
  tone,
  big,
  sub,
  href,
  onClick,
  accent = true,
  footer,
  canHover,
}: {
  title: string;
  icon: string;
  tone: "danger" | "warn" | "ok" | "neutral";
  big: React.ReactNode;
  sub: React.ReactNode;
  href?: string;
  onClick?: () => void;
  accent?: boolean;
  footer?: React.ReactNode;
  canHover: boolean;
}) {
  const toneCls =
    tone === "danger"
      ? "border-red-200 bg-red-50/90 text-red-900"
      : tone === "warn"
      ? "border-amber-200 bg-amber-50/90 text-amber-950"
      : tone === "ok"
      ? "border-emerald-200 bg-emerald-50/90 text-emerald-950"
      : "border-slate-200 bg-white/90 text-slate-900";

  const accentCls =
    tone === "danger"
      ? "bg-red-400"
      : tone === "warn"
      ? "bg-amber-400"
      : tone === "ok"
      ? "bg-emerald-400"
      : "bg-slate-300";

  const inner = (
    <motion.div
      initial={{ opacity: 0, y: 10, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ type: "spring", stiffness: 260, damping: 20 }}
      whileHover={canHover ? { y: -3 } : undefined}
      className={cls(
        "relative rounded-2xl border p-4 shadow-sm overflow-hidden",
        "w-full h-full text-left",
        KPI_HEIGHT,
        "flex flex-col",
        toneCls
      )}
    >
      {accent ? (
        <div
          className={cls(
            "absolute left-0 top-3 bottom-3 w-1.5 rounded-full opacity-80",
            accentCls
          )}
        />
      ) : null}

      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-[11px] font-extrabold uppercase tracking-[0.22em] text-slate-700/90">
            {title}
          </div>
          <div className="mt-2 text-4xl font-extrabold leading-none drop-shadow-sm">
            {big}
          </div>
        </div>

        <div className="shrink-0 text-lg opacity-90" aria-hidden="true">
          {icon}
        </div>
      </div>

      <div className="mt-2 text-[12px] font-medium text-slate-700/90 line-clamp-2">
        {sub}
      </div>

      <div className="mt-auto pt-3">
        <div className="h-[28px]">{footer ?? null}</div>
      </div>
    </motion.div>
  );

  if (href) {
    return (
      <Link href={href} className="block w-full h-full">
        {inner}
      </Link>
    );
  }

  if (onClick) {
    return (
      <button type="button" onClick={onClick} className="block w-full h-full">
        {inner}
      </button>
    );
  }

  return <div className="w-full h-full">{inner}</div>;
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

  const [user, setUser] = React.useState<any | null>(null);
  const [authReady, setAuthReady] = React.useState(false);

  // ✅ Four-week banner state
  const [fourWeekBanner, setFourWeekBanner] = useState<FourWeekBannerState>({
    kind: "none",
  });

  React.useEffect(() => {
    let mounted = true;

    supabase.auth.getUser().then(({ data }: { data: { user: User | null } }) => {
      if (!mounted) return;
      setUser(data?.user ?? null);
      setAuthReady(true);
    });

    const { data: sub } = supabase.auth.onAuthStateChange(
      (_event: AuthChangeEvent, session: Session | null) => {
        if (!mounted) return;
        setUser(session?.user ?? null);
        setAuthReady(true);
      }
    );

    return () => {
      mounted = false;
      sub?.subscription?.unsubscribe();
    };
  }, []);

  // Detect hover capability (prevents transforms on touch devices)
  const [canHover, setCanHover] = useState(false);
  useEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia?.("(hover: hover) and (pointer: fine)");
    const update = () => setCanHover(!!mq?.matches);
    update();
    mq?.addEventListener?.("change", update);
    return () => mq?.removeEventListener?.("change", update);
  }, []);

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
          loadFourWeekBanner(today, cancelled),
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

  async function loadTrainingAndAllergenKpi(orgId: string, cancelled: boolean) {
    const soon = new Date();
    soon.setDate(soon.getDate() + 14);
    const todayD = new Date();

    let trainingDueSoon = 0;
    let trainingOver = 0;
    let allergenDueSoon = 0;
    let allergenOver = 0;

    // Training
    try {
      const { data } = await supabase.from("team_members").select("*").eq("org_id", orgId);

      (data ?? []).forEach((r: any) => {
        const raw =
          r.training_expires_at ?? r.training_expiry ?? r.expires_at ?? null;
        if (!raw) return;
        const d = new Date(raw);
        if (Number.isNaN(d.getTime())) return;
        if (d < todayD) trainingOver++;
        else if (d <= soon) trainingDueSoon++;
      });
    } catch {}

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
    } catch {}

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
        .select("id, org_id, location_id, author_initials, message, color, created_at")
        .eq("org_id", orgId)
        .order("created_at", { ascending: false })
        .limit(3);

      if (error) throw error;
      if (cancelled) return;

      const mapped: WallPost[] =
        (data ?? []).map((r: any) => ({
          id: String(r.id),
          initials: r.author_initials ?? r.staff_initials ?? r.initials ?? "??",
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

  // ✅ NEW: Four-week review banner logic
  async function loadFourWeekBanner(todayISO: string, cancelled: boolean) {
    try {
      if (typeof window === "undefined") return;

      const reviewedAtRaw = localStorage.getItem("tt_four_week_reviewed_at");
      const lastReviewedISO = reviewedAtRaw ? toISODate(reviewedAtRaw) : null;

      // fetch current summary (fast, and lets us show “issues found”)
      const res = await fetch(`/four-week-review/summary?to=${encodeURIComponent(todayISO)}`, {
        cache: "no-store",
      });

      if (!res.ok) return;
      const payload = await res.json();

      const issues = Number(payload?.issues ?? 0);
      const periodFrom = String(payload?.summary?.period?.from ?? "");
      const periodTo = String(payload?.summary?.period?.to ?? todayISO);

      if (cancelled) return;

      const overdue = !lastReviewedISO || daysBetween(lastReviewedISO, todayISO) >= 28;
      const monthEnd = isLikelyMonthEnd(new Date());

      // Show banner if:
      // - overdue (28+ days since mark reviewed), OR
      // - month-end window (first 3 days of month), OR
      // - there are issues (so it’s useful, not naggy)
      let reason: FourWeekBannerState["reason"] | null = null;
      if (issues > 0) reason = "issues";
      else if (overdue) reason = "overdue";
      else if (monthEnd) reason = "month_end";

      if (!reason) {
        setFourWeekBanner({ kind: "none" });
        return;
      }

      setFourWeekBanner({
        kind: "show",
        issues,
        periodFrom,
        periodTo,
        reason,
      });
    } catch {
      // keep quiet
      setFourWeekBanner({ kind: "none" });
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
    if (kpi.allergenOver > 0) bits.push(`${kpi.allergenOver} allergen review overdue`);
    if (!bits.length) return "No training, allergen or temperature issues flagged.";
    return bits.join(" · ");
  })();

  const openTempModal = () => {
    if (typeof window === "undefined") return;
    window.dispatchEvent(new Event("tt-open-temp-modal"));
  };

  const cleaningPct =
    kpi.cleaningDueToday > 0
      ? (kpi.cleaningDoneToday / kpi.cleaningDueToday) * 100
      : 0;

  const cleaningTone: "danger" | "warn" | "ok" | "neutral" =
    kpi.cleaningDueToday === 0
      ? "neutral"
      : kpi.cleaningDoneToday === kpi.cleaningDueToday
      ? "ok"
      : kpi.cleaningDoneToday === 0
      ? "danger"
      : "warn";

  const tempTone: "danger" | "warn" | "ok" | "neutral" =
    kpi.tempLogsToday === 0 ? "danger" : "ok";

  const alertsTone: "danger" | "warn" | "ok" | "neutral" = hasAnyKpiAlert
    ? "danger"
    : "ok";

  const fourWeekBannerTone =
    fourWeekBanner.kind === "show"
      ? fourWeekBanner.issues > 0
        ? "border-amber-200 bg-amber-50/90 text-amber-950"
        : "border-slate-200 bg-white/80 text-slate-900"
      : "";

  /* ---------- render ---------- */
  return (
    <>
      <WelcomeGate />
      <OnboardingBanner />

      {/* ✅ Four-week review banner */}
      {fourWeekBanner.kind === "show" && (
        <div className="mx-auto w-full max-w-6xl px-3 sm:px-4 mt-3">
          <div
            className={cls(
              "rounded-3xl border p-4 shadow-lg shadow-slate-900/5 backdrop-blur",
              fourWeekBannerTone
            )}
          >
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <div className="text-sm font-extrabold">
                  Four-week review ready
                </div>
                <div className="mt-1 text-xs font-medium opacity-90">
                  Period:{" "}
                  <span className="font-extrabold">
                    {formatDDMMYYYY(fourWeekBanner.periodFrom) ?? "—"} →{" "}
                    {formatDDMMYYYY(fourWeekBanner.periodTo) ?? "—"}
                  </span>
                  {" · "}
                  Issues found:{" "}
                  <span className="font-extrabold">{fourWeekBanner.issues}</span>
                </div>
                <div className="mt-1 text-[11px] font-medium opacity-80">
                  {fourWeekBanner.reason === "issues"
                    ? "Recurring issues detected. Fix the top items and you look like you run the place."
                    : fourWeekBanner.reason === "overdue"
                    ? "It’s been ~4 weeks since the last review. Time to sanity-check the diary."
                    : "Month-end check-in. One quick review now saves pain later."}
                </div>
              </div>

              <div className="flex gap-2 shrink-0">
                <Link
                  href="/four-week-review"
                  className="inline-flex items-center justify-center rounded-2xl bg-slate-900 px-3 py-2 text-xs font-extrabold text-white shadow-sm hover:bg-slate-800"
                >
                  View
                </Link>

                <button
                  type="button"
                  onClick={() => {
                    localStorage.setItem("tt_four_week_reviewed_at", new Date().toISOString());
                    setFourWeekBanner({ kind: "none" });
                  }}
                  className="inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-white/80 px-3 py-2 text-xs font-extrabold text-slate-900 shadow-sm hover:bg-white"
                >
                  Dismiss
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="mx-auto w-full max-w-6xl px-3 sm:px-4 mt-4">
        <header className="text-center">
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 leading-tight">
            {headerDate}
          </h1>
          <p className="mt-0.5 text-xs sm:text-sm font-medium text-slate-500">
            Safety, cleaning and compliance at a glance.
          </p>
        </header>

        <section className="mt-3 rounded-3xl border border-white/50 bg-white/80 p-3 sm:p-4 shadow-lg shadow-slate-900/5 backdrop-blur space-y-3">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 items-stretch">
            <KpiTile
              canHover={canHover}
              title="Temperature logs"
              icon={kpi.tempLogsToday === 0 ? "❌" : "✅"}
              tone={tempTone}
              big={kpi.tempLogsToday}
              sub={
                kpi.tempLogsToday === 0
                  ? "No temperatures logged yet today."
                  : "At least one temperature check recorded."
              }
              onClick={openTempModal}
              footer={
                <div className="flex items-center justify-between text-[11px] font-semibold text-slate-700/90">
                  <span>Tap to log</span>
                  <span className="opacity-80">Today</span>
                </div>
              }
            />

            <KpiTile
              canHover={canHover}
              title="Cleaning (today)"
              icon="🧽"
              tone={cleaningTone}
              big={
                <span>
                  {kpi.cleaningDoneToday}/{kpi.cleaningDueToday}
                </span>
              }
              sub={
                kpi.cleaningDueToday === 0
                  ? "No cleaning tasks scheduled for today."
                  : kpi.cleaningDoneToday === kpi.cleaningDueToday
                  ? "All scheduled cleaning tasks completed."
                  : "Some scheduled cleaning tasks still open."
              }
              href="/cleaning-rota"
              footer={
                kpi.cleaningDueToday > 0 ? (
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-[11px] font-semibold text-slate-700/90">
                      <span>Progress</span>
                      <span>{Math.round(clampPct(cleaningPct))}%</span>
                    </div>
                    <ProgressBar pct={cleaningPct} tone={cleaningTone} />
                  </div>
                ) : (
                  <div className="flex items-center justify-between text-[11px] font-semibold text-slate-700/90">
                    <span>Progress</span>
                    <span>0%</span>
                  </div>
                )
              }
            />

            <KpiTile
              canHover={canHover}
              title="Alerts"
              icon={hasAnyKpiAlert ? "⚠️" : "✅"}
              tone={alertsTone}
              big={alertsCount}
              sub={alertsSummary}
              href="/reports"
              footer={
                <div className="flex items-center justify-between text-[11px] font-semibold text-slate-700/90">
                  <span>View details</span>
                  <span className="opacity-80">{hasAnyKpiAlert ? "Now" : "OK"}</span>
                </div>
              }
            />
          </div>

          {err && (
            <div className="mt-1 rounded-2xl border border-red-200 bg-red-50/90 px-3 py-2 text-xs font-semibold text-red-800">
              {err}
            </div>
          )}
        </section>

        <section className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="rounded-3xl border border-white/40 bg-white/80 p-4 shadow-md shadow-slate-900/5 backdrop-blur flex flex-col">
            <div className="mb-2 flex items-center justify-between gap-2">
              <div>
                <h2 className="text-sm font-extrabold text-slate-900">Kitchen wall</h2>
                <p className="text-[11px] font-medium text-slate-500">
                  Latest three notes from the team.
                </p>
              </div>
              <Link
                href="/wall"
                className="text-[11px] font-semibold text-amber-700 hover:text-amber-800 underline-offset-2 hover:underline"
              >
                View wall
              </Link>
            </div>

            {wallPosts.length === 0 ? (
              <div className="mt-1 rounded-2xl border border-dashed border-slate-200 bg-slate-50/70 px-3 py-4 text-xs text-slate-500 flex-1 flex items-center">
                No posts yet. When the team adds messages on the wall, the latest three will show here.
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
                    whileHover={canHover ? { y: -3 } : undefined}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <div className="text-base font-extrabold tracking-wide text-slate-900">
                        {p.initials || "??"}
                      </div>

                      <span className="rounded-full bg-white/60 px-2 py-0.5 text-[10px] font-semibold text-slate-600">
                        {formatDDMMYYYY(p.created_at) ?? ""}
                      </span>
                    </div>

                    <div className="text-[11px] font-medium text-slate-800 line-clamp-3">
                      {p.message}
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </div>

          <div className="rounded-3xl border border-amber-200 bg-amber-50/90 p-4 shadow-md shadow-amber-200/60 flex flex-col">
            <div className="mb-2 flex items-center justify-between gap-2">
              <h2 className="text-sm font-extrabold text-amber-900">Employee of the month</h2>
              <span className="text-xl" aria-hidden="true">
                🏆
              </span>
            </div>

            {eom ? (
              <>
                <div className="text-lg font-extrabold text-amber-900 truncate">
                  {eom.display_name}
                </div>

                <div className="mt-2 flex flex-wrap gap-2">
                  <span className="rounded-full bg-white/70 px-2.5 py-1 text-[11px] font-extrabold text-amber-900 border border-amber-200/60">
                    ⭐ {eom.points ?? 0} points
                  </span>
                  <span className="rounded-full bg-white/70 px-2.5 py-1 text-[11px] font-bold text-amber-900 border border-amber-200/60">
                    🧽 {eom.cleaning_count ?? 0} cleanings
                  </span>
                  <span className="rounded-full bg-white/70 px-2.5 py-1 text-[11px] font-bold text-amber-900 border border-amber-200/60">
                    🌡 {eom.temp_logs_count ?? 0} temps
                  </span>
                </div>

                <p className="mt-3 text-[11px] font-medium text-amber-900/80">
                  Based on completed cleaning tasks and temperature logs this month.
                </p>
              </>
            ) : (
              <p className="text-xs font-medium text-amber-900/80">
                No leaderboard data yet. Once your team completes cleaning tasks and logs temperatures, the top performer will be highlighted here.
              </p>
            )}

            <div className="mt-3">
              <Link
                href="/leaderboard"
                className="inline-flex items-center rounded-2xl bg-amber-600 px-3 py-1.5 text-xs font-extrabold text-white shadow-sm hover:bg-amber-700"
              >
                View full leaderboard
              </Link>
            </div>
          </div>
        </section>

        <section className="mt-4 rounded-3xl border border-white/40 bg-white/80 p-4 shadow-md shadow-slate-900/5 backdrop-blur space-y-3">
          <h2 className="text-sm font-extrabold text-slate-900">Quick actions</h2>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <QuickLink href="/routines" label="Routines" icon="📋" canHover={canHover} />
            <QuickLink href="/allergens" label="Allergens" icon="⚠️" canHover={canHover} />
            <QuickLink href="/cleaning-rota" label="Cleaning rota" icon="🧽" canHover={canHover} />
            <QuickLink href="/team" label="Team & training" icon="👥" canHover={canHover} />
            <QuickLink href="/reports" label="Reports" icon="📊" canHover={canHover} />
            <QuickLink href="/locations" label="Locations & sites" icon="📍" canHover={canHover} />
            <QuickLink href="/manager" label="Manager view" icon="💼" canHover={canHover} />
            <QuickLink href="/help" label="Help & support" icon="❓" canHover={canHover} />
          </div>
        </section>

        {loading && (
          <p className="text-center text-[11px] font-medium text-slate-400">
            Loading dashboard…
          </p>
        )}
      </div>
    </>
  );
}

/* ---------- Quick link ---------- */

function QuickLink({
  href,
  label,
  icon,
  canHover,
}: {
  href: string;
  label: string;
  icon: string;
  canHover: boolean;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ type: "spring", stiffness: 260, damping: 22 }}
      whileHover={canHover ? { y: -3 } : undefined}
    >
      <Link
        href={href}
        className="flex items-center justify-center gap-1 rounded-2xl border border-slate-200 bg-white/80 px-3 py-2 text-xs font-semibold text-slate-800 shadow-sm hover:bg-slate-50"
      >
        <span aria-hidden="true">{icon}</span>
        <span>{label}</span>
      </Link>
    </motion.div>
  );
}

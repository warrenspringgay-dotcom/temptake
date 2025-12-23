// src/components/ComplianceIndicatorShell.tsx
"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { supabase } from "@/lib/supabaseBrowser";
import { getActiveOrgIdClient } from "@/lib/orgClient";
import { getActiveLocationIdClient } from "@/lib/locationClient";

/* ---------- Types ---------- */

type Kpi = {
  tempLogsToday: number;
  tempFails7d: number;
  cleaningDueToday: number;
  cleaningDoneToday: number;
  trainingDueSoon: number;
  trainingOver: number;
  allergenDueSoon: number;
  allergenOver: number;
};

type CleanTask = {
  id: string;
  frequency: "daily" | "weekly" | "monthly";
  weekday: number | null;
  month_day: number | null;
};

/* ---------- Helpers ---------- */

const LS_HIDE = "tt_hide_compliance_orb_v1";

const isoToday = () => new Date().toISOString().slice(0, 10);

function getDow1to7(ymd: string) {
  const date = new Date(ymd);
  return ((date.getDay() + 6) % 7) + 1; // Mon = 1, Sun = 7
}

function getDom(ymd: string) {
  return new Date(ymd).getDate();
}

function clamp(n: number, a: number, b: number) {
  return Math.max(a, Math.min(b, n));
}

function toFrequency(v: any): CleanTask["frequency"] {
  const s = String(v ?? "daily").toLowerCase();
  if (s === "weekly" || s === "monthly") return s;
  return "daily";
}

function isDueOn(task: CleanTask, ymd: string) {
  if (task.frequency === "daily") return true;
  if (task.frequency === "weekly") return task.weekday === getDow1to7(ymd);
  return task.month_day === getDom(ymd);
}

function labelFrom(score: number) {
  if (score >= 90) return "OK";
  if (score >= 70) return "GOOD";
  if (score >= 40) return "RISK";
  return "BAD";
}

function ringTone(score: number) {
  if (score >= 90) return "rgba(16,185,129,0.95)"; // emerald
  if (score >= 70) return "rgba(34,197,94,0.95)"; // green
  if (score >= 40) return "rgba(245,158,11,0.95)"; // amber
  return "rgba(239,68,68,0.95)"; // red
}

/* ---------- Component ---------- */

export default function ComplianceIndicatorShell() {
  const pathname = usePathname();

  const [mounted, setMounted] = useState(false);
  const [hidden, setHidden] = useState(false);
  const [kpi, setKpi] = useState<Kpi>({
    tempLogsToday: 0,
    tempFails7d: 0,
    cleaningDueToday: 0,
    cleaningDoneToday: 0,
    trainingDueSoon: 0,
    trainingOver: 0,
    allergenDueSoon: 0,
    allergenOver: 0,
  });

  const refreshTimer = useRef<number | null>(null);

  // Mark as client-mounted
  useEffect(() => {
    setMounted(true);
  }, []);

  // Hydrate "hidden" from localStorage, client-only
  useEffect(() => {
    if (!mounted) return;
    try {
      const v = window.localStorage.getItem(LS_HIDE);
      setHidden(v === "1");
    } catch {
      setHidden(false);
    }
  }, [mounted]);

  const handleHide = () => {
    setHidden(true);
    try {
      window.localStorage.setItem(LS_HIDE, "1");
    } catch {
      // ignore storage failures
    }
  };

  // Until we know we’re on the client, render nothing.
  if (!mounted) return null;

  // Hide on marketing / auth routes
  const isMarketingOrAuth =
    !pathname ||
    pathname === "/" ||
    pathname.startsWith("/launch") ||
    pathname.startsWith("/pricing") ||
    pathname.startsWith("/login") ||
    pathname.startsWith("/signup") ||
    pathname.startsWith("/entry") ||
    pathname.startsWith("/demo-wall");

  if (isMarketingOrAuth || hidden) {
    return null;
  }

  /* ---------- Data loading ---------- */

  async function loadTempsKpi(
    orgId: string,
    locationId: string | null,
    todayISO: string
  ) {
    const since = new Date();
    since.setDate(since.getDate() - 7);

    let query = supabase
      .from("food_temp_logs")
      .select("at,created_at,status,org_id,location_id")
      .eq("org_id", orgId)
      .order("at", { ascending: false })
      .limit(500);

    if (locationId) {
      query = query.eq("location_id", locationId);
    }

    const { data, error } = await query;
    if (error) throw error;

    let tempLogsToday = 0;
    let tempFails7d = 0;

    (data ?? []).forEach((r: any) => {
      const at = r.at ?? r.created_at ?? null;
      const d = at ? new Date(at) : null;
      if (!d || Number.isNaN(d.getTime())) return;

      const iso = d.toISOString().slice(0, 10);
      if (iso === todayISO) tempLogsToday += 1;
      if (d >= since && String(r.status ?? "").toLowerCase() === "fail") {
        tempFails7d += 1;
      }
    });

    setKpi((prev) => ({ ...prev, tempLogsToday, tempFails7d }));
  }

  async function loadCleaningKpi(
    orgId: string,
    locationId: string | null,
    todayISO: string
  ) {
    if (!locationId) {
      setKpi((prev) => ({
        ...prev,
        cleaningDueToday: 0,
        cleaningDoneToday: 0,
      }));
      return;
    }

    const { data: tasks, error: tErr } = await supabase
      .from("cleaning_tasks")
      .select("id,frequency,weekday,month_day")
      .eq("org_id", orgId)
      .eq("location_id", locationId);

    if (tErr) throw tErr;

    const allTasks: CleanTask[] =
      (tasks ?? []).map((r: any) => ({
        id: String(r.id),
        frequency: toFrequency(r.frequency),
        weekday: r.weekday ? Number(r.weekday) : null,
        month_day: r.month_day ? Number(r.month_day) : null,
      })) || [];

    const due = allTasks.filter((t) => isDueOn(t, todayISO));
    const cleaningDueToday = due.length;

    let cleaningDoneToday = 0;
    if (cleaningDueToday > 0) {
      const { data: runs, error: rErr } = await supabase
        .from("cleaning_task_runs")
        .select("task_id,run_on")
        .eq("org_id", orgId)
        .eq("location_id", locationId)
        .eq("run_on", todayISO);

      if (rErr) throw rErr;

      const runKey = new Set((runs ?? []).map((r: any) => r.task_id));
      cleaningDoneToday = due.filter((t) => runKey.has(t.id)).length;
    }

    setKpi((prev) => ({ ...prev, cleaningDueToday, cleaningDoneToday }));
  }

  async function loadTrainingAllergenKpi(orgId: string) {
    // training
    let trainingDueSoon = 0;
    let trainingOver = 0;

    try {
      const { data, error } = await supabase
        .from("trainings")
        .select("expires_on")
        .eq("org_id", orgId)
        .limit(500);

      if (error) throw error;

      const today = new Date();
      const soon = new Date();
      soon.setDate(soon.getDate() + 30);

      (data ?? []).forEach((r: any) => {
        if (!r.expires_on) return;
        const exp = new Date(r.expires_on);
        if (Number.isNaN(exp.getTime())) return;
        if (exp < today) trainingOver++;
        else if (exp <= soon) trainingDueSoon++;
      });
    } catch {
      // ignore
    }

    // allergen review
    let allergenDueSoon = 0;
    let allergenOver = 0;

    try {
      const { data, error } = await supabase
        .from("allergen_review_log")
        .select("reviewed_on,interval_days")
        .eq("org_id", orgId)
        .order("reviewed_on", { ascending: false })
        .limit(365);

      if (error) throw error;

      const todayD = new Date();
      todayD.setHours(0, 0, 0, 0);
      const soon = new Date(todayD);
      soon.setDate(soon.getDate() + 30);

      (data ?? []).forEach((r: any) => {
        const last = r.reviewed_on ? new Date(r.reviewed_on) : null;
        const interval = Number(r.interval_days ?? 0);
        if (!last || !Number.isFinite(interval) || interval <= 0) return;

        const due = new Date(last);
        due.setDate(due.getDate() + interval);

        if (due < todayD) allergenOver++;
        else if (due <= soon) allergenDueSoon++;
      });
    } catch {
      // ignore
    }

    setKpi((prev) => ({
      ...prev,
      trainingDueSoon,
      trainingOver,
      allergenDueSoon,
      allergenOver,
    }));
  }

  async function refresh() {
    const orgId = await getActiveOrgIdClient();
    if (!orgId) return;

    const locationId = await getActiveLocationIdClient();
    const today = isoToday();

    await Promise.all([
      loadTempsKpi(orgId, locationId, today),
      loadCleaningKpi(orgId, locationId, today),
      loadTrainingAllergenKpi(orgId),
    ]);
  }

  // Initial load
  useEffect(() => {
    let dead = false;

    (async () => {
      try {
        if (dead) return;
        await refresh();
      } catch {
        // swallow errors – orb is nice-to-have, not app-breaking
      }
    })();

    return () => {
      dead = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Realtime subscriptions (debounced)
  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const orgId = await getActiveOrgIdClient();
        if (!orgId || cancelled) return;

        const channel = supabase
          .channel(`tt-compliance-${orgId}`)
          .on(
            "postgres_changes",
            {
              event: "*",
              schema: "public",
              table: "cleaning_task_runs",
              filter: `org_id=eq.${orgId}`,
            },
            () => scheduleRefresh()
          )
          .on(
            "postgres_changes",
            {
              event: "*",
              schema: "public",
              table: "food_temp_logs",
              filter: `org_id=eq.${orgId}`,
            },
            () => scheduleRefresh()
          )
          .on(
            "postgres_changes",
            {
              event: "*",
              schema: "public",
              table: "trainings",
              filter: `org_id=eq.${orgId}`,
            },
            () => scheduleRefresh()
          )
          .on(
            "postgres_changes",
            {
              event: "*",
              schema: "public",
              table: "allergen_review_log",
              filter: `org_id=eq.${orgId}`,
            },
            () => scheduleRefresh()
          )
          .subscribe();

        return () => {
          supabase.removeChannel(channel);
        };
      } catch {
        // no realtime, still fine
      }
    })();

    function scheduleRefresh() {
      if (refreshTimer.current) {
        window.clearTimeout(refreshTimer.current);
      }
      refreshTimer.current = window.setTimeout(() => {
        refresh().catch(() => {});
      }, 250);
    }

    return () => {
      cancelled = true;
      if (refreshTimer.current) {
        window.clearTimeout(refreshTimer.current);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ---------- Score + UI ---------- */

  const score = useMemo(() => {
    const cleaningDue = kpi.cleaningDueToday;
    const cleaningDone = kpi.cleaningDoneToday;

    const cleaningPct =
      cleaningDue > 0 ? clamp(cleaningDone / cleaningDue, 0, 1) : 0;
    const cleaningScore = Math.round(cleaningPct * 40);

    const tempScore =
      kpi.tempLogsToday <= 0 ? 0 : kpi.tempFails7d > 0 ? 0 : 40;

    const trainingScore =
      kpi.trainingOver > 0 ? 0 : kpi.trainingDueSoon > 0 ? 5 : 10;

    const allergenScore =
      kpi.allergenOver > 0 ? 0 : kpi.allergenDueSoon > 0 ? 5 : 10;

    return clamp(tempScore + cleaningScore + trainingScore + allergenScore, 0, 100);
  }, [kpi]);

  const label = useMemo(() => labelFrom(score), [score]);
  const toneColor = useMemo(() => ringTone(score), [score]);

  const deg = Math.round((score / 100) * 360);

  return (
    <div className="print:hidden pointer-events-none fixed right-4 top-[72px] z-50">
      <div
        className="pointer-events-auto relative h-[112px] w-[112px] rounded-full border border-white/30 bg-white/25 shadow-xl backdrop-blur-md"
        style={{
          boxShadow: "0 12px 32px rgba(0,0,0,0.18)",
        }}
        aria-label="Compliance indicator"
        title="Operational compliance (today)"
      >
        {/* arc */}
        <svg
          viewBox="0 0 100 100"
          className="absolute inset-0 h-full w-full"
          aria-hidden="true"
        >
          <defs>
            <linearGradient id="complianceArc" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor={toneColor} />
              <stop offset="100%" stopColor={toneColor} />
            </linearGradient>
          </defs>
          <circle
            cx="50"
            cy="50"
            r="44"
            stroke="rgba(248,250,252,0.85)"
            strokeWidth="8"
            fill="none"
          />
          <circle
            cx="50"
            cy="50"
            r="44"
            stroke="url(#complianceArc)"
            strokeWidth="8"
            fill="none"
            strokeDasharray={`${deg * 2}, 999`}
            strokeLinecap="round"
            transform="rotate(-90 50 50)"
          />
        </svg>

        {/* centre content */}
        <div className="relative flex h-full w-full flex-col items-center justify-center gap-0.5">
          <div className="text-xs font-semibold text-slate-500">Compliance</div>
          <div className="text-xl font-bold text-slate-900">
            {score}
            <span className="text-[11px] align-top">%</span>
          </div>
          <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
            {label}
          </div>

          {/* close / hide */}
          <button
            type="button"
            onClick={handleHide}
            className="absolute right-1.5 top-1.5 inline-flex h-5 w-5 items-center justify-center rounded-full bg-white/80 text-[10px] font-bold text-slate-500 shadow hover:bg-white"
            aria-label="Hide compliance indicator"
          >
            ✕
          </button>
        </div>
      </div>
    </div>
  );
}

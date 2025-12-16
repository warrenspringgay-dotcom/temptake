// src/components/ComplianceIndicatorShell.tsx
"use client";

import React, { useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import { supabase } from "@/lib/supabaseBrowser";
import { getActiveOrgIdClient } from "@/lib/orgClient";
import { getActiveLocationIdClient } from "@/lib/locationClient";

type Kpi = {
  // temps
  tempFails7d: number;
  tempLogs7d: number;

  // cleaning
  cleaningTasksTotal: number;
  cleaningDueToday: number;
  cleaningDoneToday: number;

  // training
  teamCount: number;
  trainingOver: number;
  trainingDueSoon: number;

  // allergens
  allergenConfigCount: number;
  allergenOver: number;
  allergenDueSoon: number;
};

const SIZE = 112;
const STROKE = 10;
const R = (SIZE - STROKE) / 2;
const C = 2 * Math.PI * R;

const LS_DISMISS = "tt_compliance_orb_dismissed_until";

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function dismissedNow(): boolean {
  try {
    const until = localStorage.getItem(LS_DISMISS);
    if (!until) return false;
    return new Date(until).getTime() > Date.now();
  } catch {
    return false;
  }
}

function dismissForHours(hours = 8) {
  try {
    const d = new Date();
    d.setHours(d.getHours() + hours);
    localStorage.setItem(LS_DISMISS, d.toISOString());
  } catch {}
}

export default function ComplianceIndicatorShell() {
  const pathname = usePathname();

  const hide = useMemo(() => {
    if (!pathname) return true;

    // hide on auth + marketing + reports (you asked) + print handled by print:hidden too
    return (
      pathname.startsWith("/login") ||
      pathname.startsWith("/signup") ||
      pathname.startsWith("/forgot-password") ||
      pathname.startsWith("/reset-password") ||
      pathname.startsWith("/launch") ||
      pathname.startsWith("/pricing") ||
      pathname.startsWith("/reports")
    );
  }, [pathname]);

  const [signedIn, setSignedIn] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  const [kpi, setKpi] = useState<Kpi>({
    tempFails7d: 0,
    tempLogs7d: 0,
    cleaningTasksTotal: 0,
    cleaningDueToday: 0,
    cleaningDoneToday: 0,
    teamCount: 0,
    trainingOver: 0,
    trainingDueSoon: 0,
    allergenConfigCount: 0,
    allergenOver: 0,
    allergenDueSoon: 0,
  });

  useEffect(() => {
    setDismissed(dismissedNow());
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function run() {
      const { data } = await supabase.auth.getSession();
      if (cancelled) return;

      if (!data.session) {
        setSignedIn(false);
        return;
      }
      setSignedIn(true);

      const orgId = await getActiveOrgIdClient();
      const locationId = await getActiveLocationIdClient();
      if (!orgId) return;

      const today = todayISO();
      const since = new Date();
      since.setDate(since.getDate() - 7);

      let tempFails7d = 0;
      let tempLogs7d = 0;

      // temps
      try {
        const { data: temps } = await supabase
          .from("food_temp_logs")
          .select("at,status,created_at")
          .eq("org_id", orgId)
          .limit(500);

        (temps ?? []).forEach((r: any) => {
          const d = new Date(r.at ?? r.created_at);
          if (d >= since) {
            tempLogs7d++;
            if (r.status === "fail") tempFails7d++;
          }
        });
      } catch {}

      // cleaning
      let cleaningTasksTotal = 0;
      let cleaningDueToday = 0;
      let cleaningDoneToday = 0;

      try {
        if (locationId) {
          const { data: tasks } = await supabase
            .from("cleaning_tasks")
            .select("id,frequency,weekday,month_day")
            .eq("org_id", orgId)
            .eq("location_id", locationId);

          cleaningTasksTotal = (tasks ?? []).length;

          const due = (tasks ?? []).filter((t: any) => {
            if (t.frequency === "daily") return true;
            const d = new Date(today);
            if (t.frequency === "weekly") return t.weekday === ((d.getDay() + 6) % 7) + 1;
            if (t.frequency === "monthly") return t.month_day === d.getDate();
            return false;
          });

          cleaningDueToday = due.length;

          const { data: runs } = await supabase
            .from("cleaning_task_runs")
            .select("task_id,run_on")
            .eq("org_id", orgId)
            .eq("location_id", locationId)
            .eq("run_on", today);

          const done = new Set((runs ?? []).map((r: any) => r.task_id));
          cleaningDoneToday = due.filter((t: any) => done.has(t.id)).length;
        }
      } catch {}

      // training
      let teamCount = 0;
      let trainingOver = 0;
      let trainingDueSoon = 0;

      const soon = new Date();
      soon.setDate(soon.getDate() + 14);
      const now = new Date();

      try {
        const { data: team } = await supabase.from("team_members").select("*").eq("org_id", orgId);

        teamCount = (team ?? []).length;

        (team ?? []).forEach((r: any) => {
          const d = new Date(r.training_expires_at ?? r.training_expiry);
          if (isNaN(d.getTime())) return;
          if (d < now) trainingOver++;
          else if (d <= soon) trainingDueSoon++;
        });
      } catch {}

      // allergens
      let allergenConfigCount = 0;
      let allergenOver = 0;
      let allergenDueSoon = 0;

      try {
        const { data: ar } = await supabase
          .from("allergen_review")
          .select("last_reviewed,interval_days")
          .eq("org_id", orgId);

        allergenConfigCount = (ar ?? []).length;

        (ar ?? []).forEach((r: any) => {
          const last = new Date(r.last_reviewed);
          if (isNaN(last.getTime())) return;
          const due = new Date(last);
          due.setDate(due.getDate() + Number(r.interval_days ?? 0));
          if (due < now) allergenOver++;
          else if (due <= soon) allergenDueSoon++;
        });
      } catch {}

      if (cancelled) return;

      setKpi({
        tempFails7d,
        tempLogs7d,
        cleaningTasksTotal,
        cleaningDueToday,
        cleaningDoneToday,
        teamCount,
        trainingOver,
        trainingDueSoon,
        allergenConfigCount,
        allergenOver,
        allergenDueSoon,
      });
    }

    run();
    const t = setInterval(run, 120000);
    return () => {
      cancelled = true;
      clearInterval(t);
    };
  }, []);

  if (hide || !signedIn || dismissed) return null;

  // ---------- Scoring ----------
  // Key rule: missing setup/data DOES NOT score as "perfect".
  // Temps: if no logs in 7d => 0 for that category and status becomes SETUP.
  // Cleaning: if no tasks exist => 0 for that category and status becomes SETUP.
  // Training: if no team members => 0 for that category and status becomes SETUP.
  // Allergens: if no allergen config => 0 for that category and status becomes SETUP.

  const needsSetup =
    kpi.tempLogs7d === 0 ||
    kpi.cleaningTasksTotal === 0 ||
    kpi.teamCount === 0 ||
    kpi.allergenConfigCount === 0;

  // weights
  const W_TEMPS = 40;
  const W_CLEAN = 20;
  const W_TRAIN = 20;
  const W_ALLER = 20;

  const tempsScore =
    kpi.tempLogs7d === 0 ? 0 : kpi.tempFails7d > 0 ? 0 : W_TEMPS;

  const cleaningScore =
    kpi.cleaningTasksTotal === 0
      ? 0
      : kpi.cleaningDueToday === 0
      ? W_CLEAN
      : Math.round(clamp(kpi.cleaningDoneToday / kpi.cleaningDueToday, 0, 1) * W_CLEAN);

  const trainingScore =
    kpi.teamCount === 0 ? 0 : kpi.trainingOver > 0 ? 0 : kpi.trainingDueSoon > 0 ? 12 : W_TRAIN;

  const allergenScore =
    kpi.allergenConfigCount === 0
      ? 0
      : kpi.allergenOver > 0
      ? 0
      : kpi.allergenDueSoon > 0
      ? 12
      : W_ALLER;

  const score = clamp(tempsScore + cleaningScore + trainingScore + allergenScore, 0, 100);

  const hardFail = kpi.tempFails7d > 0 || kpi.trainingOver > 0 || kpi.allergenOver > 0;

  const warn =
    !hardFail &&
    !needsSetup &&
    (kpi.trainingDueSoon > 0 ||
      kpi.allergenDueSoon > 0 ||
      (kpi.cleaningDueToday > 0 && kpi.cleaningDoneToday < kpi.cleaningDueToday));

  const label = hardFail ? "FAIL" : needsSetup ? "SETUP" : warn ? "WARN" : "OK";

  const ring = hardFail
    ? "stroke-red-500"
    : needsSetup
    ? "stroke-slate-400"
    : warn
    ? "stroke-amber-500"
    : "stroke-emerald-500";

  const bg = hardFail
    ? "bg-red-50/40"
    : needsSetup
    ? "bg-white/25"
    : warn
    ? "bg-amber-50/35"
    : "bg-emerald-50/35";

  const dash = C * (1 - score / 100);

  return (
    <div className="fixed right-4 top-[72px] z-[60] print:hidden">
      <div
        className={[
          "relative rounded-full shadow-lg border border-white/30 backdrop-blur-md",
          "bg-white/20",
          bg,
        ].join(" ")}
        style={{ width: SIZE + 22, height: SIZE + 22 }}
      >
        {/* tiny close */}
        <button
          type="button"
          onClick={() => {
            dismissForHours(8);
            setDismissed(true);
          }}
          className="absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-full bg-white/40 text-slate-700 hover:bg-white/60"
          aria-label="Hide compliance indicator"
          title="Hide"
        >
          ✕
        </button>

        <div className="relative flex h-full w-full items-center justify-center">
          <svg width={SIZE} height={SIZE} className="rotate-[-90deg]">
            <circle
              cx={SIZE / 2}
              cy={SIZE / 2}
              r={R}
              fill="none"
              stroke="rgba(226,232,240,0.9)"
              strokeWidth={STROKE}
            />
            <circle
              cx={SIZE / 2}
              cy={SIZE / 2}
              r={R}
              fill="none"
              strokeWidth={STROKE}
              strokeLinecap="round"
              strokeDasharray={C}
              strokeDashoffset={dash}
              className={ring}
            />
          </svg>

          {/* minimal inside text only */}
          <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-900">
            <div className="text-[24px] font-extrabold leading-none">{score}%</div>
            <div className="mt-0.5 text-[11px] font-extrabold tracking-wide opacity-80">
              {label}
            </div>
            <div className="mt-1 text-[10px] font-semibold opacity-70">
              Compliance
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

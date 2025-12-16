"use client";

import React, { useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import { supabase } from "@/lib/supabaseBrowser";
import { getActiveOrgIdClient } from "@/lib/orgClient";
import { getActiveLocationIdClient } from "@/lib/locationClient";

type Kpi = {
  tempFails7d: number;
  cleaningDueToday: number;
  cleaningDoneToday: number;
  trainingOver: number;
  allergenOver: number;
  trainingDueSoon: number;
  allergenDueSoon: number;
};

const SIZE = 104; // bigger orb
const STROKE = 10;
const R = (SIZE - STROKE) / 2;
const C = 2 * Math.PI * R;

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

export default function ComplianceIndicatorShell() {
  const pathname = usePathname();

  const hide = useMemo(() => {
    if (!pathname) return true;
    return (
      pathname.startsWith("/login") ||
      pathname.startsWith("/signup") ||
      pathname.startsWith("/forgot-password") ||
      pathname.startsWith("/reset-password") ||
      pathname.startsWith("/launch") ||
      pathname.startsWith("/pricing")
    );
  }, [pathname]);

  const [signedIn, setSignedIn] = useState(false);

  const [kpi, setKpi] = useState<Kpi>({
    tempFails7d: 0,
    cleaningDueToday: 0,
    cleaningDoneToday: 0,
    trainingOver: 0,
    allergenOver: 0,
    trainingDueSoon: 0,
    allergenDueSoon: 0,
  });

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

      const today = new Date().toISOString().slice(0, 10);
      const since = new Date();
      since.setDate(since.getDate() - 7);

      let tempFails7d = 0;

      try {
        const { data: temps } = await supabase
          .from("food_temp_logs")
          .select("at,status,created_at")
          .eq("org_id", orgId)
          .limit(400);

        (temps ?? []).forEach((r: any) => {
          const d = new Date(r.at ?? r.created_at);
          if (d >= since && r.status === "fail") tempFails7d++;
        });
      } catch {}

      let cleaningDueToday = 0;
      let cleaningDoneToday = 0;

      try {
        if (locationId) {
          const { data: tasks } = await supabase
            .from("cleaning_tasks")
            .select("id,frequency,weekday,month_day")
            .eq("org_id", orgId)
            .eq("location_id", locationId);

          const due = (tasks ?? []).filter((t: any) => {
            if (t.frequency === "daily") return true;
            const d = new Date(today);
            if (t.frequency === "weekly")
              return t.weekday === ((d.getDay() + 6) % 7) + 1;
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

      let trainingOver = 0;
      let trainingDueSoon = 0;
      let allergenOver = 0;
      let allergenDueSoon = 0;

      const soon = new Date();
      soon.setDate(soon.getDate() + 14);
      const now = new Date();

      try {
        const { data: team } = await supabase
          .from("team_members")
          .select("*")
          .eq("org_id", orgId);

        (team ?? []).forEach((r: any) => {
          const d = new Date(r.training_expires_at ?? r.training_expiry);
          if (isNaN(d.getTime())) return;
          if (d < now) trainingOver++;
          else if (d <= soon) trainingDueSoon++;
        });
      } catch {}

      try {
        const { data: ar } = await supabase
          .from("allergen_review")
          .select("last_reviewed,interval_days")
          .eq("org_id", orgId);

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
        cleaningDueToday,
        cleaningDoneToday,
        trainingOver,
        allergenOver,
        trainingDueSoon,
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

  if (hide || !signedIn) return null;

  // ---------- Weighted scoring ----------
  // Temps: 40, Cleaning: 20, Training: 20, Allergens: 20
  // Hard fails hammer the category, not the whole score.

  const tempsScore = kpi.tempFails7d > 0 ? 0 : 40;

  const cleaningPct =
    kpi.cleaningDueToday > 0
      ? kpi.cleaningDoneToday / kpi.cleaningDueToday
      : 1;
  const cleaningScore = Math.round(clamp(cleaningPct, 0, 1) * 20);

  const trainingScore = kpi.trainingOver > 0 ? 0 : kpi.trainingDueSoon > 0 ? 12 : 20;

  const allergenScore = kpi.allergenOver > 0 ? 0 : kpi.allergenDueSoon > 0 ? 12 : 20;

  const score = clamp(tempsScore + cleaningScore + trainingScore + allergenScore, 0, 100);

  const hardFail =
    kpi.tempFails7d > 0 || kpi.trainingOver > 0 || kpi.allergenOver > 0;

  const warn =
    !hardFail &&
    (kpi.trainingDueSoon > 0 ||
      kpi.allergenDueSoon > 0 ||
      (kpi.cleaningDueToday > 0 &&
        kpi.cleaningDoneToday < kpi.cleaningDueToday));

  const label = hardFail ? "FAIL" : warn ? "WARN" : "OK";
  const ring = hardFail
    ? "stroke-red-500"
    : warn
    ? "stroke-amber-500"
    : "stroke-emerald-500";
  const bg = hardFail ? "bg-red-50" : warn ? "bg-amber-50" : "bg-emerald-50";

  const dash = C * (1 - score / 100);

  return (
    <div className="fixed right-4 top-[72px] z-[60] print:hidden">
      <div
        className={`rounded-full ${bg} shadow-lg border border-slate-200/60 backdrop-blur`}
        style={{ width: SIZE + 18, height: SIZE + 18 }}
      >
        <div className="relative flex h-full w-full items-center justify-center">
          <svg width={SIZE} height={SIZE} className="rotate-[-90deg]">
            <circle
              cx={SIZE / 2}
              cy={SIZE / 2}
              r={R}
              fill="none"
              stroke="#e5e7eb"
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

          <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-900">
            <div className="text-[22px] font-extrabold leading-none">
              {score}%
            </div>
            <div className="mt-0.5 text-[11px] font-extrabold tracking-wide opacity-80">
              {label}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// src/components/ComplianceIndicatorShell.tsx
"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { supabase } from "@/lib/supabaseBrowser";
import { getActiveOrgIdClient } from "@/lib/orgClient";
import { getActiveLocationIdClient } from "@/lib/locationClient";

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

type CleanFrequency = "daily" | "weekly" | "monthly";

type CleanTask = {
  id: string;
  frequency: CleanFrequency;
  weekday: number | null;
  month_day: number | null;
};

const LS_HIDE = "tt_hide_compliance_orb";

const isoToday = () => new Date().toISOString().slice(0, 10);

function getDow1to7(ymd: string) {
  const date = new Date(ymd);
  return ((date.getDay() + 6) % 7) + 1; // Mon=1..Sun=7
}

function getDom(ymd: string) {
  return new Date(ymd).getDate();
}

function toCleanFrequency(v: any): CleanFrequency {
  const s = String(v ?? "daily").toLowerCase();
  if (s === "weekly" || s === "monthly" || s === "daily") return s;
  return "daily";
}

function isDueOn(t: CleanTask, ymd: string) {
  if (t.frequency === "daily") return true;
  if (t.frequency === "weekly") return t.weekday === getDow1to7(ymd);
  return t.month_day === getDom(ymd);
}

function clamp(n: number, a: number, b: number) {
  return Math.max(a, Math.min(b, n));
}

function labelFrom(score: number) {
  if (score >= 90) return "OK";
  if (score >= 70) return "GOOD";
  if (score >= 40) return "RISK";
  return "BAD";
}

function ringTone(score: number) {
  if (score >= 90) return "rgba(16,185,129,0.95)";
  if (score >= 70) return "rgba(34,197,94,0.95)";
  if (score >= 40) return "rgba(245,158,11,0.95)";
  return "rgba(239,68,68,0.95)";
}

export default function ComplianceIndicatorShell() {
  const pathname = usePathname();

  // 1) Make this *client-only* to avoid hydration mismatch
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  const isMarketingOrAuth =
    pathname === "/" || pathname === "/login" || pathname === "/signup";

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

  // hydrate "hidden" from localStorage (client only)
  useEffect(() => {
    if (!mounted) return;
    try {
      setHidden(localStorage.getItem(LS_HIDE) === "1");
    } catch {
      // ignore
    }
  }, [mounted]);

  async function loadTempsKpi(orgId: string, locationId: string | null, todayISO: string) {
    const since = new Date();
    since.setDate(since.getDate() - 7);

    let query = supabase
      .from("food_temp_logs")
      .select("at,status,org_id,location_id")
      .eq("org_id", orgId)
      .order("at", { ascending: false })
      .limit(500);

    if (locationId) query = query.eq("location_id", locationId);

    const { data, error } = await query;
    if (error) throw error;

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

    setKpi((prev) => ({ ...prev, tempLogsToday, tempFails7d }));
  }

  async function loadCleaningKpi(orgId: string, locationId: string | null, todayISO: string) {
    if (!locationId) {
      setKpi((prev) => ({ ...prev, cleaningDueToday: 0, cleaningDoneToday: 0 }));
      return;
    }

    const { data: tData, error: tErr } = await supabase
      .from("cleaning_tasks")
      .select("id,frequency,weekday,month_day")
      .eq("org_id", orgId)
      .eq("location_id", locationId);

    if (tErr) throw tErr;

    const tasks: CleanTask[] = (tData ?? []).map((r: any) => ({
      id: String(r.id),
      frequency: toCleanFrequency(r.frequency),
      weekday: r.weekday != null ? Number(r.weekday) : null,
      month_day: r.month_day != null ? Number(r.month_day) : null,
    }));

    const dueIds = tasks.filter((t) => isDueOn(t, todayISO)).map((t) => t.id);
    const cleaningDueToday = dueIds.length;

    if (!dueIds.length) {
      setKpi((prev) => ({ ...prev, cleaningDueToday: 0, cleaningDoneToday: 0 }));
      return;
    }

    const { data: rData, error: rErr } = await supabase
      .from("cleaning_task_runs")
      .select("task_id,run_on")
      .eq("org_id", orgId)
      .eq("location_id", locationId)
      .eq("run_on", todayISO)
      .in("task_id", dueIds);

    if (rErr) throw rErr;

    const cleaningDoneToday = (rData ?? []).length;
    setKpi((prev) => ({ ...prev, cleaningDueToday, cleaningDoneToday }));
  }

  async function loadTrainingAllergenKpi(orgId: string) {
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

  // initial load (client only because mounted gate)
  useEffect(() => {
    if (!mounted) return;
    let dead = false;

    (async () => {
      try {
        if (dead) return;
        await refresh();
      } catch {
        // ignore
      }
    })();

    return () => {
      dead = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mounted]);

  // realtime subscriptions
  useEffect(() => {
    if (!mounted) return;

    let cancelled = false;

    (async () => {
      const orgId = await getActiveOrgIdClient();
      if (!orgId || cancelled) return;

      const scheduleRefresh = () => {
        if (refreshTimer.current) window.clearTimeout(refreshTimer.current);
        refreshTimer.current = window.setTimeout(() => {
          refresh().catch(() => {});
        }, 250);
      };

      const channel = supabase
        .channel(`tt-compliance-${orgId}`)
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "cleaning_task_runs", filter: `org_id=eq.${orgId}` },
          scheduleRefresh
        )
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "food_temp_logs", filter: `org_id=eq.${orgId}` },
          scheduleRefresh
        )
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "trainings", filter: `org_id=eq.${orgId}` },
          scheduleRefresh
        )
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "allergen_review_log", filter: `org_id=eq.${orgId}` },
          scheduleRefresh
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    })();

    return () => {
      cancelled = true;
      if (refreshTimer.current) window.clearTimeout(refreshTimer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mounted]);

  // score & visuals
  const score = useMemo(() => {
    const cleaningDue = kpi.cleaningDueToday;
    const cleaningDone = kpi.cleaningDoneToday;

    const cleaningPct = cleaningDue > 0 ? clamp(cleaningDone / cleaningDue, 0, 1) : 0;
    const cleaningScore = Math.round(cleaningPct * 40);

    const tempScore = kpi.tempLogsToday <= 0 ? 0 : kpi.tempFails7d > 0 ? 0 : 40;

    const trainingScore = kpi.trainingOver > 0 ? 0 : kpi.trainingDueSoon > 0 ? 5 : 10;

    const allergenScore = kpi.allergenOver > 0 ? 0 : kpi.allergenDueSoon > 0 ? 5 : 10;

    return clamp(tempScore + cleaningScore + trainingScore + allergenScore, 0, 100);
  }, [kpi]);

  const label = useMemo(() => labelFrom(score), [score]);
  const tone = useMemo(() => ringTone(score), [score]);

  // final visibility gate
  if (!mounted || hidden || isMarketingOrAuth) return null;

  const deg = Math.round((score / 100) * 360);

  return (
    <div className="print:hidden pointer-events-none fixed right-4 top-[72px] z-50">
      <div
        className="pointer-events-auto relative h-[112px] w-[112px] rounded-full border border-white/30 bg-white/25 shadow-xl backdrop-blur-md"
        style={{ boxShadow: "0 12px 32px rgba(0,0,0,0.18)" }}
        aria-label="Compliance indicator"
        title="Operational compliance (today)"
      >
        {/* ring */}
        <div
          className="absolute inset-0 rounded-full"
          style={{
            background: `conic-gradient(${tone} ${deg}deg, rgba(255,255,255,0.15) ${deg}deg)`,
          }}
        />

        {/* inner glass */}
        <div className="absolute inset-[10px] rounded-full bg-white/35 backdrop-blur-md border border-white/30" />

        {/* X close */}
        <button
          type="button"
          onClick={() => {
            try {
              localStorage.setItem(LS_HIDE, "1");
            } catch {
              // ignore
            }
            setHidden(true);
          }}
          className="absolute right-2 top-2 grid h-7 w-7 place-items-center rounded-full bg-white/35 text-slate-800 hover:bg-white/50"
          aria-label="Hide compliance indicator"
        >
          ✕
        </button>

        {/* text */}
        <div className="absolute inset-0 grid place-items-center text-center">
          <div>
            <div className="text-3xl font-extrabold text-slate-900">{score}%</div>
            <div className="text-[12px] font-bold tracking-wide text-slate-900/80">
              {label}
            </div>
            <div className="mt-0.5 text-[11px] font-medium text-slate-900/70">
              Compliance
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

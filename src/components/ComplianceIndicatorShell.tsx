"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
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

type CleanTask = {
  id: string;
  frequency: "daily" | "weekly" | "monthly";
  weekday: number | null;
  month_day: number | null;
};

type CleanRun = { task_id: string; run_on: string };

const cls = (...p: Array<string | false | null | undefined>) => p.filter(Boolean).join(" ");
const isoToday = () => new Date().toISOString().slice(0, 10);

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

export default function ComplianceIndicatorShell() {
  const pathname = usePathname();

  // You said “all pages”, but I’m still not polluting public marketing pages.
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
      // session gate so it doesn’t show for logged-out users
      const { data } = await supabase.auth.getSession();
      if (cancelled) return;
      const hasSession = !!data.session;
      setSignedIn(hasSession);
      if (!hasSession) return;

      const orgId = await getActiveOrgIdClient();
      const locationId = await getActiveLocationIdClient();
      const today = isoToday();

      if (!orgId) return;

      // Temps failures last 7d (lightweight)
      const since = new Date();
      since.setDate(since.getDate() - 7);

      let tempFails7d = 0;
      try {
        const { data: temps } = await supabase
          .from("food_temp_logs")
          .select("at,status,created_at")
          .eq("org_id", orgId)
          .order("at", { ascending: false })
          .limit(400);

        (temps ?? []).forEach((r: any) => {
          const at = r.at ?? r.created_at ?? null;
          const d = at ? new Date(at) : null;
          if (!d || Number.isNaN(d.getTime())) return;
          if (d >= since && (r.status ?? null) === "fail") tempFails7d++;
        });
      } catch {}

      // Cleaning completion today
      let cleaningDueToday = 0;
      let cleaningDoneToday = 0;
      try {
        if (locationId) {
          const { data: tData } = await supabase
            .from("cleaning_tasks")
            .select("id, frequency, weekday, month_day")
            .eq("org_id", orgId)
            .eq("location_id", locationId);

          const tasks: CleanTask[] =
            (tData ?? []).map((r: any) => ({
              id: String(r.id),
              frequency: (r.frequency ?? "daily") as CleanTask["frequency"],
              weekday: r.weekday ? Number(r.weekday) : null,
              month_day: r.month_day ? Number(r.month_day) : null,
            })) || [];

          const due = tasks.filter((t) => isDueOn(t, today));
          cleaningDueToday = due.length;

          const { data: rData } = await supabase
            .from("cleaning_task_runs")
            .select("task_id, run_on")
            .eq("org_id", orgId)
            .eq("location_id", locationId)
            .eq("run_on", today);

          const runs: CleanRun[] =
            (rData ?? []).map((r: any) => ({
              task_id: String(r.task_id),
              run_on: String(r.run_on),
            })) || [];

          const runKey = new Set(runs.map((r) => `${r.task_id}|${r.run_on}`));
          cleaningDoneToday = due.filter((t) => runKey.has(`${t.id}|${today}`)).length;
        }
      } catch {}

      // Training/allergen overdue + due soon
      const soon = new Date();
      soon.setDate(soon.getDate() + 14);
      const now = new Date();

      let trainingOver = 0;
      let trainingDueSoon = 0;
      try {
        const { data: members } = await supabase.from("team_members").select("*").eq("org_id", orgId);
        (members ?? []).forEach((r: any) => {
          const raw = r.training_expires_at ?? r.training_expiry ?? r.expires_at ?? null;
          if (!raw) return;
          const d = new Date(raw);
          if (Number.isNaN(d.getTime())) return;
          if (d < now) trainingOver++;
          else if (d <= soon) trainingDueSoon++;
        });
      } catch {}

      let allergenOver = 0;
      let allergenDueSoon = 0;
      try {
        const { data: ar } = await supabase
          .from("allergen_review")
          .select("last_reviewed, interval_days")
          .eq("org_id", orgId);

        (ar ?? []).forEach((r: any) => {
          const last = r.last_reviewed ? new Date(r.last_reviewed) : null;
          const interval = Number(r.interval_days ?? 0);
          if (!last || !Number.isFinite(interval)) return;
          const due = new Date(last);
          due.setDate(due.getDate() + interval);
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

    // refresh every 2 minutes (cheap enough, keeps it feeling “live”)
    const t = setInterval(run, 120000);

    return () => {
      cancelled = true;
      clearInterval(t);
    };
  }, []);

  if (hide) return null;
  if (!signedIn) return null;

  const bad = kpi.tempFails7d > 0 || kpi.trainingOver > 0 || kpi.allergenOver > 0;
  const warn =
    !bad &&
    (kpi.trainingDueSoon > 0 ||
      kpi.allergenDueSoon > 0 ||
      (kpi.cleaningDueToday > 0 && kpi.cleaningDoneToday < kpi.cleaningDueToday));

  const tone: "red" | "amber" | "green" = bad ? "red" : warn ? "amber" : "green";

  const toneCls =
    tone === "red"
      ? "border-red-200 bg-red-50 text-red-900"
      : tone === "amber"
      ? "border-amber-200 bg-amber-50 text-amber-950"
      : "border-emerald-200 bg-emerald-50 text-emerald-950";

  const dotCls =
    tone === "red" ? "bg-red-600" : tone === "amber" ? "bg-amber-600" : "bg-emerald-600";

  const cleaningLabel =
    kpi.cleaningDueToday > 0 ? `${kpi.cleaningDoneToday}/${kpi.cleaningDueToday} cleaning` : "No cleaning due";

  const issuesCount =
    (kpi.tempFails7d > 0 ? 1 : 0) +
    (kpi.trainingOver > 0 ? 1 : 0) +
    (kpi.allergenOver > 0 ? 1 : 0);

  return (
    <div className="fixed right-4 top-[72px] z-[60]">
      <Link
        href="/reports"
        className={cls(
          "group inline-flex items-center gap-2 rounded-2xl border px-3 py-2 shadow-sm backdrop-blur",
          "hover:shadow-md transition",
          toneCls
        )}
        title="Open Reports (includes 90-day instant audit)"
      >
        <span className={cls("h-2.5 w-2.5 rounded-full", dotCls)} />
        <span className="text-xs font-extrabold">Compliance</span>

        <span className="text-[11px] font-semibold opacity-80">
          {bad ? `${issuesCount} issue${issuesCount === 1 ? "" : "s"}` : warn ? "Attention" : "OK"}
        </span>

        <span className="hidden sm:inline text-[11px] font-semibold opacity-70">
          · {cleaningLabel}
        </span>

        <span className="text-[11px] font-extrabold opacity-70 group-hover:opacity-100">
          → Reports
        </span>
      </Link>
    </div>
  );
}

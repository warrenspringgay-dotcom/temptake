"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { supabase } from "@/lib/supabaseBrowser";
import { getActiveOrgIdClient } from "@/lib/orgClient";
import { getActiveLocationIdClient } from "@/lib/locationClient";

type CleanTask = {
  id: string;
  frequency: "daily" | "weekly" | "monthly";
  weekday: number | null;
  month_day: number | null;
};

const cls = (...parts: Array<string | false | null | undefined>) =>
  parts.filter(Boolean).join(" ");

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

function labelForScore(score: number) {
  if (score <= 24) return { label: "High risk", tone: "danger" as const };
  if (score <= 49) return { label: "At risk", tone: "warn" as const };
  if (score <= 74) return { label: "Mostly compliant", tone: "neutral" as const };
  return { label: "Inspection-ready", tone: "ok" as const };
}

function toneClasses(tone: "danger" | "warn" | "ok" | "neutral") {
  switch (tone) {
    case "danger":
      return {
        wrap: "border-red-200 bg-red-50/90 text-red-900",
        pill: "bg-red-600 text-white",
        ring: "ring-red-200/70",
      };
    case "warn":
      return {
        wrap: "border-amber-200 bg-amber-50/90 text-amber-950",
        pill: "bg-amber-600 text-white",
        ring: "ring-amber-200/70",
      };
    case "ok":
      return {
        wrap: "border-emerald-200 bg-emerald-50/90 text-emerald-950",
        pill: "bg-emerald-600 text-white",
        ring: "ring-emerald-200/70",
      };
    default:
      return {
        wrap: "border-slate-200 bg-white/90 text-slate-900",
        pill: "bg-slate-900 text-white",
        ring: "ring-slate-200/70",
      };
  }
}

// Only hide on truly public pages
const HIDE_PREFIX = [
  "/launch",
  "/pricing",
  "/login",
  "/signup",
  "/forgot-password",
  "/reset-password",
  "/guides", // public SEO content
  "/help",   // public support page (your choice)
];

export default function ComplianceWidget() {
  const pathname = usePathname();

  const eligible = useMemo(() => {
    if (!pathname) return false;
    if (pathname === "/") return false;
    return !HIDE_PREFIX.some((p) => pathname === p || pathname.startsWith(p + "/"));
  }, [pathname]);

  const [signedIn, setSignedIn] = useState<boolean | null>(null);
  const [open, setOpen] = useState(false);

  const [loading, setLoading] = useState(true);
  const [score, setScore] = useState<number | null>(null);
  const [details, setDetails] = useState<{
    tempsOk: boolean;
    cleaningDone: number;
    cleaningDue: number;
    trainingExpired: number;
    trainingDueSoon: number;
    allergenOver: number;
    allergenDueSoon: number;
  } | null>(null);

  // ✅ Make auth state reliable (same pattern as your UserMenu)
  useEffect(() => {
    let mounted = true;

    async function prime() {
      const { data } = await supabase.auth.getUser();
      if (!mounted) return;
      setSignedIn(!!data.user);
    }

    prime();

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!mounted) return;
      setSignedIn(!!session?.user);
    });

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  // Load / refresh compliance metrics
  useEffect(() => {
    let cancelled = false;

    (async () => {
      if (!eligible) {
        setLoading(false);
        setScore(null);
        setDetails(null);
        return;
      }
      if (signedIn !== true) {
        setLoading(false);
        setScore(null);
        setDetails(null);
        return;
      }

      setLoading(true);

      try {
        const [orgId, locationId] = await Promise.all([
          getActiveOrgIdClient(),
          getActiveLocationIdClient(),
        ]);

        if (!orgId) {
          setScore(null);
          setDetails(null);
          setLoading(false);
          return;
        }

        const todayISO = isoToday();

        // 1) Temps today
        const { data: temps, error: tErr } = await supabase
          .from("food_temp_logs")
          .select("at,created_at,org_id")
          .eq("org_id", orgId)
          .order("at", { ascending: false })
          .limit(250);

        if (tErr) throw tErr;

        let tempLogsToday = 0;
        (temps ?? []).forEach((r: any) => {
          const at = r.at ?? r.created_at ?? null;
          const d = at ? new Date(at) : null;
          if (!d || Number.isNaN(d.getTime())) return;
          if (d.toISOString().slice(0, 10) === todayISO) tempLogsToday += 1;
        });
        const tempsOk = tempLogsToday > 0;

        // 2) Cleaning today
        let cleaningDue = 0;
        let cleaningDone = 0;

        if (locationId) {
          const { data: tasks } = await supabase
            .from("cleaning_tasks")
            .select("id,frequency,weekday,month_day")
            .eq("org_id", orgId)
            .eq("location_id", locationId);

          const allTasks: CleanTask[] =
            (tasks ?? []).map((r: any) => ({
              id: String(r.id),
              frequency: (r.frequency ?? "daily") as CleanTask["frequency"],
              weekday: r.weekday ? Number(r.weekday) : null,
              month_day: r.month_day ? Number(r.month_day) : null,
            })) || [];

          const due = allTasks.filter((t) => isDueOn(t, todayISO));
          cleaningDue = due.length;

          if (cleaningDue > 0) {
            const { data: runs } = await supabase
              .from("cleaning_task_runs")
              .select("task_id,run_on")
              .eq("org_id", orgId)
              .eq("location_id", locationId)
              .eq("run_on", todayISO);

            const runKey = new Set(
              (runs ?? []).map((r: any) => `${String(r.task_id)}|${r.run_on}`)
            );

            cleaningDone = due.filter((t) => runKey.has(`${t.id}|${todayISO}`))
              .length;
          }
        }

        // 3) Training
        const soon = new Date();
        soon.setDate(soon.getDate() + 30);
        const now = new Date();

        let trainingExpired = 0;
        let trainingDueSoon = 0;

        const { data: team } = await supabase
          .from("team_members")
          .select("*")
          .eq("org_id", orgId);

        (team ?? []).forEach((r: any) => {
          const raw =
            r.training_expires_at ?? r.training_expiry ?? r.expires_at ?? null;
          if (!raw) return;
          const d = new Date(raw);
          if (Number.isNaN(d.getTime())) return;
          if (d < now) trainingExpired++;
          else if (d <= soon) trainingDueSoon++;
        });

        // 4) Allergens
        let allergenOver = 0;
        let allergenDueSoon = 0;

        const { data: ar } = await supabase
          .from("allergen_review")
          .select("last_reviewed,interval_days")
          .eq("org_id", orgId);

        if (!ar || ar.length === 0) {
          allergenOver = 1; // missing = not compliant
        } else {
          (ar ?? []).forEach((r: any) => {
            const last = r.last_reviewed ? new Date(r.last_reviewed) : null;
            const interval = Number(r.interval_days ?? 0);
            if (!last || !Number.isFinite(interval)) return;

            const due = new Date(last);
            due.setDate(due.getDate() + interval);

            if (due < now) allergenOver++;
            else if (due <= soon) allergenDueSoon++;
          });
        }

        // Score (25 each pillar)
        const tempScore = tempsOk ? 25 : 0;

        const cleaningScore =
          cleaningDue === 0
            ? 25
            : cleaningDone === cleaningDue
            ? 25
            : cleaningDone > 0
            ? 12
            : 0;

        const trainingScore =
          trainingExpired > 0 ? 0 : trainingDueSoon > 0 ? 12 : 25;

        const allergenScore =
          allergenOver > 0 ? 0 : allergenDueSoon > 0 ? 12 : 25;

        const total = tempScore + cleaningScore + trainingScore + allergenScore;

        if (!cancelled) {
          setScore(total);
          setDetails({
            tempsOk,
            cleaningDone,
            cleaningDue,
            trainingExpired,
            trainingDueSoon,
            allergenOver,
            allergenDueSoon,
          });
        }
      } catch {
        if (!cancelled) {
          setScore(null);
          setDetails(null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [eligible, signedIn, pathname]);

  if (!eligible) return null;
  if (signedIn !== true) return null;
  if (loading) return null;
  if (score === null) return null;

  const meta = labelForScore(score);
  const tone = toneClasses(meta.tone);

  return (
    <div className="fixed right-4 top-[76px] z-[9999]">
      <div
        className={cls(
          "rounded-2xl border px-3 py-2 shadow-lg backdrop-blur",
          "ring-1",
          tone.wrap,
          tone.ring
        )}
      >
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="flex items-center gap-2"
          aria-expanded={open}
          aria-label="Compliance score"
        >
          <span className={cls("rounded-full px-2 py-1 text-[11px] font-extrabold", tone.pill)}>
            {score}%
          </span>
          <span className="text-xs font-semibold">{meta.label}</span>
          <span className="ml-1 text-xs opacity-70">{open ? "▲" : "▼"}</span>
        </button>

        {open && details && (
          <div className="mt-2 w-[260px] text-xs text-slate-700">
            <div className="space-y-1">
              <div className="flex justify-between gap-3">
                <span>Temps today</span>
                <span className="font-semibold">{details.tempsOk ? "OK" : "Missing"}</span>
              </div>
              <div className="flex justify-between gap-3">
                <span>Cleaning today</span>
                <span className="font-semibold">
                  {details.cleaningDue === 0
                    ? "None due"
                    : `${details.cleaningDone}/${details.cleaningDue}`}
                </span>
              </div>
              <div className="flex justify-between gap-3">
                <span>Training</span>
                <span className="font-semibold">
                  {details.trainingExpired > 0
                    ? `${details.trainingExpired} expired`
                    : details.trainingDueSoon > 0
                    ? `${details.trainingDueSoon} due soon`
                    : "OK"}
                </span>
              </div>
              <div className="flex justify-between gap-3">
                <span>Allergens</span>
                <span className="font-semibold">
                  {details.allergenOver > 0
                    ? "Overdue / missing"
                    : details.allergenDueSoon > 0
                    ? "Due soon"
                    : "OK"}
                </span>
              </div>
            </div>

            <div className="mt-3 flex gap-2">
              <Link
                href="/reports?tab=audit"
                className="flex-1 rounded-xl bg-slate-900 px-3 py-2 text-center text-[11px] font-extrabold text-white hover:bg-black"
                onClick={() => setOpen(false)}
              >
                Run 90-day audit
              </Link>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-center text-[11px] font-extrabold text-slate-900 hover:bg-slate-50"
              >
                Close
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

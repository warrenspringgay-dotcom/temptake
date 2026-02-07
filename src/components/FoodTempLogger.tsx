// src/app/(protected)/dashboard/page.tsx
"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import type { AuthChangeEvent, Session, User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabaseBrowser";
import { getActiveOrgIdClient } from "@/lib/orgClient";
import { getActiveLocationIdClient } from "@/lib/locationClient";
import OnboardingBanner from "@/components/OnboardingBanner";
import WelcomeGate from "@/components/WelcomeGate";

/* ---------- CONFIG ---------- */

const WALL_TABLE = "kitchen_wall";

// KPI incident counting window for performance.
// Incidents still show in modal by range selector (7/14/30).
// KPI counts OPEN incidents only (so once resolved, it drops off immediately).
const INCIDENT_KPI_LOOKBACK_DAYS = 365;

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
  weekday: number | null; // IMPORTANT: expected 0..6 to match rota page
  month_day: number | null;
};

type CleanRun = {
  task_id: string;
  run_on: string;
  done_by: string | null;
};

type Deferral = {
  task_id: string;
  from_on: string; // yyyy-mm-dd
  to_on: string; // yyyy-mm-dd
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

type IncidentRow = {
  id: string;
  happened_on: string; // date
  type: string | null;
  details: string | null;
  immediate_action: string | null;
  preventive_action: string | null;
  created_by: string | null;
  created_at: string | null;

  resolved_at?: string | null;
  resolved_by?: string | null;
};

type AlertItem = {
  id: string;
  label: string;
  tone: "danger" | "warn" | "ok";
  href?: string;
  onClick?: () => void;
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

// DD/MM/YYYY (local date parts)
function formatDDMMYYYY(val: any): string | null {
  if (!val) return null;
  const d = new Date(val);
  if (Number.isNaN(d.getTime())) return null;

  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = String(d.getFullYear());

  return `${dd}/${mm}/${yyyy}`;
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
  // If it's within first 3 days of the month, treat as month end review time.
  return d.getDate() <= 3;
}

/* ---------- Cleaning KPI helpers (MATCH cleaning-rota) ---------- */

function isoDate(d: Date) {
  return d.toISOString().slice(0, 10);
}

function isoDateFromYmd(ymd: string) {
  // ymd should already be yyyy-mm-dd. This makes sure we treat it as date.
  const d = new Date(`${ymd}T00:00:00.000Z`);
  return d;
}

function startOfWeekMonday(d: Date) {
  const x = new Date(d);
  const day = x.getDay(); // 0=Sun..6=Sat
  const diff = (day === 0 ? -6 : 1) - day; // Monday start
  x.setDate(x.getDate() + diff);
  x.setHours(0, 0, 0, 0);
  return x;
}

function endOfWeekSunday(d: Date) {
  const s = startOfWeekMonday(d);
  const e = new Date(s);
  e.setDate(e.getDate() + 6);
  e.setHours(23, 59, 59, 999);
  return e;
}

function isDueOn(task: CleanTask, date: Date) {
  if (task.frequency === "daily") return true;

  if (task.frequency === "weekly") {
    if (task.weekday === null || task.weekday === undefined) return false;
    // IMPORTANT: this matches CleaningRotaPage (0..6)
    return date.getDay() === task.weekday;
  }

  if (task.frequency === "monthly") {
    if (!task.month_day) return false;
    return date.getDate() === task.month_day;
  }

  return false;
}

/* ---------- Four-week dismiss helpers ---------- */

// Stable key: only YYYY-MM-DD (no times)
function makeReviewKey(periodFromISO: string, periodToISO: string) {
  const from = (periodFromISO ?? "").slice(0, 10);
  const to = (periodToISO ?? "").slice(0, 10);
  return `${from}_to_${to}`;
}

function makeDismissStorageKey(args: {
  orgId: string | null;
  locationId: string | null;
  reviewKey: string;
}) {
  const orgKey = args.orgId ?? "no-org";
  const locKey = args.locationId ?? "no-loc";
  return `tt_four_week_dismiss_until:${orgKey}:${locKey}:${args.reviewKey}`;
}

async function isFourWeekReviewDismissed(args: {
  orgId: string;
  locationId: string;
  periodFrom: string;
  periodTo: string;
}) {
  const { orgId, locationId, periodFrom, periodTo } = args;
  const reviewKey = makeReviewKey(periodFrom, periodTo);

  const { data, error } = await supabase
    .from("review_dismissals")
    .select("dismissed_until")
    .eq("org_id", orgId)
    .eq("location_id", locationId)
    .eq("review_key", reviewKey)
    .maybeSingle();

  if (error) {
    console.warn("[four-week dismiss] read failed:", error.message);
    return false;
  }

  if (!data?.dismissed_until) return false;
  return new Date(data.dismissed_until).getTime() > Date.now();
}

async function dismissFourWeekReview(args: {
  orgId: string;
  locationId: string;
  periodFrom: string;
  periodTo: string;
}) {
  const { orgId, locationId, periodFrom, periodTo } = args;
  const reviewKey = makeReviewKey(periodFrom, periodTo);

  const { data: existing } = await supabase
    .from("review_dismissals")
    .select("dismiss_count")
    .eq("org_id", orgId)
    .eq("location_id", locationId)
    .eq("review_key", reviewKey)
    .maybeSingle();

  const currentCount = existing?.dismiss_count ?? 0;
  const nextCount = currentCount + 1;

  // 1-2 dismisses => 24h, 3rd+ => 28 days
  const hours = nextCount >= 3 ? 24 * 28 : 24;
  const dismissedUntil = new Date(
    Date.now() + hours * 60 * 60 * 1000
  ).toISOString();

  const { error } = await supabase.from("review_dismissals").upsert(
    {
      org_id: orgId,
      location_id: locationId,
      review_key: reviewKey,
      dismissed_until: dismissedUntil,
      dismiss_count: nextCount,
    },
    { onConflict: "org_id,location_id,review_key" }
  );

  if (error) {
    console.warn("[four-week dismiss] upsert failed:", error.message);
  }
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

/* ---------- Alerts modal ---------- */

function shortSnippet(s: string | null | undefined, n = 140) {
  const t = (s ?? "").toString().trim();
  if (!t) return "";
  return t.length > n ? `${t.slice(0, n).trim()}…` : t;
}

function AlertsModal({
  open,
  onClose,
  orgLabel,
  locationLabel,
  incidents,
  incidentsLoading,
  incidentsError,
  rangeDays,
  setRangeDays,
  otherAlerts,
  onResolveIncident,
  resolvingId,
}: {
  open: boolean;
  onClose: () => void;
  orgLabel: string | null;
  locationLabel: string | null;
  incidents: IncidentRow[];
  incidentsLoading: boolean;
  incidentsError: string | null;
  rangeDays: number;
  setRangeDays: (n: number) => void;
  otherAlerts: AlertItem[];
  onResolveIncident: (incidentId: string) => Promise<void>;
  resolvingId: string | null;
}) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  if (!open || !mounted) return null;

  return (
    <div
      className="fixed inset-0 z-[999999] flex items-center justify-center bg-black/40 p-3 sm:p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-3xl rounded-2xl border border-slate-200 bg-white shadow-xl"
        onClick={(e) => e.stopPropagation()}
        style={{ maxHeight: "85vh" }}
      >
        <div className="flex h-full flex-col" style={{ maxHeight: "85vh" }}>
          <div className="flex items-start justify-between border-b border-slate-200 px-4 py-3">
            <div className="min-w-0">
              <div className="text-base font-semibold text-slate-900">
                Alerts & incidents
              </div>

              <div className="mt-0.5 text-xs text-slate-500">
                Org:{" "}
                <span className="font-semibold text-slate-700">
                  {orgLabel ?? "—"}
                </span>
                {" · "}
                Location:{" "}
                <span className="font-semibold text-slate-700">
                  {locationLabel ?? "—"}
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"
              aria-label="Close"
            >
              ✕
            </button>
          </div>

          <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
              <div className="text-xs font-extrabold uppercase tracking-[0.2em] text-slate-600">
                Other alerts
              </div>

              {otherAlerts.length === 0 ? (
                <div className="mt-1 text-sm font-medium text-slate-800">
                  No other alerts.
                </div>
              ) : (
                <div className="mt-2 space-y-2">
                  {otherAlerts.map((a) => {
                    const badge =
                      a.tone === "danger"
                        ? "bg-red-100 text-red-800 border-red-200"
                        : a.tone === "warn"
                        ? "bg-amber-100 text-amber-900 border-amber-200"
                        : "bg-emerald-100 text-emerald-900 border-emerald-200";

                    const inner = (
                      <div className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-3 py-2 hover:bg-slate-50">
                        <div className="min-w-0">
                          <div className="text-sm font-semibold text-slate-900">
                            {a.label}
                          </div>
                        </div>
                        <span
                          className={cls(
                            "shrink-0 rounded-full border px-2 py-1 text-[10px] font-extrabold uppercase tracking-wide",
                            badge
                          )}
                        >
                          {a.tone}
                        </span>
                      </div>
                    );

                    if (a.href) {
                      return (
                        <Link
                          key={a.id}
                          href={a.href}
                          onClick={onClose}
                          className="block"
                        >
                          {inner}
                        </Link>
                      );
                    }

                    return (
                      <button
                        key={a.id}
                        type="button"
                        onClick={() => {
                          a.onClick?.();
                          onClose();
                        }}
                        className="block w-full text-left"
                      >
                        {inner}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="flex items-center justify-between gap-2">
              <div className="text-sm font-semibold text-slate-900">
                Incidents
              </div>

              <div className="flex items-center gap-2">
                <div className="text-[11px] font-semibold text-slate-600">
                  Range
                </div>
                <select
                  value={rangeDays}
                  onChange={(e) => setRangeDays(Number(e.target.value))}
                  className="h-9 rounded-xl border border-slate-300 bg-white px-3 text-sm"
                >
                  <option value={7}>Last 7 days</option>
                  <option value={14}>Last 14 days</option>
                  <option value={30}>Last 30 days</option>
                </select>

                <Link
                  href="/reports"
                  className="inline-flex h-9 items-center justify-center rounded-xl bg-slate-900 px-3 text-xs font-extrabold text-white hover:bg-black"
                >
                  Open reports
                </Link>
              </div>
            </div>

            {incidentsError ? (
              <div className="rounded-2xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
                {incidentsError}
              </div>
            ) : incidentsLoading ? (
              <div className="rounded-2xl border border-slate-200 bg-white px-3 py-3 text-sm text-slate-500">
                Loading incidents…
              </div>
            ) : incidents.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-3 py-4 text-sm text-slate-600">
                No incidents found in the selected range. Either you’re running
                a tight ship, or nobody’s logging reality.
              </div>
            ) : (
              <div className="space-y-2">
                {incidents.map((i) => {
                  const resolved = !!i.resolved_at;

                  return (
                    <div
                      key={i.id}
                      className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <div className="text-sm font-extrabold text-slate-900">
                              {i.type ?? "Incident"}
                            </div>

                            {resolved ? (
                              <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-extrabold text-emerald-900 border border-emerald-200">
                                Resolved
                              </span>
                            ) : (
                              <span className="rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-extrabold text-red-900 border border-red-200">
                                Open
                              </span>
                            )}
                          </div>

                          <div className="mt-0.5 text-[11px] font-semibold text-slate-500">
                            Date:{" "}
                            <span className="font-mono">
                              {formatDDMMYYYY(i.happened_on) ?? "—"}
                            </span>
                            {" · "}
                            By:{" "}
                            <span className="font-mono">
                              {i.created_by ? i.created_by.toUpperCase() : "—"}
                            </span>

                            {resolved && i.resolved_at ? (
                              <>
                                {" · "}
                                Resolved:{" "}
                                <span className="font-mono">
                                  {formatDDMMYYYY(i.resolved_at) ?? "—"}
                                </span>
                              </>
                            ) : null}
                          </div>
                        </div>

                        <div className="shrink-0 flex flex-col items-end gap-2">
                          <div className="rounded-full bg-slate-100 px-2 py-1 text-[10px] font-extrabold text-slate-700">
                            {i.created_at
                              ? formatDDMMYYYY(i.created_at) ?? ""
                              : ""}
                          </div>

                          {!resolved ? (
                            <button
                              type="button"
                              disabled={resolvingId === i.id}
                              onClick={() => onResolveIncident(i.id)}
                              className={cls(
                                "rounded-xl px-3 py-1.5 text-[11px] font-extrabold border",
                                resolvingId === i.id
                                  ? "bg-slate-100 text-slate-400 border-slate-200"
                                  : "bg-emerald-600 text-white border-emerald-700 hover:bg-emerald-700"
                              )}
                            >
                              {resolvingId === i.id
                                ? "Resolving…"
                                : "Mark resolved"}
                            </button>
                          ) : null}
                        </div>
                      </div>

                      {i.details ? (
                        <div className="mt-2 text-sm text-slate-800">
                          {shortSnippet(i.details)}
                        </div>
                      ) : null}

                      {(i.immediate_action || i.preventive_action) && (
                        <div className="mt-2 grid gap-2 sm:grid-cols-2">
                          {i.immediate_action ? (
                            <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
                              <div className="text-[11px] font-extrabold uppercase tracking-wide text-slate-600">
                                Immediate action
                              </div>
                              <div className="mt-1 text-sm text-slate-800">
                                {shortSnippet(i.immediate_action, 120)}
                              </div>
                            </div>
                          ) : null}

                          {i.preventive_action ? (
                            <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
                              <div className="text-[11px] font-extrabold uppercase tracking-wide text-slate-600">
                                Preventive action
                              </div>
                              <div className="mt-1 text-sm text-slate-800">
                                {shortSnippet(i.preventive_action, 120)}
                              </div>
                            </div>
                          ) : null}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="flex justify-end gap-2 border-t border-slate-200 px-4 py-3">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
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

  const [user, setUser] = React.useState<User | null>(null);
  const [authReady, setAuthReady] = React.useState(false);

  const [activeOrgId, setActiveOrgId] = useState<string | null>(null);
  const [activeLocationId, setActiveLocationId] = useState<string | null>(null);

  const [orgLabel, setOrgLabel] = useState<string | null>(null);
  const [locationLabel, setLocationLabel] = useState<string | null>(null);

  const [fourWeekBanner, setFourWeekBanner] = useState<FourWeekBannerState>({
    kind: "none",
  });

  const [alertsOpen, setAlertsOpen] = useState(false);
  const [incidents, setIncidents] = useState<IncidentRow[]>([]);
  const [incidentsLoading, setIncidentsLoading] = useState(false);
  const [incidentsError, setIncidentsError] = useState<string | null>(null);
  const [incidentRangeDays, setIncidentRangeDays] = useState<number>(14);

  // ✅ resolve action state
  const [resolvingId, setResolvingId] = useState<string | null>(null);

  // ✅ KPI-side incident count (OPEN incidents only)
  const [openIncidentCount, setOpenIncidentCount] = useState<number>(0);

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

        setActiveOrgId(orgId);
        setActiveLocationId(locationId);

        await Promise.all([
          loadTempsKpi(orgId, locationId, today, cancelled),
          loadCleaningKpi(orgId, locationId, today, cancelled),
          loadTrainingAndAllergenKpi(orgId, cancelled),
          loadLeaderBoard(orgId, cancelled),
          loadWallPosts(orgId, cancelled),
          loadFourWeekBanner(orgId, locationId, today, cancelled),

          // ✅ incident KPI count
          loadOpenIncidentCount(orgId, locationId, cancelled),
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ---------- loaders ---------- */

  async function loadTempsKpi(
    orgId: string,
    locationId: string | null,
    todayISO: string,
    cancelled: boolean
  ) {
    const since = new Date();
    since.setDate(since.getDate() - 7);

    let q = supabase
      .from("food_temp_logs")
      .select("at,status,org_id,location_id,temp_c")
      .eq("org_id", orgId)
      .order("at", { ascending: false })
      .limit(400);

    if (locationId) {
      q = q.eq("location_id", locationId);
    }

    const { data, error } = await q;

    if (error) throw error;
    if (cancelled) return;

    let tempLogsToday = 0;
    let tempFails7d = 0;

    (data ?? []).forEach((r: any) => {
      const at = r.at ?? r.created_at ?? null;
      const d = at ? new Date(at) : null;
      if (!d || Number.isNaN(d.getTime())) return;

      const iso = d.toISOString().slice(0, 10);
      const statusRaw: string | null = r.status ?? null;
      const status = statusRaw ? String(statusRaw).toUpperCase() : null;

      if (iso === todayISO) tempLogsToday += 1;
      if (d >= since && status === "FAIL") tempFails7d += 1;
    });

    setKpi((prev) => ({
      ...prev,
      tempLogsToday,
      tempFails7d,
    }));
  }

  // ✅ FIXED: dashboard cleaning KPI now matches /cleaning-rota logic exactly
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

    // Treat "todayISO" as a Date (same as rota does)
    const today = isoDateFromYmd(todayISO);

    // 1) Tasks are ORG scoped (match rota page)
    const { data: tData, error: tErr } = await supabase
      .from("cleaning_tasks")
      .select("id,org_id,task,area,category,frequency,weekday,month_day")
      .eq("org_id", orgId);

    if (tErr) throw tErr;

    const allTasks: CleanTask[] =
      (tData ?? []).map((r: any) => ({
        id: String(r.id),
        org_id: String(r.org_id),
        area: r.area ?? null,
        task: r.task ?? r.name ?? "",
        category: r.category ?? null,
        frequency: (r.frequency ?? "daily") as CleanTask["frequency"],
        weekday:
          r.weekday === null || r.weekday === undefined ? null : Number(r.weekday),
        month_day:
          r.month_day === null || r.month_day === undefined ? null : Number(r.month_day),
      })) || [];

    // 2) Runs are location scoped (match rota page)
    const { data: rData, error: rErr } = await supabase
      .from("cleaning_task_runs")
      .select("task_id,run_on,done_by")
      .eq("org_id", orgId)
      .eq("location_id", locationId)
      .eq("run_on", todayISO);

    if (rErr) throw rErr;

    const runs: CleanRun[] =
      (rData ?? []).map((r: any) => ({
        task_id: String(r.task_id),
        run_on: String(r.run_on),
        done_by: r.done_by ?? null,
      })) || [];

    // 3) Deferrals are location scoped and affect what is "due today"
    const weekStart = isoDate(startOfWeekMonday(today));
    const weekEnd = isoDate(endOfWeekSunday(today));

    const { data: dData, error: dErr } = await supabase
      .from("cleaning_task_deferrals")
      .select("task_id,from_on,to_on")
      .eq("org_id", orgId)
      .eq("location_id", locationId)
      .gte("from_on", weekStart)
      .lte("to_on", weekEnd);

    // deferrals are non-critical, but they are critical for matching the rota count
    if (dErr) console.warn("[dashboard cleaning] deferrals fetch failed:", dErr.message);

    const deferrals: Deferral[] =
      (dData ?? []).map((d: any) => ({
        task_id: String(d.task_id),
        from_on: String(d.from_on),
        to_on: String(d.to_on),
      })) || [];

    if (cancelled) return;

    // Build deferral maps (same approach as rota)
    const deferralsFromMap = new Map<string, Set<string>>();
    const deferralsToMap = new Map<string, Set<string>>();

    for (const d of deferrals) {
      if (!deferralsFromMap.has(d.from_on)) deferralsFromMap.set(d.from_on, new Set());
      deferralsFromMap.get(d.from_on)!.add(d.task_id);

      if (!deferralsToMap.has(d.to_on)) deferralsToMap.set(d.to_on, new Set());
      deferralsToMap.get(d.to_on)!.add(d.task_id);
    }

    function isDueEffective(task: CleanTask, date: Date) {
      const dIso = isoDate(date);
      const deferredFrom = deferralsFromMap.get(dIso)?.has(task.id) ?? false;
      const deferredTo = deferralsToMap.get(dIso)?.has(task.id) ?? false;

      if (deferredFrom) return false;
      if (deferredTo) return true;

      return isDueOn(task, date);
    }

    const dueTodayAll = allTasks.filter((t) => isDueEffective(t, today));

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
      const { data } = await supabase
        .from("team_members")
        .select("*")
        .eq("org_id", orgId);

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

  async function loadFourWeekBanner(
    orgId: string,
    locationId: string | null,
    todayISO: string,
    cancelled: boolean
  ) {
    try {
      if (typeof window === "undefined") return;

      const firstSeenKey = `tt_first_seen_at:${orgId}`;
      let firstSeenISO = localStorage.getItem(firstSeenKey);

      if (!firstSeenISO) {
        firstSeenISO = new Date().toISOString();
        localStorage.setItem(firstSeenKey, firstSeenISO);
      }

      const eligibleDate = new Date(firstSeenISO);
      eligibleDate.setDate(eligibleDate.getDate() + 28);
      const eligible = eligibleDate.getTime() <= Date.now();

      if (!eligible) {
        setFourWeekBanner({ kind: "none" });
        return;
      }

      const reviewedAtRaw = localStorage.getItem("tt_four_week_reviewed_at");
      const lastReviewedISO = reviewedAtRaw ? toISODate(reviewedAtRaw) : null;

      const res = await fetch(
        `/four-week-review/summary?to=${encodeURIComponent(todayISO)}`,
        { cache: "no-store" }
      );

      if (!res.ok) return;
      const payload = await res.json();

      const issues = Number(payload?.issues ?? 0);
      const periodFrom = String(payload?.summary?.period?.from ?? "");
      const periodTo = String(payload?.summary?.period?.to ?? todayISO);

      const reviewKey = makeReviewKey(periodFrom, periodTo);

      const dismissKeyScoped = makeDismissStorageKey({
        orgId,
        locationId,
        reviewKey,
      });
      const dismissKeyFallback = makeDismissStorageKey({
        orgId,
        locationId: null,
        reviewKey,
      });

      const dismissUntilRaw =
        localStorage.getItem(dismissKeyScoped) ??
        localStorage.getItem(dismissKeyFallback);

      if (dismissUntilRaw) {
        const dismissUntil = new Date(dismissUntilRaw).getTime();
        if (!Number.isNaN(dismissUntil) && dismissUntil > Date.now()) {
          setFourWeekBanner({ kind: "none" });
          return;
        }
      }

      if (cancelled) return;

      const overdue =
        !lastReviewedISO || daysBetween(lastReviewedISO, todayISO) >= 28;
      const monthEnd = isLikelyMonthEnd(new Date());

      type FourWeekBannerReason = "overdue" | "month_end" | "issues";
      let reason: FourWeekBannerReason | null = null;

      if (issues > 0) reason = "issues";
      else if (overdue) reason = "overdue";
      else if (monthEnd) reason = "month_end";

      if (!reason) {
        setFourWeekBanner({ kind: "none" });
        return;
      }

      if (locationId && periodFrom && periodTo) {
        const dismissed = await isFourWeekReviewDismissed({
          orgId,
          locationId,
          periodFrom,
          periodTo,
        });

        if (cancelled) return;

        if (dismissed) {
          setFourWeekBanner({ kind: "none" });
          return;
        }
      }

      setFourWeekBanner({
        kind: "show",
        issues,
        periodFrom,
        periodTo,
        reason,
      });
    } catch {
      setFourWeekBanner({ kind: "none" });
    }
  }

  // ✅ KPI incident count: OPEN incidents only
  async function loadOpenIncidentCount(
    orgId: string,
    locationId: string | null,
    cancelled: boolean
  ) {
    try {
      const fromD = new Date();
      fromD.setDate(fromD.getDate() - INCIDENT_KPI_LOOKBACK_DAYS);
      const fromISO = fromD.toISOString().slice(0, 10);

      let q = supabase
        .from("incidents")
        .select("id", { count: "exact", head: true })
        .gte("happened_on", fromISO)
        .is("resolved_at", null)
        .eq("org_id_uuid", orgId);

      if (locationId) {
        q = q.eq("location_id_uuid", locationId);
      }

      const { count, error } = await q;

      if (error) {
        let q2 = supabase
          .from("incidents")
          .select("id", { count: "exact", head: true })
          .gte("happened_on", fromISO)
          .is("resolved_at", null)
          .eq("org_id", String(orgId));

        if (locationId) q2 = q2.eq("location_id", String(locationId));

        const { count: count2, error: err2 } = await q2;
        if (err2) throw err2;

        if (!cancelled) setOpenIncidentCount(count2 ?? 0);
        return;
      }

      if (!cancelled) setOpenIncidentCount(count ?? 0);
    } catch (e) {
      console.warn("[alerts/incidents] failed to count open incidents", e);
      if (!cancelled) setOpenIncidentCount(0);
    }
  }

  async function tryGetSingleText(
    table: string,
    select: string,
    where: { col: string; val: any }
  ): Promise<string | null> {
    try {
      const { data, error } = await supabase
        .from(table)
        .select(select)
        .eq(where.col, where.val)
        .maybeSingle();

      if (error) return null;

      const firstKey = select.split(",")[0].trim();
      const v = (data as any)?.[firstKey];
      if (!v) return null;

      return String(v);
    } catch {
      return null;
    }
  }

  async function resolveOrgLocationLabels(
    orgId: string | null,
    locationId: string | null
  ) {
    if (!orgId) {
      setOrgLabel(null);
      setLocationLabel(null);
      return;
    }

    const org =
      (await tryGetSingleText("orgs", "name", { col: "id", val: orgId })) ||
      (await tryGetSingleText("orgs", "org_name", { col: "id", val: orgId })) ||
      (await tryGetSingleText("organizations", "name", { col: "id", val: orgId })) ||
      (await tryGetSingleText("organisations", "name", { col: "id", val: orgId })) ||
      null;

    setOrgLabel(org);

    if (!locationId) {
      setLocationLabel(null);
      return;
    }

    const loc =
      (await tryGetSingleText("locations", "name", { col: "id", val: locationId })) ||
      (await tryGetSingleText("locations", "label", { col: "id", val: locationId })) ||
      (await tryGetSingleText("sites", "name", { col: "id", val: locationId })) ||
      null;

    setLocationLabel(loc);
  }

  // ✅ incidents loader for alerts modal
  async function loadIncidentsForAlerts(rangeDays: number) {
    const orgId = (await getActiveOrgIdClient()) ?? activeOrgId;
    const locationId = (await getActiveLocationIdClient()) ?? activeLocationId;

    if (!orgId) {
      setIncidents([]);
      return;
    }

    setIncidentsLoading(true);
    setIncidentsError(null);

    try {
      const toISO = isoToday();
      const fromD = new Date();
      fromD.setDate(fromD.getDate() - Math.max(1, Number(rangeDays) || 14));
      const fromISO = fromD.toISOString().slice(0, 10);

      let q = supabase
        .from("incidents")
        .select(
          "id,happened_on,type,details,immediate_action,preventive_action,created_by,created_at,resolved_at,resolved_by"
        )
        .gte("happened_on", fromISO)
        .lte("happened_on", toISO)
        .order("happened_on", { ascending: false })
        .order("created_at", { ascending: false })
        .limit(50);

      q = q.eq("org_id_uuid", orgId);

      if (locationId) {
        q = q.eq("location_id_uuid", locationId);
      }

      const { data, error } = await q;

      if (error) {
        console.warn(
          "[alerts/incidents] uuid filter failed, trying text:",
          error.message
        );

        let q2 = supabase
          .from("incidents")
          .select(
            "id,happened_on,type,details,immediate_action,preventive_action,created_by,created_at,resolved_at,resolved_by"
          )
          .gte("happened_on", fromISO)
          .lte("happened_on", toISO)
          .order("happened_on", { ascending: false })
          .order("created_at", { ascending: false })
          .limit(50)
          .eq("org_id", String(orgId));

        if (locationId) q2 = q2.eq("location_id", String(locationId));

        const { data: data2, error: err2 } = await q2;
        if (err2) throw err2;

        const mapped2: IncidentRow[] =
          (data2 ?? []).map((r: any) => ({
            id: String(r.id),
            happened_on: String(r.happened_on),
            type: r.type ?? null,
            details: r.details ?? null,
            immediate_action: r.immediate_action ?? null,
            preventive_action: r.preventive_action ?? null,
            created_by: r.created_by ?? null,
            created_at: r.created_at ?? null,
            resolved_at: r.resolved_at ?? null,
            resolved_by: r.resolved_by ?? null,
          })) || [];

        setIncidents(mapped2);
        return;
      }

      const mapped: IncidentRow[] =
        (data ?? []).map((r: any) => ({
          id: String(r.id),
          happened_on: String(r.happened_on),
          type: r.type ?? null,
          details: r.details ?? null,
          immediate_action: r.immediate_action ?? null,
          preventive_action: r.preventive_action ?? null,
          created_by: r.created_by ?? null,
          created_at: r.created_at ?? null,
          resolved_at: r.resolved_at ?? null,
          resolved_by: r.resolved_by ?? null,
        })) || [];

      setIncidents(mapped);
    } catch (e: any) {
      console.error(e);
      setIncidentsError(e?.message ?? "Failed to load incidents.");
      setIncidents([]);
    } finally {
      setIncidentsLoading(false);
    }
  }

  /* ---------- derived ---------- */

  const hasAnyKpiAlert =
    kpi.tempFails7d > 0 ||
    kpi.trainingOver > 0 ||
    kpi.trainingDueSoon > 0 ||
    kpi.allergenOver > 0 ||
    kpi.allergenDueSoon > 0 ||
    openIncidentCount > 0;

  const alertsCount =
    kpi.trainingOver +
    kpi.allergenOver +
    (kpi.tempFails7d > 0 ? 1 : 0) +
    openIncidentCount;

  const openTempModal = () => {
    if (typeof window === "undefined") return;
    window.dispatchEvent(new Event("tt-open-temp-modal"));
  };

  const otherAlerts: AlertItem[] = (() => {
    const items: AlertItem[] = [];

    if (kpi.allergenOver > 0) {
      items.push({
        id: "allergen_over",
        label: `${kpi.allergenOver} allergen review overdue`,
        tone: "danger",
        href: "/allergens",
      });
    } else if (kpi.allergenDueSoon > 0) {
      items.push({
        id: "allergen_soon",
        label: `${kpi.allergenDueSoon} allergen review due soon`,
        tone: "warn",
        href: "/allergens",
      });
    }

    if (kpi.trainingOver > 0) {
      items.push({
        id: "training_over",
        label: `${kpi.trainingOver} training overdue`,
        tone: "danger",
        href: "/team",
      });
    } else if (kpi.trainingDueSoon > 0) {
      items.push({
        id: "training_soon",
        label: `${kpi.trainingDueSoon} training due soon`,
        tone: "warn",
        href: "/team",
      });
    }

    if (kpi.tempFails7d > 0) {
      items.push({
        id: "temp_fails",
        label: `${kpi.tempFails7d} failed temperatures in last 7 days`,
        tone: "danger",
        onClick: openTempModal,
      });
    }

    return items;
  })();

  const alertsSummary = (() => {
    const bits: string[] = [];

    if (openIncidentCount > 0)
      bits.push(
        `${openIncidentCount} open incident${openIncidentCount === 1 ? "" : "s"}`
      );

    if (kpi.tempFails7d > 0) bits.push(`${kpi.tempFails7d} failed temps (7d)`);
    if (kpi.trainingOver > 0) bits.push(`${kpi.trainingOver} training overdue`);
    if (kpi.allergenOver > 0) bits.push(`${kpi.allergenOver} allergen review overdue`);

    if (!bits.length)
      return "No incidents, training, allergen or temperature issues flagged.";
    return bits.join(" · ");
  })();

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

  const openAlertsModal = async () => {
    setAlertsOpen(true);

    const orgId = (await getActiveOrgIdClient()) ?? activeOrgId;
    const locationId = (await getActiveLocationIdClient()) ?? activeLocationId;

    await resolveOrgLocationLabels(orgId, locationId);
    await loadIncidentsForAlerts(incidentRangeDays);
  };

  useEffect(() => {
    if (!alertsOpen) return;
    void loadIncidentsForAlerts(incidentRangeDays);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [incidentRangeDays, alertsOpen]);

  async function resolveIncident(incidentId: string) {
    try {
      setResolvingId(incidentId);
      setIncidentsError(null);

      const uid = user?.id ?? null;

      const { error } = await supabase
        .from("incidents")
        .update({
          resolved_at: new Date().toISOString(),
          resolved_by: uid,
        })
        .eq("id", incidentId);

      if (error) throw error;

      await loadIncidentsForAlerts(incidentRangeDays);

      const orgId = (await getActiveOrgIdClient()) ?? activeOrgId;
      const locationId = (await getActiveLocationIdClient()) ?? activeLocationId;
      if (orgId) await loadOpenIncidentCount(orgId, locationId, false);
    } catch (e: any) {
      console.error(e);
      setIncidentsError(
        e?.message ??
          "Could not resolve incident. (If you haven't added resolved_at/resolved_by columns yet, do that first.)"
      );
    } finally {
      setResolvingId(null);
    }
  }

  /* ---------- render ---------- */
  return (
    <>
      <WelcomeGate />
      <OnboardingBanner />

      <AlertsModal
        open={alertsOpen}
        onClose={() => setAlertsOpen(false)}
        orgLabel={orgLabel}
        locationLabel={locationLabel}
        incidents={incidents}
        incidentsLoading={incidentsLoading}
        incidentsError={incidentsError}
        rangeDays={incidentRangeDays}
        setRangeDays={setIncidentRangeDays}
        otherAlerts={otherAlerts}
        onResolveIncident={resolveIncident}
        resolvingId={resolvingId}
      />

      {/* ---- rest of your render unchanged ---- */}
      {/* (I’m not duplicating the rest because we did not change anything else below this in your snippet) */}

      {/* ... KEEP EVERYTHING ELSE AS-IS FROM YOUR CURRENT FILE ... */}

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

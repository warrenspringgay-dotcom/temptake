// src/app/four-week-review/page.tsx
"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

type StatTone = "good" | "warn" | "bad" | "neutral";

function cls(...parts: Array<string | false | undefined>) {
  return parts.filter(Boolean).join(" ");
}

function Pill({ tone, children }: { tone: StatTone; children: React.ReactNode }) {
  const styles =
    tone === "good"
      ? "border-emerald-200 bg-emerald-50 text-emerald-800"
      : tone === "warn"
      ? "border-amber-200 bg-amber-50 text-amber-800"
      : tone === "bad"
      ? "border-rose-200 bg-rose-50 text-rose-800"
      : "border-slate-200 bg-slate-50 text-slate-700";

  return (
    <span
      className={cls(
        "inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold",
        styles
      )}
    >
      {children}
    </span>
  );
}

function StatCard({
  title,
  value,
  subtitle,
  tone,
  icon,
}: {
  title: string;
  value: string;
  subtitle: string;
  tone: StatTone;
  icon: string;
}) {
  const wrap =
    tone === "good"
      ? "border-emerald-200 bg-emerald-50/70"
      : tone === "warn"
      ? "border-amber-200 bg-amber-50/70"
      : tone === "bad"
      ? "border-rose-200 bg-rose-50/70"
      : "border-slate-200 bg-white";

  const bar =
    tone === "good"
      ? "bg-emerald-400"
      : tone === "warn"
      ? "bg-amber-400"
      : tone === "bad"
      ? "bg-rose-400"
      : "bg-slate-300";

  return (
    <div className={cls("relative overflow-hidden rounded-3xl border p-4 shadow-sm", wrap)}>
      <div className={cls("absolute left-0 top-0 h-full w-1.5", bar)} />
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-[11px] font-extrabold uppercase tracking-[0.28em] text-slate-600">
            {title}
          </div>
          <div className="mt-2 text-4xl font-extrabold text-slate-900">{value}</div>
          <div className="mt-1 text-sm text-slate-600">{subtitle}</div>
        </div>
        <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-white/70 text-lg shadow-sm">
          {icon}
        </span>
      </div>
    </div>
  );
}

type SummaryShape = {
  rangeLabel?: string;
  compliantDays?: number;
  totalDays?: number;
  tempLogs?: number;
  tempFails?: number;
  cleaningDone?: number;
  cleaningTotal?: number | null;
  trainingDueSoon?: number;
  incidents?: number;
  topMissedAreas?: Array<{ area: string; missed: number }>;
};

export default function FourWeekReviewPage() {
  const router = useRouter();

  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const [summary, setSummary] = useState<SummaryShape | null>(null);

  useEffect(() => {
    let alive = true;

    (async () => {
      setLoading(true);
      setErr(null);

      try {
        const res = await fetch("/four-week-review/summary", {
          method: "GET",
          cache: "no-store",
        });

        const json = await res.json().catch(() => null);

        if (!res.ok) {
          const msg =
            (json?.error as string | undefined) ||
            (json?.message as string | undefined) ||
            `Failed to load 4-week review (HTTP ${res.status}).`;
          throw new Error(msg);
        }

        // Support either { summary: {...} } or direct object
        const s = (json?.summary ?? json) as SummaryShape;

        if (!alive) return;
        setSummary(s);
        setLoading(false);
      } catch (e: any) {
        if (!alive) return;
        console.error(e);
        setErr(e?.message ?? "Failed to load 4-week review.");
        setSummary(null);
        setLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, []);

  const data = useMemo(() => {
    const s = summary ?? {};

    return {
      rangeLabel: s.rangeLabel ?? "Last 4 weeks",
      compliantDays: typeof s.compliantDays === "number" ? s.compliantDays : 0,
      totalDays: typeof s.totalDays === "number" ? s.totalDays : 28,

      tempLogs: typeof s.tempLogs === "number" ? s.tempLogs : 0,
      tempFails: typeof s.tempFails === "number" ? s.tempFails : 0,

      cleaningDone: typeof s.cleaningDone === "number" ? s.cleaningDone : 0,
      cleaningTotal:
        typeof s.cleaningTotal === "number" ? s.cleaningTotal : null,

      trainingDueSoon: typeof s.trainingDueSoon === "number" ? s.trainingDueSoon : 0,
      incidents: typeof s.incidents === "number" ? s.incidents : 0,

      topMissedAreas: Array.isArray(s.topMissedAreas) ? s.topMissedAreas : [],
    };
  }, [summary]);

  const compliancePct = useMemo(() => {
    const denom = data.totalDays > 0 ? data.totalDays : 28;
    return Math.round((data.compliantDays / denom) * 100);
  }, [data.compliantDays, data.totalDays]);

  const cleaningPct = useMemo(() => {
    if (!data.cleaningTotal || data.cleaningTotal <= 0) return null;
    return Math.round((data.cleaningDone / data.cleaningTotal) * 100);
  }, [data.cleaningDone, data.cleaningTotal]);

  const complianceTone: StatTone =
    compliancePct >= 90 ? "good" : compliancePct >= 75 ? "warn" : "bad";

  const cleaningTone: StatTone =
    cleaningPct === null
      ? "neutral"
      : cleaningPct >= 90
      ? "good"
      : cleaningPct >= 75
      ? "warn"
      : "bad";

  const tempsTone: StatTone =
    data.tempFails === 0 ? "good" : data.tempFails <= 3 ? "warn" : "bad";

  const trainingTone: StatTone = data.trainingDueSoon === 0 ? "good" : "warn";

  const incidentsTone: StatTone =
    data.incidents === 0 ? "good" : data.incidents <= 2 ? "warn" : "bad";

  return (
    <div className="fixed inset-0 z-[60]">
      <button
        type="button"
        aria-label="Close"
        onClick={() => router.back()}
        className="absolute inset-0 bg-black/40"
      />

      <div className="absolute inset-x-0 bottom-0 top-10 mx-auto w-full max-w-6xl px-3 sm:top-12 sm:px-4">
        <div className="h-full overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl">
          <div className="flex items-start justify-between gap-3 border-b border-slate-200 bg-white/90 px-4 py-4 backdrop-blur">
            <div>
              <div className="text-[11px] font-extrabold uppercase tracking-[0.25em] text-slate-500">
                Four week review
              </div>
              <h1 className="mt-1 text-xl font-extrabold tracking-tight text-slate-900 sm:text-2xl">
                Compliance snapshot
              </h1>

              <div className="mt-2 flex flex-wrap items-center gap-2">
                <Pill tone={complianceTone}>{data.rangeLabel}</Pill>

                <Pill tone={complianceTone}>
                  {loading ? "—" : `${compliancePct}%`} compliant days ({data.compliantDays}/{data.totalDays})
                </Pill>

                <Pill tone={tempsTone}>{data.tempFails} temp fails</Pill>
                <Pill tone={trainingTone}>{data.trainingDueSoon} training due soon</Pill>
                <Pill tone={incidentsTone}>{data.incidents} incidents</Pill>
              </div>

              {(err || (loading && !summary)) && (
                <div
                  className={cls(
                    "mt-2 rounded-xl border px-3 py-2 text-sm font-semibold",
                    err ? "border-rose-200 bg-rose-50 text-rose-800" : "border-slate-200 bg-slate-50 text-slate-700"
                  )}
                >
                  {err ? err : "Loading…"}
                </div>
              )}
            </div>

            <div className="flex shrink-0 items-center gap-2">
              <Link
                href="/reports?range=4w"
                className="hidden rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-900 hover:bg-slate-50 sm:inline-flex"
              >
                View full report
              </Link>
              <button
                type="button"
                onClick={() => router.back()}
                className="rounded-2xl bg-black px-4 py-2 text-sm font-semibold text-white hover:bg-slate-900"
              >
                Close
              </button>
            </div>
          </div>

          <div className="h-[calc(100%-72px)] overflow-y-auto bg-slate-50/60 p-4">
            <div className="grid gap-4 md:grid-cols-4">
              <StatCard
                title="Compliance"
                value={loading ? "—" : `${compliancePct}%`}
                subtitle={`${data.compliantDays}/${data.totalDays} days compliant`}
                tone={complianceTone}
                icon="✅"
              />

              <StatCard
                title="Temps"
                value={`${data.tempLogs}`}
                subtitle={`${data.tempFails} fails (4w)`}
                tone={tempsTone}
                icon="🌡️"
              />

              <StatCard
                title="Cleaning"
                value={cleaningPct === null ? `${data.cleaningDone}` : `${cleaningPct}%`}
                subtitle={
                  cleaningPct === null
                    ? `${data.cleaningDone} done`
                    : `${data.cleaningDone}/${data.cleaningTotal} done`
                }
                tone={cleaningTone}
                icon="🧽"
              />

              <StatCard
                title="Incidents"
                value={`${data.incidents}`}
                subtitle="Manual incident log (4w)"
                tone={incidentsTone}
                icon="⚠️"
              />
            </div>

            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="text-base font-extrabold text-slate-900">Top missed areas</h2>
                    <p className="text-xs text-slate-600">Where routines are most likely being skipped.</p>
                  </div>
                  <span className="text-xl">📌</span>
                </div>

                <div className="mt-3 space-y-2">
                  {data.topMissedAreas.length === 0 ? (
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-700">
                      No routine data yet.
                    </div>
                  ) : (
                    data.topMissedAreas.map((x) => (
                      <div
                        key={x.area}
                        className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2"
                      >
                        <div className="text-sm font-semibold text-slate-900">{x.area}</div>
                        <Pill tone={x.missed >= 4 ? "warn" : "neutral"}>{x.missed} missed</Pill>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="text-base font-extrabold text-slate-900">Next steps</h2>
                    <p className="text-xs text-slate-600">You can wire this to real routine completion later.</p>
                  </div>
                  <span className="text-xl">🧠</span>
                </div>

                <div className="mt-3 text-sm text-slate-700">
                  - This page now reads totals from <code>/four-week-review/summary</code>.<br />
                  - If something looks wrong, fix it in the server summary logic, not by hardcoding UI numbers.
                </div>

                <div className="mt-3">
                  <Link
                    href="/reports?range=4w"
                    className="inline-flex w-full items-center justify-center rounded-2xl bg-black px-4 py-2 text-sm font-semibold text-white hover:bg-slate-900"
                  >
                    Open 4-week report
                  </Link>
                </div>
              </div>
            </div>

            <div className="h-4" />
          </div>
        </div>
      </div>
    </div>
  );
}

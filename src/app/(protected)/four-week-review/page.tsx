// src/app/four-week-review/page.tsx
"use client";

import React, { useMemo } from "react";
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
    <span className={cls("inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold", styles)}>
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

export default function FourWeekReviewPage() {
  const router = useRouter();

  // Demo/placeholder values (replace later with real data)
  const data = useMemo(() => {
    return {
      rangeLabel: "Last 4 weeks",
      compliantDays: 22,
      totalDays: 28,
      tempLogs: 84,
      tempFails: 3,
      cleaningDone: 410,
      cleaningTotal: 496,
      trainingDueSoon: 1,
      incidents: 0,
      topMissedAreas: [
        { area: "Hot hold checks", missed: 4 },
        { area: "Closing temps", missed: 3 },
        { area: "Allergen review", missed: 2 },
      ],
      recentFlags: [
        { date: "2025-12-22", type: "Temp fail", detail: "Prep fridge 11.8°C" },
        { date: "2025-12-18", type: "Missed", detail: "Cleaning task not completed" },
        { date: "2025-12-10", type: "Watch", detail: "Hot hold 62.0°C (borderline)" },
      ],
    };
  }, []);

  const compliancePct = Math.round((data.compliantDays / data.totalDays) * 100);
  const cleaningPct = Math.round((data.cleaningDone / data.cleaningTotal) * 100);

  const complianceTone: StatTone =
    compliancePct >= 90 ? "good" : compliancePct >= 75 ? "warn" : "bad";

  const cleaningTone: StatTone =
    cleaningPct >= 90 ? "good" : cleaningPct >= 75 ? "warn" : "bad";

  const tempsTone: StatTone = data.tempFails === 0 ? "good" : data.tempFails <= 3 ? "warn" : "bad";
  const trainingTone: StatTone = data.trainingDueSoon === 0 ? "good" : "warn";

  return (
    <div className="fixed inset-0 z-[60]">
      {/* Backdrop */}
      <button
        type="button"
        aria-label="Close"
        onClick={() => router.back()}
        className="absolute inset-0 bg-black/40"
      />

      {/* Modal */}
      <div className="absolute inset-x-0 bottom-0 top-10 mx-auto w-full max-w-6xl px-3 sm:top-12 sm:px-4">
        <div className="h-full overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl">
          {/* Header */}
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
                  {compliancePct}% compliant days ({data.compliantDays}/{data.totalDays})
                </Pill>
                <Pill tone={tempsTone}>{data.tempFails} temp fails</Pill>
                <Pill tone={trainingTone}>{data.trainingDueSoon} training due soon</Pill>
              </div>
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

          {/* Body */}
          <div className="h-[calc(100%-72px)] overflow-y-auto bg-slate-50/60 p-4">
            {/* KPI row */}
            <div className="grid gap-4 md:grid-cols-4">
              <StatCard
                title="Compliance"
                value={`${compliancePct}%`}
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
                value={`${cleaningPct}%`}
                subtitle={`${data.cleaningDone}/${data.cleaningTotal} done`}
                tone={cleaningTone}
                icon="🧽"
              />
              <StatCard
                title="Training"
                value={`${data.trainingDueSoon}`}
                subtitle="Due soon (30d)"
                tone={trainingTone}
                icon="🎓"
              />
            </div>

            {/* Two-column details */}
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              {/* Missed areas */}
              <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="text-base font-extrabold text-slate-900">Top missed areas</h2>
                    <p className="text-xs text-slate-600">
                      Where routines are most likely being skipped.
                    </p>
                  </div>
                  <span className="text-xl">📌</span>
                </div>

                <div className="mt-3 space-y-2">
                  {data.topMissedAreas.map((x) => (
                    <div key={x.area} className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2">
                      <div className="text-sm font-semibold text-slate-900">{x.area}</div>
                      <Pill tone={x.missed >= 4 ? "warn" : "neutral"}>{x.missed} missed</Pill>
                    </div>
                  ))}
                </div>

                <div className="mt-3 text-[11px] text-slate-500">
                  You can wire this to real routine completion data later. This page won’t crash when you do.
                </div>
              </div>

              {/* Recent flags */}
              <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="text-base font-extrabold text-slate-900">Recent flags</h2>
                    <p className="text-xs text-slate-600">
                      The last issues that could affect compliance.
                    </p>
                  </div>
                  <span className="text-xl">🚩</span>
                </div>

                <div className="mt-3 divide-y divide-slate-200 overflow-hidden rounded-2xl border border-slate-200">
                  {data.recentFlags.map((f, idx) => (
                    <div key={idx} className="flex items-start justify-between gap-3 bg-white px-3 py-3">
                      <div>
                        <div className="text-xs font-extrabold uppercase tracking-[0.2em] text-slate-500">
                          {f.date}
                        </div>
                        <div className="mt-0.5 text-sm font-semibold text-slate-900">{f.type}</div>
                        <div className="text-xs text-slate-600">{f.detail}</div>
                      </div>
                      <span
                        className={cls(
                          "mt-1 rounded-full px-2 py-1 text-[11px] font-bold",
                          f.type.toLowerCase().includes("fail")
                            ? "bg-rose-50 text-rose-700"
                            : f.type.toLowerCase().includes("miss")
                            ? "bg-amber-50 text-amber-700"
                            : "bg-slate-100 text-slate-700"
                        )}
                      >
                        {f.type}
                      </span>
                    </div>
                  ))}
                </div>

                <div className="mt-3 flex gap-2">
                  <Link
                    href="/reports?range=4w"
                    className="inline-flex w-full items-center justify-center rounded-2xl bg-black px-4 py-2 text-sm font-semibold text-white hover:bg-slate-900"
                  >
                    Open 4-week report
                  </Link>
                </div>
              </div>
            </div>

            {/* Footer spacing */}
            <div className="h-4" />
          </div>
        </div>
      </div>
    </div>
  );
}

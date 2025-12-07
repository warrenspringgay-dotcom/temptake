// src/app/app/page.tsx
import React from "react";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "TempTake · Demo Dashboard",
  description:
    "A preview of how TempTake keeps your daily temperatures, cleaning, and allergen checks under control.",
};

export default function AppDemoDashboardPage() {
  // Hard-coded example date to mirror your screenshot
  const prettyDate = "Sunday 7 December 2025";

  return (
    <main className="space-y-6">
      {/* Top: demo banner + heading */}
      <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full bg-emerald-500/10 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.18em] text-emerald-600">
            Demo only
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
          </div>
          <h1 className="mt-3 text-xl font-semibold text-slate-900">
            Demo dashboard
          </h1>
          <p className="text-sm text-slate-500">
            This is a sample view of the in-kitchen dashboard. In the real app,
            these tiles update live from your temperature logs, cleaning rota and
            team training records.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
          <span className="rounded-full bg-slate-100 px-3 py-1">
            Location:{" "}
            <span className="font-medium text-slate-800">Demo kitchen</span>
          </span>
          <span className="rounded-full bg-slate-100 px-3 py-1">
            Example data only
          </span>
        </div>
      </header>

      {/* Centered date header (like real dashboard) */}
      <section className="text-center">
        <div className="text-[11px] font-semibold uppercase tracking-[0.25em] text-slate-400">
          Today
        </div>
        <div className="mt-1 text-xl font-semibold text-slate-900 sm:text-2xl">
          {prettyDate}
        </div>
      </section>

      {/* KPI strip: Entries / Failures / EOM / Cleaning */}
      <section className="rounded-3xl border border-white/60 bg-white p-4 shadow-md shadow-slate-900/5">
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {/* Entries today */}
          <article className="flex min-h-[76px] flex-col justify-between rounded-xl border border-rose-200 bg-rose-50 px-3 py-3 text-left text-rose-800 shadow-sm">
            <div className="flex items-center justify-between text-[11px] font-medium">
              <span>Entries today</span>
              <span>✖</span>
            </div>
            <div className="mt-1 text-2xl font-semibold">0</div>
            <div className="mt-1 text-[11px] opacity-80">
              No temperatures logged yet today.
            </div>
          </article>

          {/* Failures (7d) */}
          <article className="flex min-h-[76px] flex-col justify-between rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-3 text-left text-emerald-900 shadow-sm">
            <div className="flex items-center justify-between text-[11px] font-medium">
              <span>Failures (7d)</span>
              <span>✅</span>
            </div>
            <div className="mt-1 text-2xl font-semibold">0</div>
            <div className="mt-1 text-[11px] opacity-80">
              No failed temperature checks in the last week.
            </div>
          </article>

          {/* Employee of the month */}
          <article className="flex min-h-[76px] flex-col justify-between rounded-xl border border-amber-200 bg-amber-50 px-3 py-3 text-left text-amber-900 shadow-sm">
            <div className="flex items-center justify-between text-[11px] font-medium">
              <span>Employee of the month</span>
              <span>🏆</span>
            </div>
            <div className="mt-1 text-base font-semibold">
              Emma Dundon
            </div>
            <div className="mt-1 text-[11px] opacity-80">
              103 pts · Temps 42 · Cleaning 61
            </div>
          </article>

          {/* Cleaning (today) */}
          <article className="flex min-h-[76px] flex-col justify-between rounded-xl border border-rose-200 bg-rose-50 px-3 py-3 text-left text-rose-900 shadow-sm">
            <div className="flex items-center justify-between text-[11px] font-medium">
              <span>Cleaning (today)</span>
              <span>✖</span>
            </div>
            <div className="mt-1 text-2xl font-semibold">0/4</div>
            <div className="mt-1 text-[11px] underline underline-offset-2 opacity-80">
              Click to complete remaining tasks (in real app).
            </div>
          </article>
        </div>
      </section>

      {/* Today's Cleaning Tasks card */}
      <section className="rounded-3xl border border-white/60 bg-white p-4 shadow-md shadow-slate-900/5">
        <div className="mb-2 flex flex-wrap items-center gap-2">
          <h2 className="text-base font-semibold text-slate-900">
            Today&apos;s Cleaning Tasks
          </h2>

          <div className="ml-auto flex items-center gap-2">
            <div className="rounded-xl border border-gray-200 bg-white px-3 py-1.5 text-sm shadow-sm">
              0/4
            </div>
            <div className="rounded-xl border border-gray-200 bg-white px-3 py-1.5 text-xs shadow-sm">
              ED
            </div>
            <button
              type="button"
              className="inline-flex items-center justify-center whitespace-nowrap rounded-2xl bg-gradient-to-r from-emerald-500 via-lime-500 to-emerald-500 px-3 py-1.5 text-sm font-medium text-white shadow-sm shadow-emerald-500/30"
            >
              Complete All
            </button>
          </div>
        </div>

        {/* Weekly / Monthly – mirror screenshot (no tasks) */}
        <div className="space-y-2">
          <div className="text-[11px] font-semibold uppercase text-gray-500">
            Weekly / Monthly
          </div>
          <div className="rounded-xl border border-gray-200 bg-white px-3 py-3 text-sm text-gray-500 shadow-sm">
            No tasks.
          </div>
        </div>

        {/* Daily tasks by category – two example tiles like screenshot */}
        <div className="mt-4 space-y-2">
          <div className="text-[11px] font-semibold uppercase text-gray-500">
            Daily tasks (by category)
          </div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
            <CategoryPill title="Close-down" total={1} open={1} />
            <CategoryPill title="Cleaning down" total={3} open={3} />
          </div>
        </div>
      </section>

      {/* Temperature Logs preview – simplified, just to show layout */}
      <section className="rounded-3xl border border-white/60 bg-white p-4 shadow-md shadow-slate-900/5">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-base font-semibold text-slate-900">
            Temperature Logs
          </h2>
          <button
            type="button"
            className="rounded-2xl border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-800 shadow-sm"
          >
            Refresh (demo)
          </button>
        </div>

        {/* Desktop table style */}
        <div className="hidden overflow-x-auto md:block">
          <table className="w-full table-fixed text-sm">
            <thead className="bg-slate-50 text-slate-600">
              <tr className="text-left text-[11px] font-semibold uppercase tracking-wide">
                <th className="w-[8.5rem] px-3 py-2">Date</th>
                <th className="w-16 px-3 py-2">Initials</th>
                <th className="w-[9rem] px-3 py-2">Location</th>
                <th className="w-[10rem] px-3 py-2">Item</th>
                <th className="w-[10rem] px-3 py-2">Target</th>
                <th className="w-[7rem] px-3 py-2">Temp (°C)</th>
                <th className="w-[6.5rem] px-3 py-2 text-right">Status</th>
              </tr>
            </thead>
            <tbody>
              {/* Grouped by date – one example date group */}
              <tr className="border-t bg-slate-50">
                <td
                  colSpan={7}
                  className="px-3 py-2 text-sm font-semibold text-slate-700"
                >
                  07/12/2025
                </td>
              </tr>
              <TempLogRow
                initials="ED"
                location="Walk-in fridge"
                item="Line 1 – dairy"
                target="Fridge (0–5 °C)"
                temp="3.4"
                status="pass"
              />
              <TempLogRow
                initials="TR"
                location="Hot hold"
                item="Chicken curry"
                target="Hot hold (60+ °C)"
                temp="62.0"
                status="pass"
              />
              <TempLogRow
                initials="DW"
                location="Prep fridge"
                item="Fish section"
                target="Fridge (0–5 °C)"
                temp="11.8"
                status="fail"
              />
            </tbody>
          </table>
        </div>

        {/* Mobile cards */}
        <div className="space-y-2 md:hidden">
          <div className="mb-1 text-xs font-medium text-gray-600">
            07/12/2025
          </div>
          <MobileTempCard
            initials="ED"
            location="Walk-in fridge"
            item="Line 1 – dairy"
            target="Fridge (0–5 °C)"
            temp="3.4"
            status="pass"
          />
          <MobileTempCard
            initials="TR"
            location="Hot hold"
            item="Chicken curry"
            target="Hot hold (60+ °C)"
            temp="62.0"
            status="pass"
          />
          <MobileTempCard
            initials="DW"
            location="Prep fridge"
            item="Fish section"
            target="Fridge (0–5 °C)"
            temp="11.8"
            status="fail"
          />
        </div>
      </section>

      {/* Bottom hint */}
      <section className="rounded-2xl border border-dashed border-emerald-400/60 bg-emerald-50/60 px-4 py-3 text-[11px] text-emerald-800">
        <p>
          This is a demo view only. In the live version of TempTake, this dashboard
          connects to your actual temperature logs, cleaning rota and team training
          records across one or more locations.
        </p>
      </section>
    </main>
  );
}

/* ================== SMALL PRESENTATIONAL COMPONENTS ================== */

function CategoryPill({
  title,
  total,
  open,
}: {
  title: string;
  total: number;
  open: number;
}) {
  const hasOpen = open > 0;
  const color = hasOpen
    ? "bg-rose-50 text-rose-700 border-rose-200"
    : "bg-emerald-50 text-emerald-700 border-emerald-200";

  return (
    <button
      type="button"
      className={`flex min-h-[64px] flex-col justify-between rounded-xl border px-3 py-2 text-left text-sm shadow-sm ${color}`}
    >
      <div className="text-[13px] leading-tight">{title}</div>
      <div className="mt-1 text-lg font-semibold leading-none">
        {total}
        <span className="ml-1 text-[11px] opacity-75">({open} open)</span>
      </div>
    </button>
  );
}

type LogStatus = "pass" | "fail";

function TempLogRow({
  initials,
  location,
  item,
  target,
  temp,
  status,
}: {
  initials: string;
  location: string;
  item: string;
  target: string;
  temp: string;
  status: LogStatus;
}) {
  const pillClasses =
    status === "pass"
      ? "bg-emerald-100 text-emerald-800"
      : "bg-rose-100 text-rose-800";

  return (
    <tr className="border-t bg-white">
      <td className="px-3 py-2 text-xs text-gray-400" />
      <td className="px-3 py-2 font-medium uppercase">{initials}</td>
      <td className="px-3 py-2">{location}</td>
      <td className="px-3 py-2">{item}</td>
      <td className="px-3 py-2">{target}</td>
      <td className="px-3 py-2">{temp}</td>
      <td className="px-3 py-2 text-right">
        <span
          className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${pillClasses}`}
        >
          {status}
        </span>
      </td>
    </tr>
  );
}

function MobileTempCard({
  initials,
  location,
  item,
  target,
  temp,
  status,
}: {
  initials: string;
  location: string;
  item: string;
  target: string;
  temp: string;
  status: LogStatus;
}) {
  const pillClasses =
    status === "pass"
      ? "bg-emerald-100 text-emerald-800"
      : "bg-rose-100 text-rose-800";

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-gray-100 text-xs font-semibold">
            {initials}
          </span>
          <div className="text-sm font-medium">{item}</div>
        </div>
        <span
          className={`ml-2 rounded-full px-2 py-0.5 text-[11px] font-medium ${pillClasses}`}
        >
          {status}
        </span>
      </div>
      <div className="mt-1 text-xs text-gray-600">
        {location} • {temp}°C
      </div>
      <div className="mt-1 text-[11px] text-gray-500">Target: {target}</div>
    </div>
  );
}

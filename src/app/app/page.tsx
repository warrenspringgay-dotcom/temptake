// src/app/app/page.tsx
import React from "react";
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "TempTake · Demo Dashboard",
  description:
    "A preview of how TempTake keeps your daily temperatures, cleaning and allergen checks under control.",
};

export default function AppDemoDashboardPage() {
  return (
    <main className="mx-auto max-w-6xl space-y-6 px-4 py-4">
      {/* Small demo badge + heading */}
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-emerald-700">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            Demo only
          </div>
          <h1 className="text-xl font-semibold text-slate-900">
            Demo kitchen · Today
          </h1>
          <p className="text-xs text-slate-500">
            This is a non-live preview of your TempTake dashboard. The real app
            pulls live checks from your own kitchens.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 text-xs">
          <Link
            href="/launch#waitlist"
            className="inline-flex items-center rounded-full bg-emerald-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-emerald-700"
          >
            Join early access
          </Link>
          <Link
            href="/launch#pricing"
            className="inline-flex items-center rounded-full border border-slate-300 bg-white px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50"
          >
            Read more &amp; pricing
          </Link>
        </div>
      </header>

      {/* KPI row – mirrors real dashboard cards */}
      <section className="grid gap-4 md:grid-cols-4">
        <KpiCard
          label="Entries today"
          value="0"
          tone="danger"
          description="No temperatures logged yet today."
        />
        <KpiCard
          label="Failures (7d)"
          value="0"
          tone="ok"
          description="No failed temperature checks in the last week."
        />
        <KpiCard
          label="Employee of the month"
          value="Emma Dundon"
          tone="highlight"
          description="103 pts · Temps 42 · Cleaning 61"
          icon="🏆"
        />
        <KpiCard
          label="Cleaning (today)"
          value="0/4"
          tone="danger"
          description="Click to complete remaining tasks."
        />
      </section>

      {/* Today’s cleaning tasks – demo */}
      <section className="rounded-3xl border border-slate-200 bg-white px-4 py-4 shadow-sm">
        <header className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-base font-semibold text-slate-900">
            Today&apos;s Cleaning Tasks
          </h2>
          <div className="flex items-center gap-2 text-xs">
            <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] text-slate-700">
              0 / 4
            </span>
            <button className="inline-flex items-center rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[11px] text-slate-700">
              ED ▾
            </button>
            <button className="inline-flex items-center rounded-full bg-emerald-600 px-4 py-1.5 text-[11px] font-semibold text-white shadow-sm">
              Complete All
            </button>
          </div>
        </header>

        {/* Weekly/monthly placeholder */}
        <div className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3 text-xs text-slate-500">
          <div className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
            Weekly / monthly
          </div>
          <p>No tasks in this view for the demo.</p>
        </div>

        {/* Daily tasks by category */}
        <div className="mt-4">
          <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
            Daily tasks (by category)
          </div>

          <div className="mt-2 grid gap-3 sm:grid-cols-2">
            <CleaningCategoryCard
              title="Close-down"
              openCount={1}
              description="Deep clean pass & walk-in, close-down checks."
            />
            <CleaningCategoryCard
              title="Cleaning down"
              openCount={3}
              description="Grill, flat top, pot wash and touch points."
            />
          </div>
        </div>
      </section>

      {/* Temperature logs – demo table */}
      <section className="rounded-3xl border border-slate-200 bg-white px-4 py-4 shadow-sm">
        <header className="mb-3 flex items-center justify-between gap-2">
          <h2 className="text-base font-semibold text-slate-900">
            Temperature Logs
          </h2>
          <button className="inline-flex items-center rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-700 hover:bg-slate-50">
            Refresh
          </button>
        </header>

        <div className="overflow-x-auto">
          <table className="min-w-full border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-[11px] uppercase tracking-wide text-slate-500">
                <th className="px-2 py-2 text-left">Time</th>
                <th className="px-2 py-2 text-left">Initials</th>
                <th className="px-2 py-2 text-left">Location</th>
                <th className="px-2 py-2 text-left">Item</th>
                <th className="px-2 py-2 text-left">Target</th>
                <th className="px-2 py-2 text-left">Temp (°C)</th>
                <th className="px-2 py-2 text-left">Status</th>
              </tr>
            </thead>
            <tbody>
              {DEMO_LOGS.map((log) => (
                <tr
                  key={log.id}
                  className="border-b border-slate-100 last:border-0"
                >
                  <td className="px-2 py-2 whitespace-nowrap text-slate-700">
                    {log.time}
                  </td>
                  <td className="px-2 py-2 whitespace-nowrap text-slate-700">
                    {log.initials}
                  </td>
                  <td className="px-2 py-2 whitespace-nowrap text-slate-700">
                    {log.location}
                  </td>
                  <td className="px-2 py-2 whitespace-nowrap text-slate-700">
                    {log.item}
                  </td>
                  <td className="px-2 py-2 whitespace-nowrap text-slate-500">
                    {log.target}
                  </td>
                  <td className="px-2 py-2 whitespace-nowrap text-slate-900">
                    {log.temp}
                  </td>
                  <td className="px-2 py-2 whitespace-nowrap">
                    <StatusPill status={log.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <p className="mt-3 text-[11px] text-slate-500">
          These logs are example data only. In the real app, this table shows live checks
          from your team with filters for date, location, equipment and initials.
        </p>
      </section>

      {/* Bottom note */}
      <section className="rounded-2xl border border-dashed border-emerald-400/60 bg-emerald-50/50 px-4 py-3 text-[11px] text-emerald-800">
        <p>
          This dashboard is a demo copy of your real TempTake view. To get a live account
          for your own kitchen,{" "}
          <Link
            href="/launch#waitlist"
            className="font-semibold underline underline-offset-2"
          >
            join the early access list
          </Link>{" "}
          and we&apos;ll be in touch.
        </p>
      </section>
    </main>
  );
}

/* ============ Helper components / demo data =========== */

type KpiTone = "ok" | "danger" | "highlight";

function KpiCard({
  label,
  value,
  description,
  tone,
  icon,
}: {
  label: string;
  value: string;
  description: string;
  tone: KpiTone;
  icon?: string;
}) {
  const toneClasses =
    tone === "ok"
      ? "border-emerald-200 bg-emerald-50/80"
      : tone === "danger"
      ? "border-rose-200 bg-rose-50/80"
      : "border-amber-200 bg-amber-50/80";

  return (
    <article
      className={`flex h-full flex-col justify-between rounded-3xl border px-4 py-3 shadow-sm ${toneClasses}`}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="text-xs font-semibold text-slate-800">{label}</div>
        {icon && <span className="text-lg">{icon}</span>}
      </div>
      <div className="mt-2 text-2xl font-semibold text-slate-900">{value}</div>
      <p className="mt-2 text-[11px] text-slate-600">{description}</p>
    </article>
  );
}

function CleaningCategoryCard({
  title,
  openCount,
  description,
}: {
  title: string;
  openCount: number;
  description: string;
}) {
  return (
    <div className="flex flex-col justify-between rounded-2xl border border-rose-200 bg-rose-50 px-3 py-3">
      <div>
        <div className="text-sm font-semibold text-rose-800">{title}</div>
        <p className="mt-1 text-[11px] text-rose-700">{description}</p>
      </div>
      <div className="mt-2 text-xs text-rose-800">
        <span className="font-semibold">{openCount}</span>{" "}
        <span className="text-rose-700">
          ({openCount === 1 ? "1 open" : `${openCount} open`})
        </span>
      </div>
    </div>
  );
}

type LogStatus = "pass" | "fail" | "borderline";

function StatusPill({ status }: { status: LogStatus }) {
  if (status === "pass") {
    return (
      <span className="inline-flex items-center rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">
        pass
      </span>
    );
  }
  if (status === "borderline") {
    return (
      <span className="inline-flex items-center rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-700">
        watch
      </span>
    );
  }
  return (
    <span className="inline-flex items-center rounded-full bg-rose-50 px-2 py-0.5 text-[11px] font-semibold text-rose-700">
      check
    </span>
  );
}

const DEMO_LOGS: {
  id: number;
  time: string;
  initials: string;
  location: string;
  item: string;
  target: string;
  temp: string;
  status: LogStatus;
}[] = [
  {
    id: 1,
    time: "13:51",
    initials: "WS",
    location: "Fridge",
    item: "Under-counter freezer",
    target: "Frozen (≤ -18 °C)",
    temp: "-18",
    status: "pass",
  },
  {
    id: 2,
    time: "12:05",
    initials: "ED",
    location: "Hot hold",
    item: "Chicken curry (GN 1/1)",
    target: "Hot hold (≥ 63 °C)",
    temp: "62.0",
    status: "borderline",
  },
  {
    id: 3,
    time: "10:32",
    initials: "ED",
    location: "Prep fridge",
    item: "Fish prep bench",
    target: "Chilled (0–5 °C)",
    temp: "11.8",
    status: "fail",
  },
];

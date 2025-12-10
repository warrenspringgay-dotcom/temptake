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
    <main className="mx-auto max-w-6xl space-y-6 px-4 py-6">
      {/* Top demo banner + back link */}
      <header className="relative flex flex-wrap items-center justify-between gap-3">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-emerald-700">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            Demo only
          </div>
          <p className="text-xs text-slate-500">
            This is a non-live preview of your TempTake dashboard. In the real
            app this view uses your own kitchen, checks and staff.
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
            href="/pricing"
            className="inline-flex items-center rounded-full border border-slate-300 bg-white px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50"
          >
            Read more &amp; pricing
          </Link>
        </div>

        <Link
          href="/"
          className="absolute right-0 top-0 rounded-full bg-black/50 px-3 py-1 text-xs text-slate-50 shadow-sm backdrop-blur hover:bg-black/70"
        >
          ✕ Back
        </Link>
      </header>

      {/* Date strip – mirrors live dashboard header */}
      <section className="rounded-3xl border border-slate-200 bg-white/80 px-4 py-5 text-center shadow-sm">
        <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">
          Demo kitchen
        </div>
        <h1 className="mt-1 text-2xl font-semibold text-slate-900 sm:text-3xl">
          Wednesday 10 December 2025
        </h1>
        <p className="mt-1 text-xs text-slate-500 sm:text-sm">
          At-a-glance view of safety, cleaning and compliance – using example
          data only.
        </p>
      </section>

      {/* KPI row – mirrored layout */}
      <section className="grid gap-4 md:grid-cols-3">
        <KpiCard
          label="Temperature logs today"
          value="0"
          tone="danger"
          description="No temperatures logged yet today."
        />
        <KpiCard
          label="Cleaning (today)"
          value="0/5"
          tone="highlight"
          description="Some scheduled cleaning tasks still open."
          icon="🧽"
        />
        <KpiCard
          label="Alerts"
          value="0"
          tone="ok"
          description="No training, allergen or temperature issues flagged."
          icon="⚠️"
        />
      </section>

      {/* Middle row – kitchen wall + employee of the month */}
      <section className="grid gap-4 md:grid-cols-2">
        {/* Kitchen wall – latest posts */}
        <article className="flex flex-col rounded-3xl border border-slate-200 bg-white/80 p-4 shadow-sm">
          <header className="mb-3 flex items-center justify-between gap-2">
            <div>
              <h2 className="text-sm font-semibold text-slate-900">
                Kitchen wall – latest posts
              </h2>
              <p className="text-xs text-slate-500">
                The last three notes pinned to the kitchen wall.
              </p>
            </div>
            <Link
              href="/demo-wall"
              className="text-[11px] font-medium text-emerald-700 underline underline-offset-2 hover:text-emerald-800"
            >
              View wall
            </Link>
          </header>

          <div className="flex flex-wrap gap-3">
            <DemoNote
              initials="WS"
              bg="bg-violet-200"
              date="2025-12-10"
              text="Need bin bag"
            />
            <DemoNote
              initials="WS"
              bg="bg-cyan-200"
              date="2025-11-24"
              text="Launching soon"
            />
            <DemoNote
              initials="ED"
              bg="bg-amber-200"
              date="2025-11-21"
              text="Hi"
            />
          </div>
        </article>

        {/* Employee of the month */}
        <article className="flex flex-col rounded-3xl border border-amber-200 bg-amber-50/90 p-4 shadow-sm">
          <header className="mb-3 flex items-center justify-between gap-2">
            <div>
              <h2 className="text-sm font-semibold text-amber-900">
                Employee of the month
              </h2>
              <p className="text-xs text-amber-800">
                Based on completed cleaning tasks and temperature logs.
              </p>
            </div>
            <span className="text-xl">🏆</span>
          </header>

          <div className="space-y-1 text-sm text-amber-900">
            <div className="text-base font-semibold">Emma Dundon</div>
            <div className="text-xs text-amber-800">
              Total points: <span className="font-semibold">105</span>
            </div>
            <div className="text-xs text-amber-800">
              Cleaning tasks: <span className="font-semibold">63</span> · Temp
              logs: <span className="font-semibold">42</span>
            </div>
            <p className="mt-2 text-xs text-amber-900/90">
              In the real app this card updates automatically from your team’s
              completions and leaderboard.
            </p>
          </div>

          <div className="mt-4">
            <Link
              href="/leaderboard"
              className="inline-flex items-center justify-center rounded-2xl bg-amber-700 px-4 py-1.5 text-xs font-semibold text-amber-50 shadow-sm hover:bg-amber-800"
            >
              View full leaderboard
            </Link>
          </div>
        </article>
      </section>

      {/* Quick actions – mirrors bottom panel with subtle jump */}
      <section className="rounded-3xl border border-slate-200 bg-white/80 p-4 shadow-sm">
        <h2 className="mb-3 text-sm font-semibold text-slate-900">
          Quick actions
        </h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <QuickAction icon="📋" label="Routines" />
          <QuickAction icon="⚠️" label="Allergens" />
          <QuickAction icon="🧽" label="Cleaning rota" />
          <QuickAction icon="👥" label="Team & training" />
          <QuickAction icon="📊" label="Reports" />
          <QuickAction icon="📍" label="Locations & sites" />
          <QuickAction icon="🧳" label="Manager view" />
          <QuickAction icon="❓" label="Help & support" />
        </div>
      </section>

      {/* Temperature logs – keep as before, for detail view */}
      <section className="rounded-3xl border border-slate-200 bg-white px-4 py-4 shadow-sm">
        <header className="mb-3 flex items-center justify-between gap-2">
          <h2 className="text-base font-semibold text-slate-900">
            Temperature Logs (demo data)
          </h2>
          <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-[11px] text-slate-600">
            Example only
          </span>
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
                  <td className="whitespace-nowrap px-2 py-2 text-slate-700">
                    {log.time}
                  </td>
                  <td className="whitespace-nowrap px-2 py-2 text-slate-700">
                    {log.initials}
                  </td>
                  <td className="whitespace-nowrap px-2 py-2 text-slate-700">
                    {log.location}
                  </td>
                  <td className="whitespace-nowrap px-2 py-2 text-slate-700">
                    {log.item}
                  </td>
                  <td className="whitespace-nowrap px-2 py-2 text-slate-500">
                    {log.target}
                  </td>
                  <td className="whitespace-nowrap px-2 py-2 text-slate-900">
                    {log.temp}
                  </td>
                  <td className="whitespace-nowrap px-2 py-2">
                    <StatusPill status={log.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <p className="mt-3 text-[11px] text-slate-500">
          These logs are example data only. In the real app, this table shows
          live checks from your team with filters for date, location, equipment
          and initials.
        </p>
      </section>

      {/* Bottom note */}
      <section className="rounded-2xl border border-dashed border-emerald-400/60 bg-emerald-50/50 px-4 py-3 text-[11px] text-emerald-800">
        <p>
          This dashboard mirrors the layout of your real TempTake view. To get a
          live account for your own kitchen,{" "}
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
      className={`flex h-full flex-col justify-between rounded-3xl border px-4 py-3 shadow-sm transition-transform duration-150 hover:-translate-y-0.5 hover:shadow-md ${toneClasses}`}
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

function DemoNote({
  initials,
  bg,
  date,
  text,
}: {
  initials: string;
  bg: string;
  date: string;
  text: string;
}) {
  return (
    <div
      className={`flex flex-col justify-between rounded-2xl px-3 py-2 text-xs text-slate-900 shadow-sm ${bg}`}
    >
      <div className="mb-1 flex items-center justify-between gap-2">
        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-900 text-[11px] font-semibold text-white">
          {initials}
        </span>
        <span className="text-[10px] text-slate-700">{date}</span>
      </div>
      <p className="text-[11px] text-slate-900">{text}</p>
    </div>
  );
}

function QuickAction({ icon, label }: { icon: string; label: string }) {
  return (
    <button className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-800 shadow-sm transition-transform duration-150 hover:-translate-y-0.5 hover:shadow-md hover:bg-slate-50">
      <div className="flex items-center gap-2">
        <span className="text-base">{icon}</span>
        <span className="font-medium">{label}</span>
      </div>
    </button>
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
    location: "Freezer",
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

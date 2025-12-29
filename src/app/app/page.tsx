// src/app/app/page.tsx
import React from "react";

type LogStatus = "pass" | "fail" | "watch";

const DEMO_DATE = "Monday 29 December 2025";

const DEMO_KPIS = {
  tempsToday: 0,
  cleaningDone: 0,
  cleaningTotal: 33,
  alerts: 0,
};

const DEMO_WALL = [
  { initials: "WS", date: "14-12-2025", text: "check out the guides", tone: "lav" },
  { initials: "WS", date: "10-12-2025", text: "need bin bag", tone: "lav2" },
  { initials: "WS", date: "24-11-2025", text: "Launching soon", tone: "cyan" },
];

const DEMO_EMPLOYEE = {
  name: "Emma Dundon",
  points: 109,
  cleanings: 63,
  temps: 46,
};

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
    temp: "-18.0",
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
    status: "watch",
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

function cls(...parts: Array<string | false | undefined>) {
  return parts.filter(Boolean).join(" ");
}

export default function AppDemoDashboardPage() {
  const cleaningProgress =
    DEMO_KPIS.cleaningTotal === 0
      ? 0
      : Math.round((DEMO_KPIS.cleaningDone / DEMO_KPIS.cleaningTotal) * 100);

  return (
    <main className="mx-auto w-full px-3 sm:px-4 md:max-w-6xl">
      {/* Page header */}
      <section className="py-5 text-center sm:py-7">
        <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">
          {DEMO_DATE}
        </h1>
        <p className="mt-1 text-sm text-slate-600">
          Safety, cleaning and compliance at a glance.
        </p>
      </section>

      {/* KPI cards row */}
      <section className="grid gap-4 md:grid-cols-3">
        {/* Temperature logs */}
        <Card
          tone="red"
          title="Temperature Logs"
          value={`${DEMO_KPIS.tempsToday}`}
          subtitle="No temperatures logged yet today."
          rightBadge={
            <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-red-200 text-red-900">
              ✖
            </span>
          }
          footerLeft={<span className="text-xs text-slate-600">Tap to log</span>}
          footerRight={<span className="text-xs text-slate-500">Today</span>}
        />

        {/* Cleaning today */}
        <Card
          tone="pink"
          title="Cleaning (Today)"
          value={`${DEMO_KPIS.cleaningDone}/${DEMO_KPIS.cleaningTotal}`}
          subtitle="Some scheduled cleaning tasks still open."
          rightBadge={
            <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-amber-200 text-amber-900">
              🧽
            </span>
          }
          footerLeft={
            <div className="w-full">
              <div className="mb-2 flex items-center justify-between text-xs text-slate-600">
                <span>Progress</span>
                <span>{cleaningProgress}%</span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200">
                <div
                  className="h-full rounded-full bg-amber-400"
                  style={{ width: `${cleaningProgress}%` }}
                />
              </div>
            </div>
          }
        />

        {/* Alerts */}
        <Card
          tone="green"
          title="Alerts"
          value={`${DEMO_KPIS.alerts}`}
          subtitle="No training, allergen or temperature issues flagged."
          rightBadge={
            <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-200 text-emerald-900">
              ✓
            </span>
          }
          footerLeft={<span className="text-xs text-slate-600">View details</span>}
          footerRight={<span className="text-xs text-slate-500">OK</span>}
        />
      </section>

      {/* Kitchen wall + Employee of the month */}
      <section className="mt-5 grid gap-4 md:grid-cols-2">
        {/* Kitchen wall */}
        <div className="rounded-3xl border border-slate-200 bg-white/80 p-4 shadow-sm">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="text-base font-bold text-slate-900">Kitchen wall</h3>
              <p className="text-xs text-slate-600">
                Latest three notes from the team.
              </p>
            </div>
            <button className="text-xs font-semibold text-amber-700 hover:text-amber-800">
              View wall
            </button>
          </div>

          <div className="mt-4 flex flex-wrap gap-3">
            {DEMO_WALL.map((n, i) => (
              <WallNote
                key={i}
                initials={n.initials}
                date={n.date}
                text={n.text}
                tone={n.tone}
              />
            ))}
          </div>
        </div>

        {/* Employee of the month */}
        <div className="rounded-3xl border border-amber-200 bg-amber-50/90 p-4 shadow-sm">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="text-base font-bold text-amber-900">
                Employee of the month
              </h3>
              <p className="text-xs text-amber-800">
                Based on completed cleaning tasks and temperature logs this month.
              </p>
            </div>
            <span className="text-2xl">🏆</span>
          </div>

          <div className="mt-4">
            <div className="text-lg font-extrabold text-amber-950">
              {DEMO_EMPLOYEE.name}
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
              <Pill tone="amber">⭐ {DEMO_EMPLOYEE.points} points</Pill>
              <Pill tone="amber">🧽 {DEMO_EMPLOYEE.cleanings} cleanings</Pill>
              <Pill tone="amber">🌡 {DEMO_EMPLOYEE.temps} temps</Pill>
            </div>

            <button className="mt-4 inline-flex items-center justify-center rounded-2xl bg-amber-600 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-amber-700">
              View full leaderboard
            </button>
          </div>
        </div>
      </section>

      {/* Quick actions */}
      <section className="mt-5 rounded-3xl border border-slate-200 bg-white/80 p-4 shadow-sm">
        <h3 className="text-base font-bold text-slate-900">Quick actions</h3>

        <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <QuickPill icon="📋" label="Routines" />
          <QuickPill icon="⚠️" label="Allergens" />
          <QuickPill icon="🧽" label="Cleaning rota" />
          <QuickPill icon="👥" label="Team & training" />
          <QuickPill icon="📊" label="Reports" />
          <QuickPill icon="📍" label="Locations & sites" />
          <QuickPill icon="🧳" label="Manager view" />
          <QuickPill icon="❓" label="Help & support" />
        </div>
      </section>

      {/* Optional: logs table (kept minimal, but consistent) */}
      <section className="mt-5 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex items-start justify-between gap-3">
          <h3 className="text-base font-bold text-slate-900">
            Temperature logs (demo)
          </h3>
          <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[11px] text-slate-600">
            Demo data
          </span>
        </div>

        <div className="mt-3 overflow-x-auto">
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
                <tr key={log.id} className="border-b border-slate-100 last:border-0">
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
                  <td className="whitespace-nowrap px-2 py-2 font-semibold text-slate-900">
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
      </section>

      <div className="h-12" />
    </main>
  );
}

/* ---------------- UI bits that match your screenshot ---------------- */

function Card({
  tone,
  title,
  value,
  subtitle,
  rightBadge,
  footerLeft,
  footerRight,
}: {
  tone: "red" | "pink" | "green";
  title: string;
  value: string;
  subtitle: string;
  rightBadge: React.ReactNode;
  footerLeft?: React.ReactNode;
  footerRight?: React.ReactNode;
}) {
  const toneWrap =
    tone === "red"
      ? "bg-red-50/90 border-red-200"
      : tone === "pink"
      ? "bg-rose-50/90 border-rose-200"
      : "bg-emerald-50/90 border-emerald-200";

  const toneBar =
    tone === "red"
      ? "bg-red-400"
      : tone === "pink"
      ? "bg-rose-400"
      : "bg-emerald-400";

  return (
    <div className={cls("relative overflow-hidden rounded-3xl border p-4 shadow-sm", toneWrap)}>
      {/* left color bar */}
      <div className={cls("absolute left-0 top-0 h-full w-1.5", toneBar)} />

      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-[11px] font-extrabold uppercase tracking-[0.28em] text-slate-700">
            {title}
          </div>
          <div className="mt-2 text-4xl font-extrabold text-slate-900">{value}</div>
          <div className="mt-1 text-sm text-slate-600">{subtitle}</div>
        </div>
        {rightBadge}
      </div>

      <div className="mt-4 flex items-end justify-between gap-3">
        <div className="flex-1">{footerLeft}</div>
        {footerRight ? <div className="shrink-0">{footerRight}</div> : null}
      </div>
    </div>
  );
}

function WallNote({
  initials,
  date,
  text,
  tone,
}: {
  initials: string;
  date: string;
  text: string;
  tone: "lav" | "lav2" | "cyan";
}) {
  const bg =
    tone === "lav"
      ? "bg-violet-200"
      : tone === "lav2"
      ? "bg-fuchsia-200"
      : "bg-cyan-200";

  return (
    <div className={cls("min-w-[150px] flex-1 rounded-2xl p-3 shadow-sm", bg)}>
      <div className="flex items-center justify-between">
        <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-white/70 text-sm font-extrabold text-slate-900">
          {initials}
        </span>
        <span className="rounded-full bg-white/60 px-3 py-1 text-[11px] font-semibold text-slate-700">
          {date}
        </span>
      </div>
      <div className="mt-3 text-sm font-semibold text-slate-900">{text}</div>
    </div>
  );
}

function Pill({ children, tone }: { children: React.ReactNode; tone: "amber" }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-white/70 px-3 py-1 text-xs font-semibold text-amber-900">
      {children}
    </span>
  );
}

function QuickPill({ icon, label }: { icon: string; label: string }) {
  return (
    <button className="flex items-center justify-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-800 shadow-sm hover:bg-slate-50">
      <span>{icon}</span>
      <span>{label}</span>
    </button>
  );
}

function StatusPill({ status }: { status: LogStatus }) {
  if (status === "pass") {
    return (
      <span className="inline-flex items-center rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">
        pass
      </span>
    );
  }
  if (status === "watch") {
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

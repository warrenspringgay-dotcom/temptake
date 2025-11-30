// src/app/app/page.tsx
import React from "react";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "TempTake · Demo Dashboard",
  description:
    "A preview of how TempTake keeps your daily temperatures, cleaning, and allergen checks under control.",
};

export default function AppDemoDashboardPage() {
  return (
    <main className="space-y-6">
      {/* Top banner / breadcrumb */}
      <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full bg-emerald-500/10 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.18em] text-emerald-500">
            Demo only
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
          </div>
          <h1 className="mt-3 text-xl font-semibold text-slate-900">
            TempTake demo dashboard
          </h1>
          <p className="text-sm text-slate-500">
            This is a preview of the in-kitchen dashboard. Real data and login
            access are coming with early access accounts.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
          <span className="rounded-full bg-slate-100 px-3 py-1">
            Location: <span className="font-medium text-slate-800">Demo Kitchen</span>
          </span>
          <span className="rounded-full bg-slate-100 px-3 py-1">
            Today: <span className="font-medium text-slate-800">Service Day (Sample)</span>
          </span>
        </div>
      </header>

      {/* KPI row */}
      <section className="grid gap-3 md:grid-cols-4">
        <KpiCard label="Temps logged" value="12" sub="So far today" accent="ok" />
        <KpiCard label="Cleaning tasks" value="8 / 10" sub="Completed" accent="warn" />
        <KpiCard label="Allergen review" value="Due in 7 days" sub="Last done 23 Sep" accent="info" />
        <KpiCard label="Training status" value="5 / 6" sub="Staff in date" accent="ok" />
      </section>

      {/* Two-column layout: left temps, right cleaning & allergen */}
      <section className="grid gap-4 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        {/* Left column – today's temperatures */}
        <div className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between gap-2">
            <div>
              <h2 className="text-sm font-semibold text-slate-900">
                Today&apos;s temperature checks (demo)
              </h2>
              <p className="text-xs text-slate-500">
                Shows how fridge, freezer and hot hold logs appear for your team.
              </p>
            </div>
            <span className="rounded-full bg-emerald-50 px-3 py-1 text-[11px] font-medium text-emerald-600">
              Swipe to complete in real app
            </span>
          </div>

          <div className="space-y-2">
            <TempRow
              area="Walk-in fridge"
              detail="Line 1 – dairy"
              temp="3.4°C"
              status="pass"
              time="08:12"
              initials="JB"
            />
            <TempRow
              area="Under-counter fridge"
              detail="Sandwich station"
              temp="4.2°C"
              status="pass"
              time="09:03"
              initials="SC"
            />
            <TempRow
              area="Freezer 1"
              detail="Frozen meats"
              temp="-18.6°C"
              status="pass"
              time="07:55"
              initials="MK"
            />
            <TempRow
              area="Hot hold"
              detail="Chicken curry"
              temp="62.0°C"
              status="borderline"
              time="12:05"
              initials="TR"
            />
            <TempRow
              area="Prep fridge"
              detail="Fish section"
              temp="11.8°C"
              status="fail"
              time="10:32"
              initials="DW"
            />
          </div>

          <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-500">
            <span>In the live app, staff log temps in a couple of taps, with initials saved.</span>
            <span className="rounded-full bg-slate-50 px-2 py-1">
              Example only · Not live data
            </span>
          </div>
        </div>

        {/* Right column – cleaning + allergen overview */}
        <div className="space-y-4">
          {/* Cleaning rota card */}
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between gap-2">
              <div>
                <h2 className="text-sm font-semibold text-slate-900">
                  Cleaning rota (demo)
                </h2>
                <p className="text-xs text-slate-500">
                  Daily tasks split by area. Swipe to complete in the real app.
                </p>
              </div>
              <span className="rounded-full bg-amber-50 px-3 py-1 text-[11px] font-medium text-amber-700">
                2 tasks left
              </span>
            </div>

            <div className="mt-3 space-y-1.5 text-xs">
              <CleaningRow
                label="Pass through dishwasher area"
                area="Pot wash"
                status="done"
                initials="LF"
                time="09:40"
              />
              <CleaningRow
                label="Deep clean grill & flat top"
                area="Hot section"
                status="pending"
              />
              <CleaningRow
                label="Sanitise walk-in handles & touch points"
                area="Cold room"
                status="pending"
              />
            </div>
          </div>

          {/* Allergen / training summary */}
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between gap-2">
              <div>
                <h2 className="text-sm font-semibold text-slate-900">
                  Allergen & training status (demo)
                </h2>
                <p className="text-xs text-slate-500">
                  Quick view your EHO will care about during an inspection.
                </p>
              </div>
            </div>

            <div className="mt-3 flex flex-wrap gap-2 text-[11px]">
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-3 py-1 font-medium text-emerald-700">
                ✅ Allergen matrix: in date
              </span>
              <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-3 py-1 font-medium text-amber-700">
                ⏱ Front-of-house briefing due in 7 days
              </span>
              <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-3 py-1 font-medium text-rose-700">
                ⚠ 1 staff member training overdue
              </span>
            </div>

            <p className="mt-3 text-[11px] text-slate-500">
              In the live version, these update automatically as staff complete checks and
              you upload training records.
            </p>
          </div>
        </div>
      </section>

      {/* Bottom hint */}
      <section className="rounded-2xl border border-dashed border-emerald-400/60 bg-emerald-50/50 px-4 py-3 text-[11px] text-emerald-800">
        <p>
          This is a demo view only. To get access to the real, working version of TempTake
          for your kitchen, join the early access list on the launch page – we&apos;ll
          invite you to a live account.
        </p>
      </section>
    </main>
  );
}

/* ================== SMALL PRESENTATIONAL COMPONENTS ================== */

type KpiAccent = "ok" | "warn" | "info";

function KpiCard({
  label,
  value,
  sub,
  accent,
}: {
  label: string;
  value: string;
  sub: string;
  accent: KpiAccent;
}) {
  const accentClasses =
    accent === "ok"
      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
      : accent === "warn"
      ? "border-amber-200 bg-amber-50 text-amber-700"
      : "border-sky-200 bg-sky-50 text-sky-700";

  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="text-[11px] font-medium uppercase tracking-[0.16em] text-slate-500">
        {label}
      </div>
      <div className="mt-2 text-2xl font-semibold text-slate-900">{value}</div>
      <div
        className={`mt-3 inline-flex items-center rounded-full px-2.5 py-1 text-[11px] ${accentClasses}`}
      >
        {sub}
      </div>
    </article>
  );
}

type TempStatus = "pass" | "fail" | "borderline";

function TempRow({
  area,
  detail,
  temp,
  status,
  time,
  initials,
}: {
  area: string;
  detail: string;
  temp: string;
  status: TempStatus;
  time: string;
  initials: string;
}) {
  const statusLabel =
    status === "pass" ? "Pass" : status === "borderline" ? "Watch" : "Check now";
  const statusClasses =
    status === "pass"
      ? "bg-emerald-50 text-emerald-700 border-emerald-200"
      : status === "borderline"
      ? "bg-amber-50 text-amber-700 border-amber-200"
      : "bg-rose-50 text-rose-700 border-rose-200";

  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <p className="truncate text-[13px] font-medium text-slate-900">{area}</p>
          <span className="rounded-full bg-slate-200 px-1.5 py-0.5 text-[10px] font-semibold text-slate-700">
            {initials}
          </span>
        </div>
        <p className="truncate text-[11px] text-slate-500">{detail}</p>
        <p className="mt-0.5 text-[11px] text-slate-400">Logged at {time}</p>
      </div>
      <div className="text-right">
        <div className="text-[15px] font-semibold text-slate-900">{temp}</div>
        <span
          className={`mt-1 inline-flex items-center justify-end rounded-full border px-2 py-0.5 text-[10px] font-medium ${statusClasses}`}
        >
          {statusLabel}
        </span>
      </div>
    </div>
  );
}

type CleaningStatus = "done" | "pending";

function CleaningRow({
  label,
  area,
  status,
  initials,
  time,
}: {
  label: string;
  area: string;
  status: CleaningStatus;
  initials?: string;
  time?: string;
}) {
  const done = status === "done";
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <p className="truncate text-[13px] font-medium text-slate-900">{label}</p>
          <span className="truncate text-[11px] text-slate-500">{area}</span>
        </div>
        {time && initials && (
          <p className="mt-0.5 text-[11px] text-slate-400">
            Completed at {time} by <span className="font-medium">{initials}</span>
          </p>
        )}
      </div>
      <div className="shrink-0">
        {done ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-[11px] font-medium text-emerald-700">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            Done
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-0.5 text-[11px] font-medium text-amber-700">
            <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
            Pending
          </span>
        )}
      </div>
    </div>
  );
}

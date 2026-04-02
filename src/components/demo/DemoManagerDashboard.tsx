"use client";

import React, { useMemo, useState } from "react";
import { motion } from "framer-motion";
import type {
  DemoDashboardData,
  StaffAbsenceRow,
  StaffQcReviewRow,
} from "@/lib/demoDashboard";

function safeDate(val: any): Date | null {
  if (!val) return null;
  const d = val instanceof Date ? val : new Date(val);
  if (Number.isNaN(d.getTime())) return null;
  return d;
}

function formatTimeHM(d: Date | null | undefined): string | null {
  if (!d) return null;
  const hours = String(d.getHours()).padStart(2, "0");
  const mins = String(d.getMinutes()).padStart(2, "0");
  return `${hours}:${mins}`;
}

function formatDDMMYYYY(val: any): string {
  const d = safeDate(val);
  if (!d) return "—";
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
}

function formatAbsenceType(val: string | null | undefined): string {
  if (!val) return "—";
  return String(val)
    .replace(/_/g, " ")
    .replace(/\b\w/g, (m) => m.toUpperCase());
}

function formatAbsenceRange(
  r: Pick<
    StaffAbsenceRow,
    "start_date" | "end_date" | "is_half_day" | "half_day_period"
  >
): string {
  const start = formatDDMMYYYY(r.start_date);
  const end = formatDDMMYYYY(r.end_date);
  const suffix = r.is_half_day
    ? ` (${String(r.half_day_period ?? "").toUpperCase() || "HALF DAY"})`
    : "";
  if (r.start_date === r.end_date) return `${start}${suffix}`;
  return `${start} → ${end}${suffix}`;
}

const cls = (...p: Array<string | false | null | undefined>) =>
  p.filter(Boolean).join(" ");

const isoDate = (d: Date) => d.toISOString().slice(0, 10);

const addDaysISO = (dmy: string, delta: number) => {
  const d = new Date(dmy);
  d.setDate(d.getDate() + delta);
  return isoDate(d);
};

const KPI_HEIGHT = "min-h-[120px]";

function tmLabel(t: { initials: string | null; name: string | null }) {
  const ini = (t.initials ?? "").toString().trim().toUpperCase();
  const nm = (t.name ?? "").toString().trim();
  if (ini && nm) return `${ini} · ${nm}`;
  if (ini) return ini;
  return nm || "—";
}

function KpiTile({
  title,
  value,
  sub,
  tone,
  icon,
}: {
  title: string;
  value: React.ReactNode;
  sub: React.ReactNode;
  tone: "neutral" | "ok" | "warn" | "danger";
  icon?: string;
}) {
  const toneCls =
    tone === "danger"
      ? "border-red-200 bg-red-50/90"
      : tone === "warn"
      ? "border-amber-200 bg-amber-50/90"
      : tone === "ok"
      ? "border-emerald-200 bg-emerald-50/90"
      : "border-slate-200 bg-white/90";

  const accentCls =
    tone === "danger"
      ? "bg-red-400"
      : tone === "warn"
      ? "bg-amber-400"
      : tone === "ok"
      ? "bg-emerald-400"
      : "bg-slate-300";

  return (
    <motion.div
      whileHover={{ y: -3 }}
      className={cls(
        "relative rounded-2xl border p-4 shadow-sm overflow-hidden",
        "flex flex-col",
        KPI_HEIGHT,
        toneCls
      )}
    >
      <div
        className={cls(
          "absolute left-0 top-3 bottom-3 w-1.5 rounded-full opacity-80",
          accentCls
        )}
      />
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-[11px] font-extrabold uppercase tracking-[0.22em] text-slate-500">
            {title}
          </div>
          <div className="mt-1 flex items-baseline gap-2">
            <div className="text-2xl font-extrabold text-slate-900 truncate">
              {value}
            </div>
          </div>
          <div className="mt-1 text-xs text-slate-600 truncate">{sub}</div>
        </div>
        {icon ? (
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-900/5 text-lg">
            <span>{icon}</span>
          </div>
        ) : null}
      </div>
    </motion.div>
  );
}

function TableFooterToggle({
  total,
  showingAll,
  onToggle,
}: {
  total: number;
  showingAll: boolean;
  onToggle: () => void;
}) {
  if (total <= 10) return null;
  return (
    <div className="border-t border-slate-100 bg-slate-50/80 px-3 py-2 text-right text-xs text-slate-600">
      Showing {showingAll ? "all" : "latest 10"} of {total} rows.{" "}
      <button
        type="button"
        onClick={onToggle}
        className="font-semibold text-indigo-700 hover:underline"
      >
        {showingAll ? "Show less" : "Show all"}
      </button>
    </div>
  );
}

export default function DemoManagerDashboard({
  data,
}: {
  data: DemoDashboardData;
}) {
  if (!data || !data.tempsSummary) {
    return (
      <div className="w-full px-3 sm:px-4 md:mx-auto md:max-w-[1100px] py-8">
        <div className="rounded-3xl border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-800">
          Demo dashboard data failed to load.
        </div>
      </div>
    );
  }

  const [selectedDateISO, setSelectedDateISO] = useState(data.selectedDateISO);

  const [showAllTemps, setShowAllTemps] = useState(false);
  const [showAllTempFails, setShowAllTempFails] = useState(false);
  const [showAllCleaning, setShowAllCleaning] = useState(false);
  const [showAllIncidents, setShowAllIncidents] = useState(false);
  const [showAllStaffAbsences, setShowAllStaffAbsences] = useState(false);
  const [showAllSignoffs, setShowAllSignoffs] = useState(false);
  const [showAllQc, setShowAllQc] = useState(false);
  const [showAllAllergenReviews, setShowAllAllergenReviews] = useState(false);
  const [showAllAllergenLogs, setShowAllAllergenLogs] = useState(false);
  const [showAllTraining, setShowAllTraining] = useState(false);
  const [showAllTrainingAreas, setShowAllTrainingAreas] = useState(false);
  const [showAllCalibration, setShowAllCalibration] = useState(false);

  const tempsTone: "neutral" | "ok" | "warn" | "danger" =
    data.tempsSummary.today === 0
      ? "warn"
      : data.tempsSummary.fails7d > 0
      ? "danger"
      : "ok";

  const cleaningTone: "neutral" | "ok" | "warn" | "danger" =
    data.cleaningTotal === 0
      ? "neutral"
      : data.cleaningDoneTotal === data.cleaningTotal
      ? "ok"
      : "warn";

  const incidentsTone: "neutral" | "ok" | "warn" | "danger" =
    data.incidentsToday > 0 ? "danger" : data.incidents7d > 0 ? "warn" : "ok";

  const trainingTone: "neutral" | "ok" | "warn" | "danger" =
    data.trainingExpired > 0
      ? "danger"
      : data.trainingDueSoon > 0
      ? "warn"
      : "ok";

  const staffOffTone: "neutral" | "ok" | "warn" | "danger" =
    data.staffOffToday > 2
      ? "danger"
      : data.staffOffToday > 0
      ? "warn"
      : "ok";

  const tempsToRender = showAllTemps
    ? data.todayTemps
    : data.todayTemps.slice(0, 10);
  const tempFailsToRender = showAllTempFails
    ? data.tempFailsToday
    : data.tempFailsToday.slice(0, 10);
  const cleaningToRender = showAllCleaning
    ? data.cleaningActivity
    : data.cleaningActivity.slice(0, 10);
  const incidentsToRender = showAllIncidents
    ? data.incidentsHistory
    : data.incidentsHistory.slice(0, 10);
  const staffAbsencesToRender = showAllStaffAbsences
    ? data.staffAbsences
    : data.staffAbsences.slice(0, 10);
  const signoffsToRender = showAllSignoffs
    ? data.signoffsToday
    : data.signoffsToday.slice(0, 10);
  const qcToRender = showAllQc ? data.qcReviews : data.qcReviews.slice(0, 10);
  const allergenReviewsToRender = showAllAllergenReviews
    ? data.allergenReviews
    : data.allergenReviews.slice(0, 10);
  const allergenLogsToRender = showAllAllergenLogs
    ? data.allergenLogs
    : data.allergenLogs.slice(0, 10);
  const trainingToRender = showAllTraining
    ? data.trainingRows
    : data.trainingRows.slice(0, 10);
  const trainingAreasToRender = showAllTrainingAreas
    ? data.trainingAreasRows
    : data.trainingAreasRows.slice(0, 10);
  const calibrationToRender = showAllCalibration
    ? data.calibrationChecks
    : data.calibrationChecks.slice(0, 10);

  const hrefForDate = useMemo(
    () => (date: string) => `/demo?date=${encodeURIComponent(date)}`,
    []
  );

  return (
    <div className="w-full px-3 sm:px-4 md:mx-auto md:max-w-[1100px]">
      <header className="py-2">
        <div className="text-center">
          <div className="text-[11px] font-extrabold uppercase tracking-[0.22em] text-slate-400">
            Public demo
          </div>
          <h1 className="mt-1 text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
            {data.selectedDateLabel}
          </h1>
        </div>
      </header>

      <section className="rounded-3xl border border-white/40 bg-white/80 p-3 sm:p-4 shadow-lg shadow-slate-900/5 backdrop-blur">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5">
          <KpiTile
            title="Temps"
            icon="🌡"
            tone={tempsTone}
            value={data.tempsSummary.today}
            sub={
              <>
                Fails (7d):{" "}
                <span
                  className={cls(
                    "font-semibold",
                    data.tempsSummary.fails7d > 0 && "text-red-700"
                  )}
                >
                  {data.tempsSummary.fails7d}
                </span>
              </>
            }
          />

          <KpiTile
            title="Cleaning"
            icon="🧼"
            tone={cleaningTone}
            value={`${data.cleaningDoneTotal}/${data.cleaningTotal}`}
            sub="Tasks completed today"
          />
          <KpiTile
            title="Incidents"
            icon="⚠️"
            tone={incidentsTone}
            value={data.incidentsToday}
            sub={`Last 7d: ${data.incidents7d}`}
          />
          <KpiTile
            title="Staff off"
            icon="🧑‍🍳"
            tone={staffOffTone}
            value={data.staffOffToday}
            sub={`Approved in last 30d: ${data.staffAbsences30d}`}
          />
          <KpiTile
            title="Training"
            icon="🎓"
            tone={trainingTone}
            value={`${data.trainingExpired} expired`}
            sub={`${data.trainingDueSoon} due in 30d`}
          />
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <label className="text-xs font-semibold text-slate-600">Location</label>
            <select
              value={data.locationId}
              disabled
              className="h-9 rounded-xl border border-slate-300 bg-white/80 px-3 text-xs"
            >
              {data.locations.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <label className="text-xs font-semibold text-slate-600">Date</label>
            <input
              type="date"
              value={selectedDateISO}
              onChange={(e) => {
                const next = e.target.value || data.selectedDateISO;
                setSelectedDateISO(next);
                window.location.href = hrefForDate(next);
              }}
              className="h-9 rounded-xl border border-slate-300 bg-white/80 px-3 text-xs"
            />
          </div>

          <div className="flex items-center gap-2">
            <a
              href={hrefForDate(addDaysISO(selectedDateISO, -1))}
              className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
            >
              ◀ Previous
            </a>
            <a
              href="/demo"
              className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
            >
              Latest data
            </a>
            <a
              href={hrefForDate(addDaysISO(selectedDateISO, 1))}
              className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
            >
              Next ▶
            </a>
          </div>

          <a
            href="/signup"
            className="rounded-xl px-4 py-2 text-sm font-semibold shadow-sm bg-indigo-600 text-white hover:bg-indigo-700"
          >
            Start free trial
          </a>
        </div>
      </section>

      <section className="mt-4 rounded-3xl border border-white/40 bg-white/80 p-4 shadow-md shadow-slate-900/5 backdrop-blur">
        <div className="mb-3">
          <div className="text-[11px] font-extrabold uppercase tracking-[0.22em] text-slate-400">
            Cleaning progress
          </div>
          <div className="mt-0.5 text-sm font-semibold text-slate-900">
            By category (selected day)
          </div>
        </div>

        <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white/90">
          <table className="min-w-full text-xs">
            <thead className="bg-slate-50">
              <tr className="text-left text-slate-500">
                <th className="px-3 py-2">Category</th>
                <th className="px-3 py-2">Done</th>
                <th className="px-3 py-2">Total</th>
                <th className="px-3 py-2">Completion</th>
              </tr>
            </thead>
            <tbody>
              {data.cleaningCategoryProgress.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-3 py-4 text-center text-slate-500">
                    No cleaning tasks scheduled for this day.
                  </td>
                </tr>
              ) : (
                data.cleaningCategoryProgress.map((r) => {
                  const pct = r.total > 0 ? Math.round((r.done / r.total) * 100) : 0;
                  const pill =
                    pct === 100
                      ? "bg-emerald-100 text-emerald-800"
                      : pct >= 50
                      ? "bg-amber-100 text-amber-800"
                      : "bg-red-100 text-red-800";

                  return (
                    <tr key={r.category} className="border-t border-slate-100 text-slate-800">
                      <td className="px-3 py-2 font-semibold">{r.category}</td>
                      <td className="px-3 py-2">{r.done}</td>
                      <td className="px-3 py-2">{r.total}</td>
                      <td className="px-3 py-2">
                        <span className={cls("inline-flex rounded-full px-2 py-[1px] text-[10px] font-extrabold uppercase", pill)}>
                          {pct}%
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="mt-4 rounded-3xl border border-white/40 bg-white/80 p-4 shadow-md shadow-slate-900/5 backdrop-blur">
        <div className="mb-3">
          <div className="text-[11px] font-extrabold uppercase tracking-[0.22em] text-slate-400">
            Incidents
          </div>
          <div className="mt-0.5 text-sm font-semibold text-slate-900">
            Incident log & corrective actions (last 90 days)
          </div>
        </div>

        <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white/90">
          <table className="min-w-full text-xs">
            <thead className="bg-slate-50">
              <tr className="text-left text-slate-500">
                <th className="px-3 py-2">Date</th>
                <th className="px-3 py-2">Time</th>
                <th className="px-3 py-2">Type</th>
                <th className="px-3 py-2">By</th>
                <th className="px-3 py-2">Details</th>
                <th className="px-3 py-2">Corrective</th>
              </tr>
            </thead>
            <tbody>
              {incidentsToRender.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-3 py-4 text-center text-slate-500">
                    No incidents logged.
                  </td>
                </tr>
              ) : (
                incidentsToRender.map((r) => (
                  <tr key={r.id} className="border-t border-slate-100 text-slate-800">
                    <td className="px-3 py-2 whitespace-nowrap">{formatDDMMYYYY(r.happened_on)}</td>
                    <td className="px-3 py-2 whitespace-nowrap">
                      {r.created_at
                        ? new Date(r.created_at).toLocaleTimeString("en-GB", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })
                        : "—"}
                    </td>
                    <td className="px-3 py-2 font-semibold">{r.type ?? "Incident"}</td>
                    <td className="px-3 py-2">{r.created_by?.toUpperCase() ?? "—"}</td>
                    <td className="px-3 py-2 max-w-[18rem] truncate">{r.details ?? "—"}</td>
                    <td className="px-3 py-2 max-w-[18rem] truncate">{r.corrective_action ?? "—"}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <TableFooterToggle
          total={data.incidentsHistory.length}
          showingAll={showAllIncidents}
          onToggle={() => setShowAllIncidents((v) => !v)}
        />
      </section>

      <section className="mt-4 rounded-3xl border border-white/40 bg-white/80 p-4 shadow-md shadow-slate-900/5 backdrop-blur">
        <div className="mb-3">
          <div className="text-[11px] font-extrabold uppercase tracking-[0.22em] text-slate-400">
            Today&apos;s activity
          </div>
          <div className="mt-0.5 text-sm font-semibold text-slate-900">
            Temps + cleaning (category-based)
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2 min-w-0">
          <div className="min-w-0">
            <h3 className="mb-2 text-[11px] font-extrabold uppercase tracking-[0.22em] text-slate-500">
              Temperature logs
            </h3>

            <div className="w-full overflow-x-auto rounded-2xl border border-slate-200 bg-white/90">
              <table className="min-w-full text-xs">
                <thead className="bg-slate-50">
                  <tr className="text-left text-slate-500">
                    <th className="px-3 py-2">Time</th>
                    <th className="px-3 py-2">Staff</th>
                    <th className="px-3 py-2">Area</th>
                    <th className="px-3 py-2">Item</th>
                    <th className="px-3 py-2">Temp</th>
                    <th className="px-3 py-2">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {data.todayTemps.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-3 py-4 text-center text-slate-500">
                        No temperature logs.
                      </td>
                    </tr>
                  ) : (
                    tempsToRender.map((r) => (
                      <tr key={r.id} className="border-t border-slate-100 text-slate-800">
                        <td className="px-3 py-2">{r.time}</td>
                        <td className="px-3 py-2">{r.staff}</td>
                        <td className="px-3 py-2">{r.area}</td>
                        <td className="px-3 py-2">{r.item}</td>
                        <td className="px-3 py-2">{r.temp_c != null ? `${r.temp_c}°C` : "—"}</td>
                        <td className="px-3 py-2">
                          {r.status ? (
                            <span
                              className={cls(
                                "inline-flex rounded-full px-2 py-[1px] text-[10px] font-extrabold uppercase",
                                r.status === "pass"
                                  ? "bg-emerald-100 text-emerald-800"
                                  : "bg-red-100 text-red-800"
                              )}
                            >
                              {r.status}
                            </span>
                          ) : (
                            "—"
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <TableFooterToggle
              total={data.todayTemps.length}
              showingAll={showAllTemps}
              onToggle={() => setShowAllTemps((v) => !v)}
            />

            <h3 className="mt-4 mb-2 text-[11px] font-extrabold uppercase tracking-[0.22em] text-slate-500">
              Temp failures & corrective actions
            </h3>

            <div className="w-full overflow-x-auto rounded-2xl border border-slate-200 bg-white/90">
              <table className="min-w-full text-xs">
                <thead className="bg-slate-50">
                  <tr className="text-left text-slate-500">
                    <th className="px-3 py-2">Time</th>
                    <th className="px-3 py-2">By</th>
                    <th className="px-3 py-2">Details</th>
                    <th className="px-3 py-2">Corrective</th>
                  </tr>
                </thead>
                <tbody>
                  {tempFailsToRender.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-3 py-4 text-center text-slate-500">
                        No temp failures.
                      </td>
                    </tr>
                  ) : (
                    tempFailsToRender.map((r) => (
                      <tr key={r.id} className="border-t border-slate-100 text-slate-800">
                        <td className="px-3 py-2 whitespace-nowrap">
                          {r.created_at
                            ? new Date(r.created_at).toLocaleTimeString("en-GB", {
                                hour: "2-digit",
                                minute: "2-digit",
                              })
                            : "—"}
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap">{r.created_by?.toUpperCase() ?? "—"}</td>
                        <td className="px-3 py-2 max-w-[18rem] truncate">{r.details ?? "—"}</td>
                        <td className="px-3 py-2 max-w-[18rem] truncate">{r.corrective_action ?? "—"}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <TableFooterToggle
              total={data.tempFailsToday.length}
              showingAll={showAllTempFails}
              onToggle={() => setShowAllTempFails((v) => !v)}
            />
          </div>

          <div className="min-w-0">
            <h3 className="mb-2 text-[11px] font-extrabold uppercase tracking-[0.22em] text-slate-500">
              Cleaning runs
            </h3>

            <div className="w-full overflow-x-auto rounded-2xl border border-slate-200 bg-white/90">
              <table className="min-w-full text-xs">
                <thead className="bg-slate-50">
                  <tr className="text-left text-slate-500">
                    <th className="px-3 py-2">Time</th>
                    <th className="px-3 py-2">Task</th>
                    <th className="px-3 py-2">Staff</th>
                    <th className="px-3 py-2">Notes</th>
                  </tr>
                </thead>
                <tbody>
                  {cleaningToRender.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-3 py-4 text-center text-slate-500">
                        No cleaning tasks completed.
                      </td>
                    </tr>
                  ) : (
                    cleaningToRender.map((r) => (
                      <tr key={r.id} className="border-t border-slate-100 text-slate-800">
                        <td className="px-3 py-2">{r.time ?? "—"}</td>
                        <td className="px-3 py-2">
                          <div className="font-semibold">{r.task ?? "—"}</div>
                          <div className="text-[11px] text-slate-500 truncate max-w-[18rem]">
                            {r.category}
                          </div>
                        </td>
                        <td className="px-3 py-2">{r.staff ?? "—"}</td>
                        <td className="px-3 py-2 max-w-[14rem] truncate">{r.notes ?? "—"}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <TableFooterToggle
              total={data.cleaningActivity.length}
              showingAll={showAllCleaning}
              onToggle={() => setShowAllCleaning((v) => !v)}
            />
          </div>
        </div>
      </section>

      <section className="mt-4 rounded-3xl border border-white/40 bg-white/80 p-4 shadow-md shadow-slate-900/5 backdrop-blur">
        <div className="mb-3">
          <div className="text-[11px] font-extrabold uppercase tracking-[0.22em] text-slate-400">
            Day sign-offs
          </div>
          <div className="mt-0.5 text-sm font-semibold text-slate-900">
            Daily sign-offs for selected day · Total: {data.signoffSummary.todayCount}
          </div>
        </div>

        <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white/90">
          <table className="min-w-full text-xs">
            <thead className="bg-slate-50">
              <tr className="text-left text-slate-500">
                <th className="px-3 py-2">Date</th>
                <th className="px-3 py-2">Time</th>
                <th className="px-3 py-2">Signed by</th>
                <th className="px-3 py-2">Notes / corrective actions</th>
              </tr>
            </thead>
            <tbody>
              {signoffsToRender.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-3 py-6 text-center text-slate-500">
                    No sign-offs logged for this day.
                  </td>
                </tr>
              ) : (
                signoffsToRender.map((r) => {
                  const t = r.created_at ? formatTimeHM(new Date(r.created_at)) : null;
                  return (
                    <tr key={r.id} className="border-t border-slate-100 text-slate-800">
                      <td className="px-3 py-2 whitespace-nowrap">{formatDDMMYYYY(r.signoff_on)}</td>
                      <td className="px-3 py-2 whitespace-nowrap">{t ?? "—"}</td>
                      <td className="px-3 py-2 font-semibold whitespace-nowrap">
                        {r.signed_by ? r.signed_by.toUpperCase() : "—"}
                      </td>
                      <td className="px-3 py-2 max-w-[28rem] truncate">{r.notes ?? "—"}</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <TableFooterToggle
          total={data.signoffsToday.length}
          showingAll={showAllSignoffs}
          onToggle={() => setShowAllSignoffs((v) => !v)}
        />
      </section>

      <section className="mt-4 rounded-3xl border border-white/40 bg-white/80 p-4 shadow-md shadow-slate-900/5 backdrop-blur">
        <div className="mb-3">
          <div className="text-[11px] font-extrabold uppercase tracking-[0.22em] text-slate-400">
            Staff absences
          </div>
          <div className="mt-0.5 text-sm font-semibold text-slate-900">
            Recent absence history (last 90 days)
          </div>
        </div>

        <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white/90">
          <table className="min-w-full text-xs">
            <thead className="bg-slate-50">
              <tr className="text-left text-slate-500">
                <th className="px-3 py-2">Staff</th>
                <th className="px-3 py-2">Type</th>
                <th className="px-3 py-2">Dates</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2">Impact</th>
                <th className="px-3 py-2">Notes</th>
              </tr>
            </thead>
            <tbody>
              {staffAbsencesToRender.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-3 py-6 text-center text-slate-500">
                    No staff absences logged.
                  </td>
                </tr>
              ) : (
                staffAbsencesToRender.map((r) => {
                  const isOffToday =
                    r.status === "approved" &&
                    r.start_date <= data.selectedDateISO &&
                    r.end_date >= data.selectedDateISO;

                  const statusPill =
                    r.status === "approved"
                      ? "bg-emerald-100 text-emerald-800"
                      : r.status === "pending"
                      ? "bg-amber-100 text-amber-800"
                      : r.status === "rejected"
                      ? "bg-red-100 text-red-800"
                      : "bg-slate-100 text-slate-800";

                  return (
                    <tr key={r.id} className="border-t border-slate-100 text-slate-800">
                      <td className="px-3 py-2 whitespace-nowrap font-semibold">
                        <div className="flex items-center gap-2">
                          <span>{tmLabel(r.staff ?? { initials: null, name: "—" })}</span>
                          {isOffToday ? (
                            <span className="inline-flex rounded-full bg-amber-100 px-2 py-[1px] text-[10px] font-extrabold uppercase text-amber-800">
                              Off today
                            </span>
                          ) : null}
                        </div>
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap">
                        {formatAbsenceType(r.absence_type)}
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap">
                        {formatAbsenceRange(r)}
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap">
                        <span
                          className={cls(
                            "inline-flex rounded-full px-2 py-[1px] text-[10px] font-extrabold uppercase",
                            statusPill
                          )}
                        >
                          {r.status}
                        </span>
                      </td>
                      <td className="px-3 py-2 max-w-[14rem] truncate">
                        {r.operational_impact ?? "—"}
                      </td>
                      <td className="px-3 py-2 max-w-[18rem] truncate">
                        {r.notes ?? "—"}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <TableFooterToggle
          total={data.staffAbsences.length}
          showingAll={showAllStaffAbsences}
          onToggle={() => setShowAllStaffAbsences((v) => !v)}
        />
      </section>

      <section className="mt-4 rounded-3xl border border-white/40 bg-white/80 p-4 shadow-md shadow-slate-900/5 backdrop-blur">
        <div className="min-w-0">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div>
              <div className="text-[11px] font-extrabold uppercase tracking-[0.22em] text-slate-400">
                Manager QC
              </div>
              <div className="mt-0.5 text-sm font-semibold text-slate-900">
                Recent QC reviews (selected location)
              </div>
            </div>

            <a
              href="/signup"
              className="shrink-0 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50"
            >
              Open QC
            </a>
          </div>
        </div>

        <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white/90">
          <table className="min-w-full text-xs">
            <thead className="bg-slate-50">
              <tr className="text-left text-slate-500">
                <th className="px-3 py-2">Date</th>
                <th className="px-3 py-2">Staff</th>
                <th className="px-3 py-2">Manager</th>
                <th className="px-3 py-2">Score</th>
                <th className="px-3 py-2">Notes</th>
              </tr>
            </thead>
            <tbody>
              {qcToRender.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-3 py-6 text-center text-slate-500">
                    No QC reviews logged.
                  </td>
                </tr>
              ) : (
                qcToRender.map((r: StaffQcReviewRow) => {
                  const pill =
                    r.rating >= 4
                      ? "bg-emerald-100 text-emerald-800"
                      : r.rating === 3
                      ? "bg-amber-100 text-amber-800"
                      : "bg-red-100 text-red-800";

                  return (
                    <tr key={r.id} className="border-t border-slate-100 text-slate-800">
                      <td className="px-3 py-2 whitespace-nowrap">
                        {formatDDMMYYYY(r.reviewed_on)}
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap">
                        {tmLabel(r.staff ?? { initials: null, name: "—" })}
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap">
                        {tmLabel(r.manager ?? { initials: null, name: "—" })}
                      </td>
                      <td className="px-3 py-2">
                        <span
                          className={cls(
                            "inline-flex rounded-full px-2 py-[1px] text-[10px] font-extrabold uppercase",
                            pill
                          )}
                        >
                          {r.rating}/5
                        </span>
                      </td>
                      <td className="px-3 py-2 max-w-[24rem] truncate">
                        {r.notes ?? "—"}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <TableFooterToggle
          total={data.qcReviews.length}
          showingAll={showAllQc}
          onToggle={() => setShowAllQc((v) => !v)}
        />
      </section>

      <section className="mt-4 rounded-3xl border border-white/40 bg-white/80 p-4 shadow-md shadow-slate-900/5 backdrop-blur">
        <div className="mb-3">
          <div className="text-[11px] font-extrabold uppercase tracking-[0.22em] text-slate-400">
            Education & training
          </div>
          <div className="mt-0.5 text-sm font-semibold text-slate-900">
            Training records + staff training areas (selected location)
          </div>
        </div>

        <div>
          <h3 className="mb-2 text-[11px] font-extrabold uppercase tracking-[0.22em] text-slate-500">
            Training records
          </h3>

          <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white/90">
            <table className="min-w-full text-xs">
              <thead className="bg-slate-50">
                <tr className="text-left text-slate-500">
                  <th className="px-3 py-2">Staff</th>
                  <th className="px-3 py-2">Type</th>
                  <th className="px-3 py-2">Awarded</th>
                  <th className="px-3 py-2">Expires</th>
                  <th className="px-3 py-2">Provider</th>
                  <th className="px-3 py-2">Course</th>
                  <th className="px-3 py-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {trainingToRender.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-3 py-4 text-center text-slate-500">
                      No training records found for this location.
                    </td>
                  </tr>
                ) : (
                  trainingToRender.map((r) => {
                    const exp = r.expires_on ? safeDate(r.expires_on) : null;
                    const base = safeDate(data.selectedDateISO) ?? new Date();
                    base.setHours(0, 0, 0, 0);

                    let statusLabel = "No expiry";
                    let pill = "bg-slate-100 text-slate-800";

                    if (exp) {
                      exp.setHours(0, 0, 0, 0);
                      const diffDays = Math.floor(
                        (exp.getTime() - base.getTime()) / 86400000
                      );

                      if (diffDays < 0) {
                        statusLabel = "Expired";
                        pill = "bg-red-100 text-red-800";
                      } else if (diffDays <= 30) {
                        statusLabel = `Due (${diffDays}d)`;
                        pill = "bg-amber-100 text-amber-800";
                      } else {
                        statusLabel = `Valid (${diffDays}d)`;
                        pill = "bg-emerald-100 text-emerald-800";
                      }
                    }

                    const staffLabel = r.team_member
                      ? tmLabel({
                          initials: r.team_member.initials,
                          name: r.team_member.name,
                        })
                      : "—";

                    return (
                      <tr key={r.id} className="border-t border-slate-100 text-slate-800">
                        <td className="px-3 py-2 whitespace-nowrap font-semibold">
                          {staffLabel}
                        </td>
                        <td className="px-3 py-2 max-w-[18rem] truncate">
                          {r.type ?? "—"}
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap">
                          {formatDDMMYYYY(r.awarded_on)}
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap">
                          {formatDDMMYYYY(r.expires_on)}
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap">
                          {r.provider_name ?? "—"}
                        </td>
                        <td className="px-3 py-2 max-w-[14rem] truncate">
                          {r.course_key ?? "—"}
                        </td>
                        <td className="px-3 py-2">
                          <span
                            className={cls(
                              "inline-flex rounded-full px-2 py-[1px] text-[10px] font-extrabold uppercase",
                              pill
                            )}
                          >
                            {statusLabel}
                          </span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          <TableFooterToggle
            total={data.trainingRows.length}
            showingAll={showAllTraining}
            onToggle={() => setShowAllTraining((v) => !v)}
          />
        </div>

        <div className="mt-6" />

        <div>
          <h3 className="mb-2 text-[11px] font-extrabold uppercase tracking-[0.22em] text-slate-500">
            Training areas
          </h3>

          <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white/90">
            <table className="min-w-full text-xs">
              <thead className="bg-slate-50">
                <tr className="text-left text-slate-500">
                  <th className="px-3 py-2">Staff</th>
                  <th className="px-3 py-2">Role</th>
                  <th className="px-3 py-2">Areas</th>
                </tr>
              </thead>
              <tbody>
                {trainingAreasToRender.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="px-3 py-4 text-center text-slate-500">
                      No team members found for this location.
                    </td>
                  </tr>
                ) : (
                  trainingAreasToRender.map((t) => {
                    const areas = Array.isArray(t.training_areas)
                      ? t.training_areas
                      : [];

                    return (
                      <tr key={t.id} className="border-t border-slate-100 text-slate-800">
                        <td className="px-3 py-2 whitespace-nowrap font-semibold">
                          {tmLabel({
                            initials: t.initials ?? null,
                            name: t.name ?? null,
                          })}
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap">{t.role ?? "—"}</td>
                        <td className="px-3 py-2">
                          {areas.length === 0 ? (
                            <span className="text-slate-500">—</span>
                          ) : (
                            <div className="flex flex-wrap gap-1.5">
                              {areas.map((a: any, idx: number) => (
                                <span
                                  key={`${t.id}_${idx}`}
                                  className="inline-flex items-center rounded-full border border-emerald-200 bg-emerald-50 px-2 py-[2px] text-[10px] font-extrabold uppercase tracking-wide text-emerald-800"
                                >
                                  {String(a).replace(/_/g, " ")}
                                </span>
                              ))}
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          <TableFooterToggle
            total={data.trainingAreasRows.length}
            showingAll={showAllTrainingAreas}
            onToggle={() => setShowAllTrainingAreas((v) => !v)}
          />
        </div>
      </section>

      <section className="mt-4 rounded-3xl border border-white/40 bg-white/80 p-4 shadow-md shadow-slate-900/5 backdrop-blur">
        <div className="mb-3">
          <div className="text-[11px] font-extrabold uppercase tracking-[0.22em] text-slate-400">
            Allergens
          </div>
          <div className="mt-0.5 text-sm font-semibold text-slate-900">
            Allergen review history (org)
          </div>
        </div>

        <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white/90">
          <table className="min-w-full text-xs">
            <thead className="bg-slate-50">
              <tr className="text-left text-slate-500">
                <th className="px-3 py-2">Reviewed</th>
                <th className="px-3 py-2">Reviewer</th>
                <th className="px-3 py-2">Interval</th>
                <th className="px-3 py-2">Next due</th>
                <th className="px-3 py-2">Days until</th>
              </tr>
            </thead>
            <tbody>
              {allergenReviewsToRender.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-3 py-4 text-center text-slate-500">
                    No allergen reviews logged.
                  </td>
                </tr>
              ) : (
                allergenReviewsToRender.map((r) => {
                  const reviewed = r.last_reviewed ?? null;
                  const interval = r.interval_days ?? 180;

                  let nextDue: string | null = null;
                  let daysUntil: string = "—";

                  if (reviewed && interval && Number.isFinite(interval)) {
                    const d = new Date(reviewed);
                    if (!Number.isNaN(d.getTime())) {
                      d.setDate(d.getDate() + interval);
                      nextDue = d.toISOString().slice(0, 10);

                      const base = new Date(data.selectedDateISO);
                      base.setHours(0, 0, 0, 0);
                      const due = new Date(nextDue);
                      due.setHours(0, 0, 0, 0);

                      const diffDays = Math.floor(
                        (due.getTime() - base.getTime()) / 86400000
                      );
                      daysUntil = `${diffDays}`;
                    }
                  }

                  const pill =
                    daysUntil === "—"
                      ? "bg-slate-100 text-slate-800"
                      : Number(daysUntil) < 0
                      ? "bg-red-100 text-red-800"
                      : Number(daysUntil) <= 30
                      ? "bg-amber-100 text-amber-800"
                      : "bg-emerald-100 text-emerald-800";

                  return (
                    <tr key={r.id} className="border-t border-slate-100 text-slate-800">
                      <td className="px-3 py-2 whitespace-nowrap">
                        {formatDDMMYYYY(reviewed)}
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap">{r.reviewer ?? "—"}</td>
                      <td className="px-3 py-2 whitespace-nowrap">
                        {interval ? `${interval} days` : "—"}
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap">
                        {formatDDMMYYYY(nextDue)}
                      </td>
                      <td className="px-3 py-2">
                        <span
                          className={cls(
                            "inline-flex rounded-full px-2 py-[1px] text-[10px] font-extrabold uppercase",
                            pill
                          )}
                        >
                          {daysUntil === "—" ? "—" : `${daysUntil}d`}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <TableFooterToggle
          total={data.allergenReviews.length}
          showingAll={showAllAllergenReviews}
          onToggle={() => setShowAllAllergenReviews((v) => !v)}
        />
      </section>

      <section className="mt-4 mb-6 rounded-3xl border border-white/40 bg-white/80 p-4 shadow-md shadow-slate-900/5 backdrop-blur">
        <div className="mb-3">
          <div className="text-[11px] font-extrabold uppercase tracking-[0.22em] text-slate-400">
            Allergens
          </div>
          <div className="mt-0.5 text-sm font-semibold text-slate-900">
            Allergen edit log (this location)
          </div>
        </div>

        <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white/90">
          <table className="min-w-full text-xs">
            <thead className="bg-slate-50">
              <tr className="text-left text-slate-500">
                <th className="px-3 py-2">Date</th>
                <th className="px-3 py-2">Time</th>
                <th className="px-3 py-2">Item</th>
                <th className="px-3 py-2">Action</th>
                <th className="px-3 py-2">Category change</th>
                <th className="px-3 py-2">By</th>
              </tr>
            </thead>
            <tbody>
              {allergenLogsToRender.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-3 py-4 text-center text-slate-500">
                    No allergen edits logged.
                  </td>
                </tr>
              ) : (
                allergenLogsToRender.map((r) => (
                  <tr key={r.id} className="border-t border-slate-100 text-slate-800">
                    <td className="px-3 py-2 whitespace-nowrap">
                      {formatDDMMYYYY(r.created_at)}
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap">
                      {formatTimeHM(safeDate(r.created_at)) ?? "—"}
                    </td>
                    <td className="px-3 py-2 max-w-[14rem] truncate">
                      {r.item_name ?? "—"}
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap">{r.action ?? "—"}</td>
                    <td className="px-3 py-2 max-w-[16rem] truncate">
                      {(r.category_before ?? "—") + " → " + (r.category_after ?? "—")}
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap">
                      {r.staff_initials?.toUpperCase() ?? "—"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <TableFooterToggle
          total={data.allergenLogs.length}
          showingAll={showAllAllergenLogs}
          onToggle={() => setShowAllAllergenLogs((v) => !v)}
        />
      </section>

      <section className="mt-4 rounded-3xl border border-white/40 bg-white/80 p-4 shadow-md shadow-slate-900/5 backdrop-blur">
        <div className="min-w-0">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div>
              <div className="text-[11px] font-extrabold uppercase tracking-[0.22em] text-slate-400">
                Calibration
              </div>
              <div className="mt-0.5 text-sm font-semibold text-slate-900">
                Calibration log (this location)
              </div>
            </div>
          </div>

          <a
            href="/signup"
            className="shrink-0 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50"
          >
            Log calibration
          </a>
        </div>

        <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white/90 mt-3">
          <table className="min-w-full text-xs">
            <thead className="bg-slate-50">
              <tr className="text-left text-slate-500">
                <th className="px-3 py-2">Date</th>
                <th className="px-3 py-2">By</th>
                <th className="px-3 py-2">Completed</th>
                <th className="px-3 py-2">Notes</th>
              </tr>
            </thead>
            <tbody>
              {calibrationToRender.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-3 py-6 text-center text-slate-500">
                    No calibration checks logged.
                  </td>
                </tr>
              ) : (
                calibrationToRender.map((r) => (
                  <tr key={r.id} className="border-t border-slate-100 text-slate-800">
                    <td className="px-3 py-2 whitespace-nowrap">
                      {formatDDMMYYYY(r.checked_on)}
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap">
                      {r.staff_initials?.toUpperCase() ?? "—"}
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap">
                      {r.all_equipment_calibrated ? (
                        <span className="inline-flex rounded-full bg-emerald-100 px-2 py-[1px] text-[10px] font-extrabold uppercase text-emerald-800">
                          ✓ Complete
                        </span>
                      ) : (
                        <span className="inline-flex rounded-full bg-amber-100 px-2 py-[1px] text-[10px] font-extrabold uppercase text-amber-800">
                          Not complete
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-2 max-w-[24rem] truncate">{r.notes ?? "—"}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <TableFooterToggle
          total={data.calibrationChecks.length}
          showingAll={showAllCalibration}
          onToggle={() => setShowAllCalibration((v) => !v)}
        />
      </section>
    </div>
  );
}
"use client";

import React from "react";
import Image from "next/image";
import { cn } from "@/lib/cn"; // tiny classnames helper; if you don’t have it, replace cn(a,b) with [a,b].filter(Boolean).join(" ")
import {
  listTempLogs,
  upsertTempLog,
  deleteTempLog,
  listStaffInitials,
  listTargets,
  type TempLogRow,
  type TempLogInput,
} from "@/app/actions/db";
import { useSettings } from "@/components/SettingsProvider";
import NavTabs from "@/components/NavTabs";

/* ----------------------------- helpers/types ----------------------------- */

type Target = { id: string; name: string; min: number; max: number };

function formatDate(d: Date) {
  return d.toISOString().slice(0, 10);
}
function toC(unit: "C" | "F", value: number) {
  return unit === "C" ? value : (value - 32) * (5 / 9);
}
function badge(pass: boolean) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold",
        pass ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
      )}
    >
      {pass ? "Pass" : "Fail"}
    </span>
  );
}
function dayKey(isoDateTime: string) {
  return isoDateTime.slice(0, 10);
}

/* ------------------------------ main component ------------------------------ */

export default function FoodTempLogger() {
  const { brandName, brandAccent, logoUrl, unit } = useSettings(); // unit: "C" | "F"

  /* data */
  const [logs, setLogs] = React.useState<TempLogRow[]>([]);
  const [staffOptions, setStaffOptions] = React.useState<string[]>([]);
  const [targets, setTargets] = React.useState<Target[]>([]);

  /* UI state */
  const [quickOpen, setQuickOpen] = React.useState<boolean>(false);
  const [search, setSearch] = React.useState<string>("");
  const [rangeDays, setRangeDays] = React.useState<number>(30);

  /* quick-entry form */
  const [qStaff, setQStaff] = React.useState<string>("");
  const [qLocation, setQLocation] = React.useState<string>("");
  const [qItem, setQItem] = React.useState<string>("");
  const [qTarget, setQTarget] = React.useState<string>("");
  const [qTemp, setQTemp] = React.useState<string>("");

  /* fetch */
  React.useEffect(() => {
    const to = new Date();
    const from = new Date();
    from.setDate(to.getDate() - rangeDays + 1);

    (async () => {
      const [rows, staff, tgs] = await Promise.all([
        listTempLogs({ from: formatDate(from), to: formatDate(to) }),
        listStaffInitials(),
        listTargets(),
      ]);
      setLogs(rows);
      setStaffOptions(staff);
      setTargets(tgs);
      if (!qTarget && tgs.length) setQTarget(tgs[0].id);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rangeDays]);

  /* computed KPI */
  const kpis = React.useMemo(() => {
    if (!logs.length) {
      return {
        topLogger: "-",
        needsAttention: 0,
        missedDays: 0,
      };
    }

    // top logger by count
    const counts: Record<string, number> = {};
    logs.forEach((l) => {
      counts[l.staff] = (counts[l.staff] ?? 0) + 1;
    });
    const topLogger = Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "-";

    // needs attention = failed entries
    const needsAttention = logs.filter((l) => !l.pass).length;

    // missed days = in period, days with zero logs
    const seen = new Set(logs.map((l) => dayKey(l.created_at)));
    const today = new Date();
    const start = new Date();
    start.setDate(today.getDate() - rangeDays + 1);

    let missed = 0;
    for (let d = new Date(start); d <= today; d.setDate(d.getDate() + 1)) {
      const k = formatDate(d);
      if (!seen.has(k)) missed++;
    }

    return { topLogger, needsAttention, missedDays: missed };
  }, [logs, rangeDays]);

  /* create entry */
  async function submitQuick(e: React.FormEvent) {
    e.preventDefault();
    if (!qStaff || !qItem || !qTarget || !qTemp) return;

    const target = targets.find((t) => t.id === qTarget);
    const tempC = toC(unit, parseFloat(qTemp));

    const pass =
      target ? tempC >= target.min && tempC <= target.max : !Number.isNaN(tempC);

    const payload: TempLogInput = {
      staff: qStaff,
      location: qLocation.trim(),
      item: qItem.trim(),
      target: target ? target.name : "Unspecified",
      temp_c: Number(tempC.toFixed(1)),
      notes: null,
    };

    const { id } = await upsertTempLog(payload);
    const created: TempLogRow = {
      id,
      created_at: new Date().toISOString(),
      pass,
      ...payload,
    };
    setLogs((prev) => [created, ...prev]);

    // reset lightweight
    setQItem("");
    setQTemp("");
  }

  async function handleDelete(id: string) {
    await deleteTempLog(id);
    setLogs((prev) => prev.filter((l) => l.id !== id));
  }

  /* filter for table */
  const filtered = React.useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return logs;
    return logs.filter(
      (l) =>
        l.item.toLowerCase().includes(q) ||
        l.location.toLowerCase().includes(q) ||
        l.staff.toLowerCase().includes(q) ||
        l.target.toLowerCase().includes(q)
    );
  }, [logs, search]);

  /* data for bar chart (entries per day) */
  const chart = React.useMemo(() => {
    const counts = new Map<string, number>();
    logs.forEach((l) => {
      const k = dayKey(l.created_at);
      counts.set(k, (counts.get(k) ?? 0) + 1);
    });

    const days: { day: string; count: number }[] = [];
    const today = new Date();
    const start = new Date();
    start.setDate(today.getDate() - rangeDays + 1);

    for (let d = new Date(start); d <= today; d.setDate(d.getDate() + 1)) {
      const k = formatDate(d);
      days.push({ day: k.slice(5), count: counts.get(k) ?? 0 }); // MM-DD
    }
    const max = Math.max(1, ...days.map((d) => d.count));
    return { days, max };
  }, [logs, rangeDays]);

  return (
    <div className="min-h-screen w-full bg-gray-50">
      <NavTabs brandName={brandName} brandAccent={brandAccent} logoUrl={logoUrl} />

      <main className="mx-auto max-w-6xl p-4 space-y-6">
        {/* KPI row */}
        <section className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <KpiCard label="Top logger" value={kpis.topLogger} />
          <KpiCard
            label="Needs attention"
            value={String(kpis.needsAttention)}
            tone={kpis.needsAttention ? "danger" : "ok"}
          />
          <KpiCard
            label="Missed days"
            value={String(kpis.missedDays)}
            tone={kpis.missedDays ? "warn" : "ok"}
            right={
              <RangePicker value={rangeDays} onChange={(d) => setRangeDays(d)} />
            }
          />
        </section>

        {/* Actions: quick entry + full entry */}
        <section className="flex items-center justify-between">
          <button
            className="inline-flex items-center gap-2 text-sm font-medium text-gray-700 hover:text-gray-900"
            onClick={() => setQuickOpen((v) => !v)}
            aria-expanded={quickOpen}
          >
            <Chevron open={quickOpen} />
            Quick entry
          </button>

          <a
            href="/full-entry"
            className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-semibold shadow hover:bg-gray-50"
          >
            Full entry form
          </a>
        </section>

        {/* Quick Entry Drawer */}
        {quickOpen && (
          <form
            onSubmit={submitQuick}
            className="rounded-xl border bg-white p-4 shadow-sm"
          >
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-6">
              <div className="sm:col-span-1">
                <label className="block text-xs font-semibold text-gray-600">
                  Staff
                </label>
                <select
                  value={qStaff}
                  onChange={(e) => setQStaff(e.target.value)}
                  className="mt-1 w-full rounded-md border px-2 py-1 text-sm"
                  required
                >
                  <option value="">Select</option>
                  {staffOptions.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>

              <div className="sm:col-span-1">
                <label className="block text-xs font-semibold text-gray-600">
                  Location
                </label>
                <input
                  value={qLocation}
                  onChange={(e) => setQLocation(e.target.value)}
                  className="mt-1 w-full rounded-md border px-2 py-1 text-sm"
                  placeholder="Fridge 1"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-gray-600">
                  Item
                </label>
                <input
                  value={qItem}
                  onChange={(e) => setQItem(e.target.value)}
                  className="mt-1 w-full rounded-md border px-2 py-1 text-sm"
                  placeholder="Chicken curry"
                  required
                />
              </div>

              <div className="sm:col-span-1">
                <label className="block text-xs font-semibold text-gray-600">
                  Target
                </label>
                <select
                  value={qTarget}
                  onChange={(e) => setQTarget(e.target.value)}
                  className="mt-1 w-full rounded-md border px-2 py-1 text-sm"
                >
                  {targets.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name} ({t.min}–{t.max}°C)
                    </option>
                  ))}
                </select>
              </div>

              <div className="sm:col-span-1">
                <label className="block text-xs font-semibold text-gray-600">
                  Temperature (°{unit})
                </label>
                <input
                  inputMode="decimal"
                  value={qTemp}
                  onChange={(e) => setQTemp(e.target.value)}
                  className="mt-1 w-full rounded-md border px-2 py-1 text-sm"
                  placeholder={`e.g. ${unit === "C" ? "5.0" : "41.0"}`}
                  required
                />
              </div>
            </div>

            <div className="mt-3 flex justify-end">
              <button
                type="submit"
                className="rounded-md bg-black px-4 py-2 text-sm font-semibold text-white hover:opacity-90"
              >
                Save quick entry
              </button>
            </div>
          </form>
        )}

        {/* Table controls */}
        <section className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-gray-800">Entries</h2>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search entries…"
            className="w-56 rounded-md border px-3 py-1.5 text-sm"
          />
        </section>

        {/* Entries table */}
        <div className="overflow-x-auto rounded-xl border bg-white shadow-sm">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 text-xs uppercase text-gray-600">
              <tr>
                <Th>Date</Th>
                <Th>Staff</Th>
                <Th>Location</Th>
                <Th>Item</Th>
                <Th>Target</Th>
                <Th className="text-right">Temp (°C)</Th>
                <Th>Status</Th>
                <Th className="text-right">Actions</Th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={8} className="p-6 text-center text-gray-500">
                    No entries
                  </td>
                </tr>
              )}
              {filtered.map((l) => (
                <tr key={l.id} className="border-t">
                  <Td>{new Date(l.created_at).toLocaleString()}</Td>
                  <Td>{l.staff}</Td>
                  <Td>{l.location}</Td>
                  <Td>{l.item}</Td>
                  <Td>{l.target}</Td>
                  <Td className="text-right">{l.temp_c.toFixed(1)}</Td>
                  <Td>{badge(l.pass)}</Td>
                  <Td className="text-right">
                    <button
                      onClick={() => handleDelete(l.id)}
                      className="rounded-md border px-2 py-1 text-xs hover:bg-gray-50"
                      aria-label="Delete entry"
                    >
                      Delete
                    </button>
                  </Td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Chart at bottom */}
        <section className="rounded-xl border bg-white p-4 shadow-sm">
          <h3 className="mb-3 text-sm font-semibold text-gray-800">
            Entries per day (last {rangeDays} days)
          </h3>
          <BarChart data={chart.days} max={chart.max} />
        </section>
      </main>
    </div>
  );
}

/* -------------------------------- subcomponents -------------------------------- */

function KpiCard({
  label,
  value,
  tone = "neutral",
  right,
}: {
  label: string;
  value: string;
  tone?: "neutral" | "ok" | "warn" | "danger";
  right?: React.ReactNode;
}) {
  const ring =
    tone === "ok"
      ? "ring-green-200"
      : tone === "warn"
      ? "ring-amber-200"
      : tone === "danger"
      ? "ring-red-200"
      : "ring-gray-200";

  return (
    <div className={cn("flex items-center justify-between rounded-xl bg-white px-4 py-3 shadow-sm ring-1", ring)}>
      <div>
        <div className="text-xs text-gray-500">{label}</div>
        <div className="text-2xl font-semibold text-gray-900">{value}</div>
      </div>
      {right}
    </div>
  );
}

function RangePicker({
  value,
  onChange,
}: {
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(Number(e.target.value))}
      className="rounded-md border px-2 py-1 text-xs"
      aria-label="Range"
      title="Range"
    >
      {[7, 14, 30, 60, 90].map((d) => (
        <option key={d} value={d}>
          {d}d
        </option>
      ))}
    </select>
  );
}

function Th({
  children,
  className,
}: React.PropsWithChildren<{ className?: string }>) {
  return <th className={cn("px-3 py-2 text-left", className)}>{children}</th>;
}
function Td({
  children,
  className,
}: React.PropsWithChildren<{ className?: string }>) {
  return <td className={cn("px-3 py-2", className)}>{children}</td>;
}

function Chevron({ open }: { open: boolean }) {
  return (
    <svg
      className={cn("h-4 w-4 transition-transform", open ? "rotate-90" : "")}
      viewBox="0 0 20 20"
      fill="currentColor"
      aria-hidden="true"
    >
      <path
        fillRule="evenodd"
        d="M6.293 4.293a1 1 0 011.414 0l5 5a1 1 0 010 1.414l-5 5a1 1 0 01-1.414-1.414L10.586 10 6.293 5.707a1 1 0 010-1.414z"
        clipRule="evenodd"
      />
    </svg>
  );
}

/* tiny inline bar chart (no external libs) */
function BarChart({
  data,
  max,
}: {
  data: Array<{ day: string; count: number }>;
  max: number;
}) {
  const W = Math.max(320, data.length * 16);
  const H = 140;
  const pad = 20;
  const bw = Math.max(4, (W - pad * 2) / data.length - 4);

  return (
    <div className="overflow-x-auto">
      <svg width={W} height={H} role="img" aria-label="Entries per day">
        {/* axis */}
        <line x1={pad} y1={H - pad} x2={W - pad} y2={H - pad} stroke="#e5e7eb" />
        <line x1={pad} y1={pad} x2={pad} y2={H - pad} stroke="#e5e7eb" />

        {data.map((d, i) => {
          const x = pad + i * (bw + 4) + 2;
          const h = Math.round(((H - pad * 2) * d.count) / max);
          const y = H - pad - h;
          return (
            <g key={d.day}>
              <rect
                x={x}
                y={y}
                width={bw}
                height={h}
                rx={3}
                className="fill-gray-900/80"
              />
              {i % Math.ceil(data.length / 10 || 1) === 0 && (
                <text
                  x={x + bw / 2}
                  y={H - 5}
                  fontSize="9"
                  textAnchor="middle"
                  fill="#6b7280"
                >
                  {d.day}
                </text>
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
}
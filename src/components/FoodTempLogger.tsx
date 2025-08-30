// src/components/FoodTempLogger.tsx
"use client";

import React from "react";
import Image from "next/image";
import NavTabs from "@/components/NavTabs";
import { useSettings } from "@/components/SettingsProvider";

import {
  listTempLogs,
  upsertTempLog,
  deleteTempLog,
  listStaffInitials,
  listTargets,
  type TempLogRow,
  type TempLogInput,
} from "@/app/actions/db";

/* ------------------------------ small helpers ------------------------------ */
const fmtDate = (d: Date | string) =>
  (typeof d === "string" ? d : d.toISOString()).slice(0, 10);

function passForTarget(target: string | null, temp: number | null, unit: "C" | "F"): boolean | null {
  if (temp == null) return null;
  const t = (target ?? "").toLowerCase();
  const c = unit === "F" ? (temp - 32) * (5 / 9) : temp;
  if (t.includes("fridge")) return c <= 5;
  if (t.includes("freezer")) return c <= -18;
  if (t.includes("cook")) return c >= 75;
  if (t.includes("hot")) return c >= 63;
  return null;
}

/* ---------------------------------- UI bits -------------------------------- */
function Card({
  title,
  value,
  sub,
}: {
  title: string;
  value: React.ReactNode;
  sub?: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border bg-white p-4 shadow-sm">
      <div className="text-xs uppercase tracking-wide text-gray-500">{title}</div>
      <div className="mt-2 text-2xl font-semibold">{value}</div>
      {sub ? <div className="mt-1 text-xs text-gray-500">{sub}</div> : null}
    </div>
  );
}

function Table({ children }: { children: React.ReactNode }) {
  return (
    <div className="overflow-x-auto rounded-lg border bg-white">
      <table className="min-w-[800px] w-full text-sm">{children}</table>
    </div>
  );
}

function Th({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <th className={`bg-gray-50 px-3 py-2 text-left text-xs font-semibold text-gray-600 ${className ?? ""}`}>
      {children}
    </th>
  );
}

function Td({
  children,
  className,
  colSpan,
  title,
}: {
  children: React.ReactNode;
  className?: string;
  colSpan?: number;
  title?: string;
}) {
  return (
    <td className={`px-3 py-2 align-top ${className ?? ""}`} colSpan={colSpan} title={title}>
      {children}
    </td>
  );
}

/* ------------------------------ main component ------------------------------ */
export default function FoodTempLogger() {
  const { unit } = useSettings(); // "C" | "F"

  /* data */
  const [logs, setLogs] = React.useState<TempLogRow[]>([]);
  const [loading, setLoading] = React.useState(false);

  /* filters */
  const [from, setFrom] = React.useState<string>(fmtDate(new Date(Date.now() - 29 * 86400000)));
  const [to, setTo] = React.useState<string>(fmtDate(new Date()));
  const [query, setQuery] = React.useState("");
  const [category, setCategory] = React.useState("All");

  /* quick entry panel */
  const [openQuick, setOpenQuick] = React.useState(false);
  const [targets, setTargets] = React.useState<string[]>([]);
  const [staffInitials, setStaffInitials] = React.useState<string[]>([]);
  const [qForm, setQForm] = React.useState<TempLogInput>({
    recorded_at: fmtDate(new Date()),
    target: "",
    location: "",
    staff_initials: "",
    item: "",
    unit,
    temperature: null,
    pass: null,
    notes: "",
  });

  /* derived KPIs */
  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    const inRange = logs.filter(
      (r) =>
        (!from || r.recorded_at >= from) &&
        (!to || r.recorded_at <= to)
    );
    const withCat =
      category === "All"
        ? inRange
        : inRange.filter((r) => (r.target ?? "").toLowerCase().includes(category.toLowerCase()));
    if (!q) return withCat;
    return withCat.filter((r) =>
      [r.item, r.location, r.target, r.staff_initials, r.notes]
        .filter(Boolean)
        .some((v) => (v as string).toLowerCase().includes(q))
    );
  }, [logs, from, to, query, category]);

  const topLogger = React.useMemo(() => {
    const counts = new Map<string, number>();
    for (const r of filtered) counts.set(r.staff_initials ?? "—", (counts.get(r.staff_initials ?? "—") ?? 0) + 1);
    let best = "—";
    let bestN = 0;
    counts.forEach((n, k) => {
      if (n > bestN) {
        best = k;
        bestN = n;
      }
    });
    return { name: best, count: bestN };
  }, [filtered]);

  const needsAttention = React.useMemo(
    () => filtered.filter((r) => r.pass === false).length,
    [filtered]
  );

  const daysMissed = React.useMemo(() => {
    const start = new Date(from + "T00:00:00");
    const end = new Date(to + "T00:00:00");
    const have = new Set<string>();
    for (const r of filtered) have.add(r.recorded_at);
    let d = 0;
    for (let t = start.getTime(); t <= end.getTime(); t += 86400000) {
      const k = fmtDate(new Date(t));
      if (!have.has(k)) d++;
    }
    return d;
  }, [filtered, from, to]);

  /* load data + lookups */
  React.useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const [rows, initials, availableTargets] = await Promise.all([
          listTempLogs({ from, to }),
          listStaffInitials(),
          listTargets(),
        ]);
        setLogs(rows);
        setStaffInitials(initials);
        setTargets(availableTargets);
      } finally {
        setLoading(false);
      }
    })();
  }, [from, to]);

  /* quick form: recompute pass automatically */
  React.useEffect(() => {
    const computed = passForTarget(qForm.target ?? null, qForm.temperature ?? null, unit);
    setQForm((f) => ({ ...f, unit, pass: computed }));
  }, [qForm.target, qForm.temperature, unit]);

  async function submitQuick(e: React.FormEvent) {
    e.preventDefault();
    const saved = await upsertTempLog(qForm);
    setLogs((prev) => [saved, ...prev]);
    setQForm({
      recorded_at: fmtDate(new Date()),
      target: qForm.target ?? "",
      location: "",
      staff_initials: qForm.staff_initials ?? "",
      item: "",
      unit,
      temperature: null,
      pass: null,
      notes: "",
    });
    setOpenQuick(false);
  }

  async function remove(id: string) {
    await deleteTempLog(id);
    setLogs((prev) => prev.filter((r) => r.id !== id));
  }

  /* categories for the filter (derived from targets) */
  const categories = React.useMemo<string[]>(
    () => ["All", ...new Set((logs.map((r) => r.target ?? "").filter(Boolean)))],
    [logs]
  );

  /* entries/day (filtered) for chart */
  const entriesPerDay = React.useMemo(() => {
    const counts = new Map<string, number>();
    for (const r of filtered) counts.set(r.recorded_at, (counts.get(r.recorded_at) ?? 0) + 1);
    return [...counts.entries()]
      .sort((a, b) => (a[0] < b[0] ? -1 : 1))
      .map(([day, n]) => ({ day, n }));
  }, [filtered]);

  /* --------------------------------- render --------------------------------- */
  return (
    <div className="min-h-screen w-full bg-gray-50">
      <NavTabs />

      <main className="mx-auto max-w-6xl p-4 space-y-6">
        {/* Top actions row: Quick entry + Full entry */}
        <div className="flex items-center gap-2">
          <details
            className="group rounded-md border bg-white"
            open={openQuick}
            onToggle={(e) => setOpenQuick((e.target as HTMLDetailsElement).open)}
          >
            <summary className="flex cursor-pointer select-none items-center gap-2 px-3 py-2 text-sm font-medium">
              <span className="inline-flex h-5 w-5 items-center justify-center rounded border">
                {/* little arrow on the left */}
                <span className="group-open:hidden">▸</span>
                <span className="hidden group-open:inline">▾</span>
              </span>
              Quick entry
            </summary>

            <form onSubmit={submitQuick} className="grid grid-cols-1 gap-3 border-t p-3 sm:grid-cols-2 lg:grid-cols-3">
              <div>
                <label className="block text-sm mb-1">Recorded date</label>
                <input
                  type="date"
                  value={qForm.recorded_at}
                  onChange={(e) => setQForm({ ...qForm, recorded_at: e.target.value })}
                  className="w-full rounded border px-2 py-1"
                  required
                />
              </div>

              <div>
                <label className="block text-sm mb-1">Initials</label>
                <input
                  list="initials"
                  value={qForm.staff_initials ?? ""}
                  onChange={(e) => setQForm({ ...qForm, staff_initials: e.target.value })}
                  className="w-full rounded border px-2 py-1"
                  placeholder="e.g. WS"
                  required
                />
                <datalist id="initials">
                  {staffInitials.map((s) => (
                    <option key={s} value={s} />
                  ))}
                </datalist>
              </div>

              <div>
                <label className="block text-sm mb-1">Target</label>
                <input
                  list="targets"
                  value={qForm.target ?? ""}
                  onChange={(e) => setQForm({ ...qForm, target: e.target.value })}
                  className="w-full rounded border px-2 py-1"
                  placeholder="Fridge / Freezer / Cook / Hot hold"
                />
                <datalist id="targets">
                  {targets.map((t) => (
                    <option key={t} value={t} />
                  ))}
                </datalist>
              </div>

              <div>
                <label className="block text-sm mb-1">Item</label>
                <input
                  value={qForm.item ?? ""}
                  onChange={(e) => setQForm({ ...qForm, item: e.target.value })}
                  className="w-full rounded border px-2 py-1"
                  placeholder="Optional item/food"
                />
              </div>

              <div>
                <label className="block text-sm mb-1">Location</label>
                <input
                  value={qForm.location ?? ""}
                  onChange={(e) => setQForm({ ...qForm, location: e.target.value })}
                  className="w-full rounded border px-2 py-1"
                  placeholder="Kitchen / Service etc."
                />
              </div>

              <div>
                <label className="block text-sm mb-1">
                  Temperature ({unit === "F" ? "°F" : "°C"})
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={qForm.temperature ?? ""}
                  onChange={(e) =>
                    setQForm({ ...qForm, temperature: e.target.value === "" ? null : Number(e.target.value) })
                  }
                  className="w-full rounded border px-2 py-1"
                  required
                />
              </div>

              <div className="sm:col-span-2 lg:col-span-3">
                <label className="block text-sm mb-1">Notes</label>
                <input
                  value={qForm.notes ?? ""}
                  onChange={(e) => setQForm({ ...qForm, notes: e.target.value })}
                  className="w-full rounded border px-2 py-1"
                  placeholder="Optional notes"
                />
              </div>

              <div className="sm:col-span-2 lg:col-span-3 flex items-center justify-between">
                <div className="text-sm">
                  Auto-status:&nbsp;
                  {qForm.pass == null ? (
                    <span className="text-gray-500">—</span>
                  ) : qForm.pass ? (
                    <span className="rounded bg-green-100 px-2 py-0.5 text-green-700">PASS</span>
                  ) : (
                    <span className="rounded bg-red-100 px-2 py-0.5 text-red-700">FAIL</span>
                  )}
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setOpenQuick(false)}
                    className="rounded border px-3 py-1 text-sm"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="rounded bg-black px-3 py-1 text-sm text-white"
                  >
                    Save entry
                  </button>
                </div>
              </div>
            </form>
          </details>

          {/* Full entry button (link to your full form route if you have one) */}
          <a
            href="#full-entry"
            className="rounded-md bg-black px-3 py-2 text-sm font-medium text-white"
          >
            Full entry
          </a>
        </div>

        {/* KPI cards */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <Card title="Top logger" value={`${topLogger.name}`} sub={`${topLogger.count} in current range`} />
          <Card title="Needs attention" value={needsAttention} sub="failed checks" />
          <Card title="Days missed" value={daysMissed} sub="no entries on those days" />
        </div>

        {/* Filters */}
        <div className="grid grid-cols-1 items-end gap-3 rounded-lg border bg-white p-3 sm:grid-cols-[1fr,1fr,1fr,2fr]">
          <div>
            <label className="block text-sm mb-1">From</label>
            <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="w-full rounded border px-2 py-1" />
          </div>
          <div>
            <label className="block text-sm mb-1">To</label>
            <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="w-full rounded border px-2 py-1" />
          </div>
          <div>
            <label className="block text-sm mb-1">Category</label>
            <select value={category} onChange={(e) => setCategory(e.target.value)} className="w-full rounded border px-2 py-1">
              {categories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm mb-1">Search</label>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full rounded border px-2 py-1"
              placeholder="item / location / initials"
            />
          </div>
        </div>

        {/* Table */}
        <section>
          <div className="mb-2 text-sm font-medium">Entries</div>
          <Table>
            <thead>
              <tr>
                <Th>Date</Th>
                <Th>Initials</Th>
                <Th>Target</Th>
                <Th>Item</Th>
                <Th>Location</Th>
                <Th className="text-right">Temp ({unit === "F" ? "°F" : "°C"})</Th>
                <Th>Status</Th>
                <Th>Notes</Th>
                <Th className="text-right">Actions</Th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <Td colSpan={9}>Loading…</Td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <Td colSpan={9}>No entries in this view.</Td>
                </tr>
              ) : (
                filtered.map((r) => (
                  <tr key={r.id} className="border-t">
                    <Td>{r.recorded_at}</Td>
                    <Td>{r.staff_initials ?? "—"}</Td>
                    <Td>{r.target ?? "—"}</Td>
                    <Td>{r.item ?? "—"}</Td>
                    <Td>{r.location ?? "—"}</Td>
                    <Td className="text-right">{r.temperature ?? "—"}</Td>
                    <Td>
                      {r.pass == null ? (
                        <span className="rounded border px-2 py-0.5 text-xs text-gray-600">—</span>
                      ) : r.pass ? (
                        <span className="rounded bg-green-100 px-2 py-0.5 text-xs text-green-700">PASS</span>
                      ) : (
                        <span className="rounded bg-red-100 px-2 py-0.5 text-xs text-red-700">FAIL</span>
                      )}
                    </Td>
                    <Td className="max-w-[240px] truncate" title={r.notes ?? ""}>
                      {r.notes ?? "—"}
                    </Td>
                    <Td className="text-right">
                      <button
                        onClick={() => remove(r.id)}
                        className="rounded border px-2 py-1 text-xs hover:bg-gray-50"
                        title="Delete"
                      >
                        Delete
                      </button>
                    </Td>
                  </tr>
                ))
              )}
            </tbody>
          </Table>
        </section>

        {/* Chart placeholder (entries/day) at the bottom */}
        <section className="rounded-lg border bg-white p-4">
          <div className="mb-2 text-sm font-medium">Entries per day (filtered)</div>
          {entriesPerDay.length === 0 ? (
            <div className="text-sm text-gray-500">—</div>
          ) : (
            <div className="relative h-40 w-full">
              <div className="flex h-full items-end gap-1">
                {entriesPerDay.map(({ day, n }) => (
                  <div key={day} className="flex flex-col items-center gap-1">
                    <div
                      className="w-4 rounded-t bg-gray-800"
                      style={{ height: `${Math.min(100, n * 12)}%` }}
                      title={`${day}: ${n}`}
                    />
                    <div className="text-[10px] text-gray-500">{day.slice(5)}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>
      </main>

      {/* Optional corner brand (kept for parity with your earlier screenshot) */}
      <div className="pointer-events-none fixed left-3 top-3 z-20 flex items-center gap-2 opacity-80">
        <Image src={"/temptake-192.png"} alt={"TempTake"} width={20} height={20} />
        <span className="text-sm font-semibold">TempTake</span>
      </div>
    </div>
  );
}

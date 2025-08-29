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

/* --------------------------- helpers & small UI --------------------------- */

type BrandingProps = {
  brandName?: string;
  brandAccent?: string;
  logoUrl?: string;
};

function clsx(...xs: Array<string | false | null | undefined>) {
  return xs.filter(Boolean).join(" ");
}

function startOfDayISO(d: Date) {
  const z = new Date(d);
  z.setHours(0, 0, 0, 0);
  return z.toISOString().slice(0, 10);
}
function addDaysISO(dateISO: string, days: number) {
  const d = new Date(dateISO + "T00:00:00");
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}
function fmtDate(iso?: string | null) {
  return iso ? new Date(iso).toLocaleDateString() : "";
}
function fmtTime(iso?: string | null) {
  return iso ? new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "";
}
function fmtTemp(v: number | null | undefined, unit: "C" | "F") {
  if (v == null) return "—";
  return `${v.toFixed(1)}°${unit}`;
}

/* ------------------------------- main view -------------------------------- */

export default function FoodTempLogger({
  brandName = "TempTake",
  brandAccent = "#111827",
  logoUrl = "/icon.png",
}: BrandingProps) {
  // Settings: normalize to `unit`
  const settings = useSettings() as any;
  const unit: "C" | "F" = (settings?.unit ?? settings?.tempUnit ?? "C") as "C" | "F";

  // state
  const [logs, setLogs] = React.useState<TempLogRow[]>([]);
  const [staffInitials, setStaffInitials] = React.useState<string[]>([]);
  const [targets, setTargets] = React.useState<string[]>([]);

  // filters
  const todayISO = startOfDayISO(new Date());
  const thirtyAgo = addDaysISO(todayISO, -30);
  const [from, setFrom] = React.useState<string>(thirtyAgo);
  const [to, setTo] = React.useState<string>(todayISO);
  const [search, setSearch] = React.useState<string>("");
  const [category, setCategory] = React.useState<string>("All"); // free tag if needed later

  // quick entry UI state
  const [showQuick, setShowQuick] = React.useState<boolean>(false);
  const [saving, setSaving] = React.useState<boolean>(false);
  const [q, setQ] = React.useState<{
    recorded_at: string; // ISO date
    time: string; // HH:mm (local)
    staff_initials: string;
    target: string;
    item: string;
    location: string;
    temperature: string; // input text, parsed to number
    notes: string;
  }>({
    recorded_at: todayISO,
    time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false }),
    staff_initials: "",
    target: "",
    item: "",
    location: "",
    temperature: "",
    notes: "",
  });

  // load page data
  React.useEffect(() => {
    (async () => {
      const [l, s, t] = await Promise.all([
        listTempLogs({ from, to, query: search || undefined, limit: 500 }),
        listStaffInitials(),
        listTargets(),
      ]);
      setLogs(l);
      setStaffInitials(s);
      setTargets(t);
    })();
  }, [from, to, search]);

  // derived KPI
  const kpi = React.useMemo(() => {
    const top = [...logs]
      .filter((r) => !r.staff_initials?.trim() ? false : true)
      .reduce<Record<string, number>>((acc, r) => {
        const k = (r.staff_initials ?? "").trim();
        if (!k) return acc;
        acc[k] = (acc[k] ?? 0) + 1;
        return acc;
      }, {});
    const topLogger =
      Object.keys(top).length === 0
        ? "—"
        : Object.entries(top).sort((a, b) => b[1] - a[1])[0].join(" · ");

    const needsAttention = logs.filter((r) => r.pass === false).length;

    // days with zero entries in range
    const daysMissed = (() => {
      const byDay = new Set(logs.map((r) => (r.recorded_at ?? "").slice(0, 10)));
      let miss = 0;
      for (let d = from; d <= to; d = addDaysISO(d, 1)) {
        if (!byDay.has(d)) miss++;
        if (d === to) break;
      }
      return miss;
    })();

    return { topLogger, needsAttention, daysMissed };
  }, [logs, from, to]);

  // entries/day (at bottom)
  const entriesPerDay = React.useMemo(() => {
    const buckets: Record<string, number> = {};
    for (let d = from; d <= to; d = addDaysISO(d, 1)) {
      buckets[d] = 0;
      if (d === to) break;
    }
    for (const r of logs) {
      const day = (r.recorded_at ?? "").slice(0, 10);
      if (day in buckets) buckets[day] += 1;
    }
    return Object.entries(buckets);
  }, [logs, from, to]);

  // full entry modal
  const [showFull, setShowFull] = React.useState(false);

  async function handleQuickSave() {
    setSaving(true);
    try {
      // merge date + time to ISO
      const recordedISO = new Date(`${q.recorded_at}T${q.time}:00`).toISOString();

      const payload: TempLogInput = {
        recorded_at: recordedISO,
        staff_initials: q.staff_initials || null,
        location: q.location || null,
        target: q.target || null,
        item: q.item || null,
        temperature: q.temperature.trim() ? Number(q.temperature) : null,
        unit,
        // pass auto rule: fridges/freezers stricter, otherwise general 63+ hot, 75+ cook etc. (simple demo)
        pass:
          q.target.toLowerCase().includes("fridge")
            ? q.temperature.trim() ? Number(q.temperature) <= (unit === "C" ? 5 : 41) : null
            : q.target.toLowerCase().includes("freezer")
            ? q.temperature.trim() ? Number(q.temperature) <= (unit === "C" ? -18 : 0) : null
            : q.temperature.trim() ? Number(q.temperature) >= (unit === "C" ? 63 : 145) : null,
        notes: q.notes || null,
      };

      const saved = await upsertTempLog(payload);
      // optimistic add to list (top)
      setLogs((xs) => [saved, ...xs]);
      // reset only item/temp/notes
      setQ((cur) => ({ ...cur, item: "", temperature: "", notes: "" }));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="min-h-screen w-full bg-gray-50">
      {/* top bar */}
      <nav className="sticky top-0 z-20 bg-white/90 backdrop-blur border-b">
        <div className="mx-auto max-w-6xl px-4 py-3 flex items-center gap-3">
          <Image src={logoUrl} width={32} height={32} alt={brandName} />
          <span className="font-semibold">{brandName}</span>
          <div className="ml-auto">
            <NavTabs />
          </div>
        </div>
      </nav>

      <main className="mx-auto max-w-6xl p-4 space-y-6">
        {/* controls row */}
        <div className="flex items-center gap-2">
          <button
            className="inline-flex items-center gap-2 rounded-md border px-3 py-1.5 text-sm bg-white hover:bg-gray-50"
            onClick={() => setShowQuick((v) => !v)}
          >
            <span className={clsx("transition-transform", showQuick && "rotate-90")}>▸</span>
            Quick entry
          </button>

          <button
            className="rounded-md bg-gray-900 text-white px-3 py-1.5 text-sm hover:bg-black/90"
            onClick={() => setShowFull(true)}
          >
            + Full entry
          </button>

          <div className="ml-auto flex items-center gap-4">
            <label className="text-sm text-gray-600">Guests allowed</label>
            {/* display only – settings toggle lives in Settings page */}
            <input type="checkbox" disabled className="accent-gray-900" defaultChecked={!!settings?.allowGuestEntries} />
          </div>
        </div>

        {/* KPI cards */}
        <section className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="rounded-lg border bg-white p-4">
            <div className="text-xs text-gray-500 mb-1">Top logger</div>
            <div className="text-2xl font-semibold leading-tight">{kpi.topLogger}</div>
            <div className="text-xs text-gray-500 mt-1">in current range</div>
          </div>
          <div className="rounded-lg border bg-white p-4">
            <div className="text-xs text-gray-500 mb-1">Needs attention</div>
            <div className="text-2xl font-semibold leading-tight text-red-600">{kpi.needsAttention}</div>
            <div className="text-xs text-gray-500 mt-1">failed checks</div>
          </div>
          <div className="rounded-lg border bg-white p-4">
            <div className="text-xs text-gray-500 mb-1">Days missed</div>
            <div className="text-2xl font-semibold leading-tight">{kpi.daysMissed}</div>
            <div className="text-xs text-gray-500 mt-1">no entries on those days</div>
          </div>
        </section>

        {/* quick entry collapsible */}
        {showQuick && (
          <section className="rounded-xl border bg-white p-4 space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-3 md:grid-cols-4 gap-3">
              <div>
                <label className="block text-xs text-gray-600 mb-1">Date</label>
                <input
                  type="date"
                  value={q.recorded_at}
                  onChange={(e) => setQ({ ...q, recorded_at: e.target.value })}
                  className="w-full rounded-md border px-2 py-1.5"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-600 mb-1">Time</label>
                <input
                  type="time"
                  value={q.time}
                  onChange={(e) => setQ({ ...q, time: e.target.value })}
                  className="w-full rounded-md border px-2 py-1.5"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-600 mb-1">Initials</label>
                <input
                  list="initials"
                  value={q.staff_initials}
                  onChange={(e) => setQ({ ...q, staff_initials: e.target.value.toUpperCase() })}
                  placeholder="AB"
                  className="w-full rounded-md border px-2 py-1.5 uppercase"
                />
                <datalist id="initials">
                  {staffInitials.map((s) => (
                    <option key={s} value={s} />
                  ))}
                </datalist>
              </div>
              <div>
                <label className="block text-xs text-gray-600 mb-1">Target</label>
                <input
                  list="targets"
                  value={q.target}
                  onChange={(e) => setQ({ ...q, target: e.target.value })}
                  placeholder="Fridge / Freezer / Hot hold…"
                  className="w-full rounded-md border px-2 py-1.5"
                />
                <datalist id="targets">
                  {targets.map((t) => (
                    <option key={t} value={t} />
                  ))}
                </datalist>
              </div>
              <div className="sm:col-span-2">
                <label className="block text-xs text-gray-600 mb-1">Item</label>
                <input
                  value={q.item}
                  onChange={(e) => setQ({ ...q, item: e.target.value })}
                  placeholder="e.g. Fridge 1 / Chicken Curry"
                  className="w-full rounded-md border px-2 py-1.5"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-600 mb-1">Location</label>
                <input
                  value={q.location}
                  onChange={(e) => setQ({ ...q, location: e.target.value })}
                  placeholder="Kitchen / Servery"
                  className="w-full rounded-md border px-2 py-1.5"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-600 mb-1">Temperature ({unit})</label>
                <input
                  type="number"
                  inputMode="decimal"
                  step="0.1"
                  value={q.temperature}
                  onChange={(e) => setQ({ ...q, temperature: e.target.value })}
                  placeholder={unit === "C" ? "e.g. 3.5" : "e.g. 38.0"}
                  className="w-full rounded-md border px-2 py-1.5"
                />
              </div>
              <div className="md:col-span-2 sm:col-span-3">
                <label className="block text-xs text-gray-600 mb-1">Notes</label>
                <input
                  value={q.notes}
                  onChange={(e) => setQ({ ...q, notes: e.target.value })}
                  placeholder="Optional"
                  className="w-full rounded-md border px-2 py-1.5"
                />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                disabled={saving}
                onClick={handleQuickSave}
                className={clsx(
                  "rounded-md px-3 py-1.5 text-sm text-white",
                  saving ? "bg-gray-400" : "bg-gray-900 hover:bg-black/90"
                )}
              >
                {saving ? "Saving…" : "Save entry"}
              </button>
              <span className="text-xs text-gray-500">Unit: {unit}</span>
            </div>
          </section>
        )}

        {/* filters row */}
        <section className="rounded-xl border bg-white p-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3 items-end">
            <div>
              <div className="text-xs text-gray-500 mb-1">Entries</div>
              <div className="text-2xl font-semibold leading-tight">{logs.length}</div>
              <div className="text-xs text-gray-500">in current view</div>
            </div>

            <div>
              <label className="block text-xs text-gray-600 mb-1">From</label>
              <input
                type="date"
                value={from}
                onChange={(e) => setFrom(e.target.value)}
                className="w-full rounded-md border px-2 py-1.5"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-600 mb-1">To</label>
              <input
                type="date"
                value={to}
                onChange={(e) => setTo(e.target.value)}
                className="w-full rounded-md border px-2 py-1.5"
              />
            </div>

            <div>
              <label className="block text-xs text-gray-600 mb-1">Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full rounded-md border px-2 py-1.5"
              >
                <option>All</option>
                <option>Fridge</option>
                <option>Freezer</option>
                <option>Cook</option>
                <option>Hot hold</option>
                <option>Probe</option>
              </select>
            </div>

            <div>
              <label className="block text-xs text-gray-600 mb-1">Search</label>
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="item / location / initials"
                className="w-full rounded-md border px-2 py-1.5"
              />
            </div>
          </div>
        </section>

        {/* entries table */}
        <section className="rounded-xl border bg-white overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b bg-gray-50 text-left">
                <th className="px-3 py-2">Date</th>
                <th className="px-3 py-2">Time</th>
                <th className="px-3 py-2">Initials</th>
                <th className="px-3 py-2">Location</th>
                <th className="px-3 py-2">Category</th>
                <th className="px-3 py-2">Item</th>
                <th className="px-3 py-2">Temp</th>
                <th className="px-3 py-2">Pass</th>
                <th className="px-3 py-2">Notes</th>
                <th className="px-3 py-2 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {logs.length === 0 && (
                <tr>
                  <td className="px-3 py-6 text-center text-gray-500" colSpan={10}>
                    No entries in this view.
                  </td>
                </tr>
              )}
              {logs.map((r) => (
                <tr key={r.id} className="border-b">
                  <td className="px-3 py-2">{fmtDate(r.recorded_at)}</td>
                  <td className="px-3 py-2">{fmtTime(r.recorded_at)}</td>
                  <td className="px-3 py-2">{r.staff_initials ?? "—"}</td>
                  <td className="px-3 py-2">{r.location ?? "—"}</td>
                  <td className="px-3 py-2">{r.target ?? "—"}</td>
                  <td className="px-3 py-2">{r.item ?? "—"}</td>
                  <td className="px-3 py-2">{fmtTemp(r.temperature, unit)}</td>
                  <td className="px-3 py-2">
                    {r.pass == null ? "—" : r.pass ? <span className="text-green-600">Pass</span> : <span className="text-red-600">Fail</span>}
                  </td>
                  <td className="px-3 py-2 max-w-[240px]">
                    <span title={r.notes ?? ""} className="block truncate">
                      {r.notes ?? "—"}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-right">
                    <button
                      className="text-red-600 hover:underline"
                      onClick={async () => {
                        await deleteTempLog(r.id);
                        setLogs((xs) => xs.filter((x) => x.id !== r.id));
                      }}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        {/* entries/day chart */}
        <section className="rounded-xl border bg-white p-4">
          <h3 className="text-sm font-semibold mb-3">Entries per day (filtered)</h3>
          <div className="flex items-end gap-1 h-32">
            {entriesPerDay.map(([day, count]) => (
              <div key={day} className="flex-1">
                <div
                  className="w-full bg-gray-900 rounded-t"
                  style={{ height: `${Math.min(100, count * 10)}%` }}
                  title={`${day}: ${count}`}
                />
              </div>
            ))}
          </div>
        </section>
      </main>

      {/* Full entry modal (simple) */}
      {showFull && (
        <div className="fixed inset-0 z-30 bg-black/30 flex items-center justify-center p-4" onClick={() => setShowFull(false)}>
          <div className="w-full max-w-xl rounded-xl bg-white shadow p-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-semibold">New temperature entry</h4>
              <button onClick={() => setShowFull(false)} className="text-sm text-gray-500 hover:text-gray-700">Close</button>
            </div>
            {/* Re-use the quick form fields to keep this brief; in your older build this was a separate big form. */}
            {/* You can later replace with the exact older modal component. */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-gray-600 mb-1">Date</label>
                <input
                  type="date"
                  value={q.recorded_at}
                  onChange={(e) => setQ({ ...q, recorded_at: e.target.value })}
                  className="w-full rounded-md border px-2 py-1.5"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-600 mb-1">Time</label>
                <input
                  type="time"
                  value={q.time}
                  onChange={(e) => setQ({ ...q, time: e.target.value })}
                  className="w-full rounded-md border px-2 py-1.5"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-600 mb-1">Initials</label>
                <input
                  list="initials"
                  value={q.staff_initials}
                  onChange={(e) => setQ({ ...q, staff_initials: e.target.value.toUpperCase() })}
                  className="w-full rounded-md border px-2 py-1.5 uppercase"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-600 mb-1">Category</label>
                <input
                  list="targets"
                  value={q.target}
                  onChange={(e) => setQ({ ...q, target: e.target.value })}
                  className="w-full rounded-md border px-2 py-1.5"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-xs text-gray-600 mb-1">Item</label>
                <input
                  value={q.item}
                  onChange={(e) => setQ({ ...q, item: e.target.value })}
                  className="w-full rounded-md border px-2 py-1.5"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-600 mb-1">Location</label>
                <input
                  value={q.location}
                  onChange={(e) => setQ({ ...q, location: e.target.value })}
                  className="w-full rounded-md border px-2 py-1.5"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-600 mb-1">Temperature ({unit})</label>
                <input
                  type="number"
                  step="0.1"
                  value={q.temperature}
                  onChange={(e) => setQ({ ...q, temperature: e.target.value })}
                  className="w-full rounded-md border px-2 py-1.5"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-xs text-gray-600 mb-1">Notes</label>
                <input
                  value={q.notes}
                  onChange={(e) => setQ({ ...q, notes: e.target.value })}
                  className="w-full rounded-md border px-2 py-1.5"
                />
              </div>
            </div>
            <div className="mt-4 flex items-center gap-2">
              <button
                disabled={saving}
                onClick={async () => {
                  await handleQuickSave();
                  setShowFull(false);
                }}
                className={clsx(
                  "rounded-md px-3 py-1.5 text-sm text-white",
                  saving ? "bg-gray-400" : "bg-gray-900 hover:bg-black/90"
                )}
              >
                {saving ? "Saving…" : "Save entry"}
              </button>
              <button onClick={() => setShowFull(false)} className="text-sm hover:underline">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// src/components/FoodTempLogger.tsx
"use client";

import React, { useEffect, useMemo, useState } from "react";
import NavTabs from "./NavTabs";
import { supabase } from "@/lib/supabase";

/* ---------- Types ---------- */
type Category = "Fridge" | "Freezer" | "Cook" | "Hot Hold" | "Other";

export type TempLogRow = {
  id: string;
  created_at: string;
  category: Category | string;
  location: string;
  item: string;
  temperature: number;
  initials: string;
  pass: boolean;
  notes?: string | null;
};

type NewTempLog = Omit<TempLogRow, "id" | "created_at" | "pass"> & { pass?: boolean };

const CATEGORIES: Category[] = ["Fridge", "Freezer", "Cook", "Hot Hold", "Other"];

/* ---------- Helpers ---------- */
const todayISO = (): string => new Date().toISOString().slice(0, 10);

function withinRange(temp: number, category: string): boolean {
  if (category === "Fridge") return temp >= 0 && temp <= 5;
  if (category === "Freezer") return temp <= -18;
  if (category === "Cook") return temp >= 75;
  if (category === "Hot Hold") return temp >= 63;
  return true;
}

function dateOnly(iso: string): string {
  return iso.slice(0, 10);
}

/* ---------- Component ---------- */
export default function FoodTempLogger() {
  // data
  const [logs, setLogs] = useState<TempLogRow[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // staff initials list (optional)
  const [staffInitials, setStaffInitials] = useState<string[]>([]);

  // quick entry
  const [showQuick, setShowQuick] = useState<boolean>(false);
  const [quick, setQuick] = useState<NewTempLog>({
    category: "Fridge",
    location: "",
    item: "",
    temperature: 0,
    initials: "",
    notes: "",
  });

  // full entry modal
  const [showFull, setShowFull] = useState<boolean>(false);
  const [full, setFull] = useState<NewTempLog>({
    category: "Fridge",
    location: "",
    item: "",
    temperature: 0,
    initials: "",
    notes: "",
  });

  // filters (next to table)
  const [fText, setFText] = useState<string>("");
  const [fCat, setFCat] = useState<string>("All");
  const [fFrom, setFFrom] = useState<string>("");
  const [fTo, setFTo] = useState<string>("");

  /* ----- Load logs & initials ----- */
  useEffect(() => {
    let mounted = true;
    async function load() {
      setLoading(true);
      const { data, error } = await supabase
        .from("temp_logs")
        .select("*")
        .order("created_at", { ascending: false });
      if (!mounted) return;
      if (error) {
        console.error("load temp_logs", error);
        setLogs([]);
      } else {
        setLogs((data ?? []) as TempLogRow[]);
      }

      // optional staff list
      const staff = await supabase.from("staff_profiles").select("initials").order("initials", { ascending: true });
      if (mounted && !staff.error) {
        const initials = (staff.data ?? [])
          .map((r: { initials?: string | null }) => (r.initials ?? "").trim())
          .filter((v: string) => v.length > 0);
        setStaffInitials(Array.from(new Set(initials)));
      }
      setLoading(false);
    }
    load();
    return () => {
      mounted = false;
    };
  }, []);

  /* ---------- KPI Cards ---------- */
  const lastNDays = (n: number): string[] => {
    const out: string[] = [];
    const now = new Date();
    for (let i = n - 1; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(now.getDate() - i);
      out.push(d.toISOString().slice(0, 10));
    }
    return out;
  };

  const kpi = useMemo(() => {
    const last30 = new Date();
    last30.setDate(last30.getDate() - 30);

    const recent = logs.filter((r) => new Date(r.created_at) >= last30);
    const byInitials = new Map<string, number>();
    for (const r of recent) {
      byInitials.set(r.initials, (byInitials.get(r.initials) ?? 0) + 1);
    }
    let topLogger = "-";
    let topCount = 0;
    for (const [k, v] of byInitials) {
      if (v > topCount) {
        topLogger = k || "-";
        topCount = v;
      }
    }

    const last7 = new Date();
    last7.setDate(last7.getDate() - 7);
    const needsAttention = logs.filter((r) => new Date(r.created_at) >= last7 && !r.pass).length;

    // missed days (last 14 days with zero entries)
    const days = lastNDays(14);
    const setByDay = new Map<string, number>();
    for (const iso of days) setByDay.set(iso, 0);
    for (const r of logs) {
      const d = dateOnly(r.created_at);
      if (setByDay.has(d)) setByDay.set(d, (setByDay.get(d) ?? 0) + 1);
    }
    const missed = Array.from(setByDay.values()).filter((v) => v === 0).length;

    return { topLogger, needsAttention, missed };
  }, [logs]);

  /* ---------- Derived table (filters) ---------- */
  const filtered = useMemo(() => {
    let rows = [...logs];
    if (fText.trim()) {
      const q = fText.toLowerCase();
      rows = rows.filter(
        (r) =>
          r.item.toLowerCase().includes(q) ||
          r.location.toLowerCase().includes(q) ||
          r.initials.toLowerCase().includes(q)
      );
    }
    if (fCat !== "All") rows = rows.filter((r) => r.category === fCat);
    if (fFrom) rows = rows.filter((r) => dateOnly(r.created_at) >= fFrom);
    if (fTo) rows = rows.filter((r) => dateOnly(r.created_at) <= fTo);
    return rows;
  }, [logs, fText, fCat, fFrom, fTo]);

  /* ---------- Chart data (entries per day) ---------- */
  const chart = useMemo(() => {
    const days = lastNDays(14);
    const counts = days.map((d) => ({ day: d.slice(5), count: 0 }));
    const indexByDay = new Map(days.map((d, i) => [d, i]));
    for (const r of logs) {
      const d = dateOnly(r.created_at);
      const i = indexByDay.get(d);
      if (i !== undefined) counts[i].count += 1;
    }
    const max = Math.max(1, ...counts.map((c) => c.count));
    return { days: counts, max };
  }, [logs]);

  /* ---------- Save helpers ---------- */
  async function insertLog(input: NewTempLog) {
    const pass = withinRange(input.temperature, input.category);
    const payload = { ...input, pass };
    const { data, error } = await supabase.from("temp_logs").insert(payload).select().single();
    if (error) {
      console.error("insert temp_log", error);
      alert("Could not save entry.");
      return null;
    }
    return data as TempLogRow;
  }

  async function submitQuick(e: React.FormEvent) {
    e.preventDefault();
    if (!quick.item || !quick.location || !quick.initials) {
      alert("Please fill item, location, and initials.");
      return;
    }
    const saved = await insertLog(quick);
    if (saved) {
      setLogs((prev) => [saved, ...prev]);
      setQuick({ category: "Fridge", location: "", item: "", temperature: 0, initials: "", notes: "" });
      setShowQuick(false);
    }
  }

  async function submitFull(e: React.FormEvent) {
    e.preventDefault();
    if (!full.item || !full.location || !full.initials) {
      alert("Please fill item, location, and initials.");
      return;
    }
    const saved = await insertLog(full);
    if (saved) {
      setLogs((prev) => [saved, ...prev]);
      setFull({ category: "Fridge", location: "", item: "", temperature: 0, initials: "", notes: "" });
      setShowFull(false);
    }
  }

  /* ---------- UI ---------- */
  return (
    <div className="min-h-screen w-full bg-gray-50">
      <NavTabs />

      <main className="mx-auto max-w-6xl p-4 space-y-6">
        {/* KPI cards */}
        <section className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <KpiCard label="Top logger (30 days)" value={kpi.topLogger || "-"} />
          <KpiCard label="Items needing attention (7 days)" value={String(kpi.needsAttention)} tone="warn" />
          <KpiCard label="Missed days (last 14)" value={String(kpi.missed)} tone={kpi.missed > 0 ? "warn" : "ok"} />
        </section>

        {/* Actions row */}
        <section className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <button
              className="inline-flex items-center gap-2 rounded-md border px-3 py-2 bg-white hover:bg-gray-50"
              onClick={() => setShowQuick((v) => !v)}
              aria-expanded={showQuick}
              aria-controls="quick-entry"
            >
              <span className="select-none">{showQuick ? "▾" : "▸"}</span>
              <span>Quick entry</span>
            </button>

            <button
              className="rounded-md bg-slate-900 text-white px-4 py-2"
              onClick={() => setShowFull(true)}
            >
              Full entry
            </button>
          </div>
        </section>

        {/* Quick entry panel (directly under the button) */}
        {showQuick && (
          <section id="quick-entry" className="rounded-xl border bg-white p-4">
            <form onSubmit={submitQuick} className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-4 gap-3 items-end">
              <div>
                <label className="block text-sm mb-1">Category</label>
                <select
                  className="w-full rounded-md border px-2 py-1"
                  value={quick.category}
                  onChange={(e) => setQuick({ ...quick, category: e.target.value as Category })}
                >
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm mb-1">Location</label>
                <input
                  className="w-full rounded-md border px-2 py-1"
                  value={quick.location}
                  onChange={(e) => setQuick({ ...quick, location: e.target.value })}
                  placeholder="Kitchen, Fridge 1…"
                />
              </div>

              <div>
                <label className="block text-sm mb-1">Item</label>
                <input
                  className="w-full rounded-md border px-2 py-1"
                  value={quick.item}
                  onChange={(e) => setQuick({ ...quick, item: e.target.value })}
                  placeholder="Chicken curry…"
                />
              </div>

              <div>
                <label className="block text-sm mb-1">Temperature (°C)</label>
                <input
                  type="number"
                  step="0.1"
                  className="w-full rounded-md border px-2 py-1"
                  value={quick.temperature}
                  onChange={(e) => setQuick({ ...quick, temperature: Number(e.target.value) })}
                />
              </div>

              <div>
                <label className="block text-sm mb-1">Initials</label>
                {staffInitials.length > 0 ? (
                  <select
                    className="w-full rounded-md border px-2 py-1"
                    value={quick.initials}
                    onChange={(e) => setQuick({ ...quick, initials: e.target.value })}
                  >
                    <option value="">Select…</option>
                    {staffInitials.map((i) => (
                      <option key={i} value={i}>
                        {i}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    className="w-full rounded-md border px-2 py-1"
                    value={quick.initials}
                    onChange={(e) => setQuick({ ...quick, initials: e.target.value })}
                    placeholder="AB"
                  />
                )}
              </div>

              <div className="sm:col-span-2 lg:col-span-3">
                <label className="block text-sm mb-1">Notes (optional)</label>
                <input
                  className="w-full rounded-md border px-2 py-1"
                  value={quick.notes ?? ""}
                  onChange={(e) => setQuick({ ...quick, notes: e.target.value })}
                  placeholder="Corrective action or comments…"
                />
              </div>

              <div className="sm:col-span-1 lg:col-span-1">
                <button className="w-full rounded-md bg-slate-900 text-white px-4 py-2">Save</button>
              </div>
            </form>
          </section>
        )}

        {/* Filters + table (lower on page) */}
        <section className="rounded-xl border bg-white p-4 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3">
            <div className="lg:col-span-2">
              <label className="block text-sm mb-1">Search</label>
              <input
                className="w-full rounded-md border px-2 py-1"
                value={fText}
                onChange={(e) => setFText(e.target.value)}
                placeholder="Search item / location / initials…"
              />
            </div>
            <div>
              <label className="block text-sm mb-1">Category</label>
              <select
                className="w-full rounded-md border px-2 py-1"
                value={fCat}
                onChange={(e) => setFCat(e.target.value)}
              >
                <option>All</option>
                {CATEGORIES.map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm mb-1">From</label>
              <input
                type="date"
                className="w-full rounded-md border px-2 py-1"
                value={fFrom}
                onChange={(e) => setFFrom(e.target.value)}
                max={fTo || undefined}
              />
            </div>
            <div>
              <label className="block text-sm mb-1">To</label>
              <input
                type="date"
                className="w-full rounded-md border px-2 py-1"
                value={fTo}
                onChange={(e) => setFTo(e.target.value)}
                min={fFrom || undefined}
                max={todayISO()}
              />
            </div>
            <div className="flex items-end">
              <button
                className="w-full rounded-md border px-3 py-2 bg-white hover:bg-gray-50"
                onClick={() => {
                  setFText("");
                  setFCat("All");
                  setFFrom("");
                  setFTo("");
                }}
              >
                Clear
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-slate-600 border-b">
                  <th className="py-2 pr-3">Date</th>
                  <th className="py-2 pr-3">Category</th>
                  <th className="py-2 pr-3">Location</th>
                  <th className="py-2 pr-3">Item</th>
                  <th className="py-2 pr-3">Temp</th>
                  <th className="py-2 pr-3">Initials</th>
                  <th className="py-2 pr-3">Status</th>
                  <th className="py-2 pr-3">Notes</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={8} className="py-6 text-center text-slate-500">
                      Loading…
                    </td>
                  </tr>
                ) : filtered.length ? (
                  filtered.map((r) => (
                    <tr key={r.id} className="border-t hover:bg-gray-50">
                      <td className="py-2 pr-3">{dateOnly(r.created_at)}</td>
                      <td className="py-2 pr-3">{r.category}</td>
                      <td className="py-2 pr-3">{r.location}</td>
                      <td className="py-2 pr-3">{r.item}</td>
                      <td className="py-2 pr-3">{r.temperature.toFixed(1)}°C</td>
                      <td className="py-2 pr-3">{r.initials}</td>
                      <td className="py-2 pr-3">
                        <span
                          className={`px-2 py-1 rounded-md text-xs font-medium ${
                            r.pass ? "bg-green-100 text-green-800" : "bg-red-100 text-red-700"
                          }`}
                        >
                          {r.pass ? "Pass" : "Fail"}
                        </span>
                      </td>
                      <td className="py-2 pr-3">{r.notes || ""}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={8} className="py-6 text-center text-slate-500">
                      No entries found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        {/* Bar chart at the very bottom */}
        <section className="rounded-xl border bg-white p-4">
          <h3 className="text-sm font-medium mb-3">Entries per day (last 14 days)</h3>
          <div className="flex items-end gap-2 h-40">
            {chart.days.map((d) => {
              const h = Math.round((d.count / chart.max) * 140);
              return (
                <div key={d.day} className="flex flex-col items-center justify-end h-full">
                  <div
                    title={`${d.day}: ${d.count}`}
                    className="w-6 rounded-t bg-slate-800"
                    style={{ height: `${h}px` }}
                  />
                  <div className="text-[10px] mt-1 text-slate-600">{d.day}</div>
                </div>
              );
            })}
          </div>
        </section>
      </main>

      {/* Full entry modal */}
      {showFull && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-2xl rounded-xl bg-white p-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-base font-semibold">New temperature entry</h2>
              <button className="text-slate-500 hover:text-slate-700" onClick={() => setShowFull(false)}>
                ✕
              </button>
            </div>

            <form onSubmit={submitFull} className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-sm mb-1">Category</label>
                <select
                  className="w-full rounded-md border px-2 py-1"
                  value={full.category}
                  onChange={(e) => setFull({ ...full, category: e.target.value as Category })}
                >
                  {CATEGORIES.map((c) => (
                    <option key={c}>{c}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm mb-1">Location</label>
                <input
                  className="w-full rounded-md border px-2 py-1"
                  value={full.location}
                  onChange={(e) => setFull({ ...full, location: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm mb-1">Item</label>
                <input
                  className="w-full rounded-md border px-2 py-1"
                  value={full.item}
                  onChange={(e) => setFull({ ...full, item: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm mb-1">Temperature (°C)</label>
                <input
                  type="number"
                  step="0.1"
                  className="w-full rounded-md border px-2 py-1"
                  value={full.temperature}
                  onChange={(e) => setFull({ ...full, temperature: Number(e.target.value) })}
                />
              </div>
              <div>
                <label classNam
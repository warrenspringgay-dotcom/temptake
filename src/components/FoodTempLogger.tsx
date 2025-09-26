// src/components/FoodTempLogger.tsx
"use client";

import React, { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { LOCATION_PRESETS, TARGET_PRESETS, TARGET_BY_KEY, type TargetPreset } from "@/lib/temp-constants";

type CanonRow = {
  id: string;
  date: string | null;
  staff_initials: string | null;
  location: string | null;
  item: string | null;
  target_key: string | null;
  temp_c: number | null;
  status: "pass" | "fail" | null;
};

type Props = {
  initials?: string[];
  onChange?: () => void;
  onRows?: (rows: CanonRow[]) => void;
  brandName?: string;
  brandAccent?: string;
  logoUrl?: string;
};

const PROBE_TABLES = ["food_temp_logs", "temp_logs", "temperature_logs"] as const;
const LS_TABLE_KEY = "tt_logs_table_name";

function cls(...parts: Array<string | false | undefined>) {
  return parts.filter(Boolean).join(" ");
}
function inferStatus(temp: number | null, preset?: TargetPreset): "pass" | "fail" | null {
  if (temp == null || !preset) return null;
  const { minC, maxC } = preset;
  if (minC != null && temp < minC) return "fail";
  if (maxC != null && temp > maxC) return "fail";
  return "pass";
}
async function getUid(): Promise<string> {
  const { data } = await supabase.auth.getUser();
  if (!data.user) throw new Error("You are signed out.");
  return data.user.id;
}
async function detectLogsTableForUser(uid: string): Promise<string | null> {
  const cached = localStorage.getItem(LS_TABLE_KEY);
  if (cached) {
    const { error } = await supabase.from(cached).select("*").eq("created_by", uid).limit(1);
    if (!error) return cached;
  }
  for (const t of PROBE_TABLES) {
    const { error } = await supabase.from(t).select("*").eq("created_by", uid).limit(1);
    if (!error) {
      localStorage.setItem(LS_TABLE_KEY, t);
      return t;
    }
  }
  return null;
}
function pick<T = any>(row: any, candidates: string[], fallback: T | null = null): T | null {
  for (const k of candidates) {
    if (row && Object.prototype.hasOwnProperty.call(row, k) && row[k] != null) return row[k] as T;
  }
  return fallback;
}
function toISODate(val: any): string | null {
  if (!val) return null;
  try {
    const d = new Date(val);
    if (isNaN(d.getTime())) return null;
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  } catch {
    return null;
  }
}
function normalizeRow(row: any, tableName: string): CanonRow {
  const temp = pick<number>(row, ["temp_c", "temperature", "temp"], null);

  let date: string | null = null;
  let location: string | null = null;
  let item: string | null = null;
  let initials: string | null = null;

  if (tableName === "food_temp_logs") {
    date = toISODate(row.at);
    location = pick<string>(row, ["area"], null);
    item = pick<string>(row, ["note"], null);
    initials = pick<string>(row, ["staff_initials", "initials"], null); // ← now supported
  } else {
    date = toISODate(pick<any>(row, ["date", "log_date", "created_at"], null));
    location = pick<string>(row, ["location", "place", "area"], null);
    item = pick<string>(row, ["item", "item_name", "food_item", "note"], null);
    initials = pick<string>(row, ["staff_initials", "initials", "staff"], null);
  }

  const targetKey = pick<string>(row, ["target_key", "target", "target_range_key"], null);
  let status = pick<"pass" | "fail">(row, ["status"], null);
  if (!status) {
    const preset = targetKey ? TARGET_BY_KEY[targetKey] : undefined;
    status = inferStatus(temp, preset);
  }

  return {
    id: String(pick(row, ["id"], "")) || crypto.randomUUID(),
    date,
    staff_initials: initials,
    location,
    item,
    target_key: targetKey,
    temp_c: typeof temp === "number" ? temp : temp != null ? Number(temp) : null,
    status,
  };
}
function sortRows(rows: CanonRow[]): CanonRow[] {
  const toKey = (r: CanonRow) => (r.date ? r.date : "");
  return [...rows].sort((a, b) => toKey(a).localeCompare(toKey(b)));
}
function buildInsertPayload(
  uid: string,
  tableName: string,
  form: { date: string; staff_initials: string; location: string; item: string; target_key: string; temp_c: string }
) {
  const tempNum = Number.isFinite(Number(form.temp_c)) ? Number(form.temp_c) : null;
  const preset = TARGET_BY_KEY[form.target_key];
  const status = inferStatus(tempNum, preset);

  if (tableName === "food_temp_logs") {
    return {
      org_id: uid, // using user id as org id for now
      created_by: uid,
      at: form.date,
      area: form.location || null,
      note: form.item || null,
      staff_initials: form.staff_initials ? form.staff_initials.toUpperCase() : null, // ← write initials
      target_key: form.target_key || null,
      temp_c: tempNum,
      status,
    };
  }

  return {
    created_by: uid,
    date: form.date,
    staff_initials: form.staff_initials ? form.staff_initials.toUpperCase() : null,
    location: form.location || null,
    item: form.item || null,
    target_key: form.target_key || null,
    temp_c: tempNum,
    status,
  };
}

export default function FoodTempLogger({ initials: initialsProp, onChange, onRows, brandName, brandAccent, logoUrl }: Props) {
  const [tableName, setTableName] = useState<string | null>(null);
  const [rows, setRows] = useState<CanonRow[]>([]);
  const [initials, setInitials] = useState<string[]>(initialsProp ?? []);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const [form, setForm] = useState({
    date: new Date().toISOString().slice(0, 10),
    staff_initials: "",
    location: LOCATION_PRESETS[0] ?? "",
    item: "",
    target_key: TARGET_PRESETS[0]?.key ?? "ambient",
    temp_c: "",
  });

  const canSave =
    !!form.date && !!form.location && !!form.item && !!form.target_key && form.temp_c.trim().length > 0;

  useEffect(() => {
    if (initialsProp) setInitials(initialsProp);
  }, [initialsProp]);

  // initial load once
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setErr(null);
      try {
        const uid = await getUid();
        const t = await detectLogsTableForUser(uid);
        if (!t) {
          setErr("Could not access your logs table under RLS. Ensure the table exists, has a created_by column, and rows belong to your user.");
          setRows([]);
          return;
        }
        if (cancelled) return;
        setTableName(t);

        const { data, error } = await supabase.from(t).select("*").eq("created_by", uid);
        if (error) throw error;

        const loaded = sortRows((data ?? []).map((r) => normalizeRow(r, t)));
        setRows(loaded);
      } catch (e: any) {
        console.error("Logger failed to fetch:", e?.raw || e);
        setErr(e?.message || "Failed to fetch logs.");
        setRows([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // only notify parent when rows change
  useEffect(() => {
    onRows?.(rows);
  }, [rows, onRows]);

  async function refresh() {
    if (!tableName) return;
    const uid = await getUid();
    const { data, error } = await supabase.from(tableName).select("*").eq("created_by", uid);
    if (error) {
      console.error("Refresh failed:", error);
      return;
    }
    const loaded = sortRows((data ?? []).map((r) => normalizeRow(r, tableName)));
    setRows(loaded);
  }

  async function handleAddQuick() {
    if (!tableName) {
      alert("Logs table not available.");
      return;
    }
    const uid = await getUid();
    const payload = buildInsertPayload(uid, tableName, form);

    const { error } = await supabase.from(tableName).insert(payload);
    if (error) {
      console.error("Insert failed:", error);
      alert(`Save failed: ${error.message ?? "unknown error"}.`);
      return;
    }
    await refresh();
    onChange?.();
    setForm((f) => ({ ...f, item: "", temp_c: "" })); // clear for next quick entry
  }

  async function remove(id: string) {
    if (!tableName) return;
    const uid = await getUid();
    const { error } = await supabase.from(tableName).delete().eq("id", id).eq("created_by", uid);
    if (error) {
      console.error("Delete failed:", error);
      alert(`Delete failed: ${error.message ?? "unknown error"}`);
      return;
    }
    await refresh();
    onChange?.();
  }

  function onTempKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" && canSave) {
      e.preventDefault();
      handleAddQuick();
    }
  }

  return (
    <div className="space-y-6">
      {brandName || logoUrl ? (
        <div className="flex items-center gap-2">
          {logoUrl ? <img src={logoUrl} alt="" className="h-6 w-6" /> : null}
          <span className="font-medium" style={brandAccent ? { color: brandAccent } : undefined}>
            {brandName}
          </span>
        </div>
      ) : null}

      {err ? (
        <div className="rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">{err}</div>
      ) : null}

      {/* Quick entry */}
      <div className="rounded-2xl border bg-white p-4 shadow-sm">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4 items-end">
          <div>
            <label className="block text-xs text-gray-500 mb-1">Date</label>
            <input
              type="date"
              value={form.date}
              onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
              className="w-full rounded-xl border px-3 py-2"
            />
          </div>

          <div>
            <label className="block text-xs text-gray-500 mb-1">Initials</label>
            <input
              list="staff-initials"
              value={form.staff_initials}
              onChange={(e) => setForm((f) => ({ ...f, staff_initials: e.target.value }))}
              placeholder="E.g., AA"
              className="w-full rounded-xl border px-3 py-2 uppercase"
            />
            <datalist id="staff-initials">
              {initials.map((ini) => (
                <option key={ini} value={ini} />
              ))}
            </datalist>
          </div>

          <div>
            <label className="block text-xs text-gray-500 mb-1">Location</label>
            <input
              list="location-list"
              value={form.location}
              onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))}
              className="w-full rounded-xl border px-3 py-2"
              placeholder="Kitchen / Fridge 1 / Freezer 2 …"
            />
            <datalist id="location-list">
              {LOCATION_PRESETS.map((loc) => (
                <option key={loc} value={loc} />
              ))}
            </datalist>
          </div>

          <div className="lg:col-span-2">
            <label className="block text-xs text-gray-500 mb-1">Item</label>
            <input
              value={form.item}
              onChange={(e) => setForm((f) => ({ ...f, item: e.target.value }))}
              className="w-full rounded-xl border px-3 py-2"
              placeholder="e.g., Chicken curry"
            />
          </div>

          <div>
            <label className="block text-xs text-gray-500 mb-1">Target</label>
            <select
              value={form.target_key}
              onChange={(e) => setForm((f) => ({ ...f, target_key: e.target.value }))}
              className="w-full rounded-xl border px-3 py-2"
            >
              {TARGET_PRESETS.map((p) => (
                <option key={p.key} value={p.key}>
                  {p.label}
                  {p.minC != null || p.maxC != null ? ` (${p.minC ?? "−∞"}–${p.maxC ?? "+∞"} °C)` : ""}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs text-gray-500 mb-1">Temp (°C)</label>
            <input
              value={form.temp_c}
              onChange={(e) => setForm((f) => ({ ...f, temp_c: e.target.value }))}
              onKeyDown={onTempKeyDown}
              className="w-full rounded-xl border px-3 py-2"
              inputMode="decimal"
              placeholder="e.g., 5.0"
            />
          </div>

          <div className="lg:col-span-6">
            <button
              onClick={handleAddQuick}
              disabled={!canSave}
              className={cls(
                "rounded-2xl px-4 py-2 font-medium text-white",
                canSave ? "bg-black hover:bg-gray-900" : "bg-gray-400"
              )}
            >
              Save quick entry
            </button>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-2xl border bg-white p-4 shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="text-left text-gray-500">
                <th className="py-2 pr-3">Date</th>
                <th className="py-2 pr-3">Staff</th>
                <th className="py-2 pr-3">Location</th>
                <th className="py-2 pr-3">Item</th>
                <th className="py-2 pr-3">Target</th>
                <th className="py-2 pr-3">Temp (°C)</th>
                <th className="py-2 pr-3">Status</th>
                <th className="py-2 pr-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-6 text-center text-gray-500">
                    Loading…
                  </td>
                </tr>
              ) : rows.length ? (
                rows.map((r) => {
                  const p = r.target_key ? TARGET_BY_KEY[r.target_key] : undefined;
                  const st = r.status ?? inferStatus(r.temp_c, p);
                  return (
                    <tr key={r.id} className="border-t">
                      <td className="py-2 pr-3">{r.date ?? "—"}</td>
                      <td className="py-2 pr-3">{r.staff_initials ?? "—"}</td>
                      <td className="py-2 pr-3">{r.location ?? "—"}</td>
                      <td className="py-2 pr-3">{r.item ?? "—"}</td>
                      <td className="py-2 pr-3">
                        {p
                          ? `${p.label}${p.minC != null || p.maxC != null ? ` (${p.minC ?? "−∞"}–${p.maxC ?? "+∞"} °C)` : ""}`
                          : "—"}
                      </td>
                      <td className="py-2 pr-3">{r.temp_c ?? "—"}</td>
                      <td className="py-2 pr-3">
                        {st ? (
                          <span className={cls(
                            "inline-flex rounded-full px-2 py-0.5 text-xs font-medium",
                            st === "pass" ? "bg-emerald-100 text-emerald-800" : "bg-red-100 text-red-800"
                          )}>
                            {st}
                          </span>
                        ) : "—"}
                      </td>
                      <td className="py-2 pr-3">
                        <button
                          onClick={() => remove(r.id)}
                          className="rounded-xl border px-2 py-1 hover:bg-gray-50"
                          title="Delete"
                          aria-label="Delete"
                        >
                          🗑️
                        </button>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={8} className="py-6 text-center text-gray-500">
                    No entries
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

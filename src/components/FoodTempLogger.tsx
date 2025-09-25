// src/components/FoodTempLogger.tsx
"use client";

import React, { useEffect, useMemo, useState } from "react";
import { cn } from "@/lib/cn";
import {
  listTempLogs,
  upsertTempLog,
  deleteTempLog,
  listStaffInitials,
  type TempLogRow,
  type TempLogInput,
} from "@/app/actions/tempLogs";
import { LOCATION_PRESETS, TARGET_PRESETS, TARGET_BY_KEY, type TargetPreset } from "@/lib/temp-constants";

type Props = {
  brandName?: string;
  brandAccent?: string;
  logoUrl?: string;
  /** If provided, the logger will use these instead of fetching. */
  initials?: string[];
  /** Called after a successful add/delete so the Dashboard can refresh KPIs. */
  onChange?: () => void;
};

type FormState = {
  date: string;
  staff_initials: string;
  location: string;
  item: string;
  target_key: string; // key into TARGET_PRESETS
  temp_c: string;     // keep as string for input control
};

function inferStatus(temp: number | null, preset: TargetPreset | undefined): "pass" | "fail" | null {
  if (temp == null || !preset) return null;
  const { minC, maxC } = preset;
  if (minC != null && temp < minC) return "fail";
  if (maxC != null && temp > maxC) return "fail";
  return "pass";
}

export default function FoodTempLogger({ initials: initialsProp, onChange }: Props) {
  const [rows, setRows] = useState<TempLogRow[]>([]);
  const [initials, setInitials] = useState<string[]>(initialsProp ?? []);
  const [form, setForm] = useState<FormState>({
    date: new Date().toISOString().slice(0, 10),
    staff_initials: "",
    location: LOCATION_PRESETS[0] ?? "",
    item: "",
    target_key: TARGET_PRESETS[0]?.key ?? "ambient",
    temp_c: "",
  });

  // load table + initials (only fetch initials if parent didn't provide them)
  useEffect(() => {
    (async () => {
      try {
        const [r, i] = await Promise.all([
          listTempLogs(),
          initialsProp ? Promise.resolve(initialsProp) : listStaffInitials(),
        ]);
        setRows(r ?? []);
        setInitials((i ?? []).filter(Boolean));
      } catch (e) {
        console.error("Logger failed to fetch cloud data:", e);
      }
    })();
  }, [initialsProp]);

  const selectedPreset = TARGET_BY_KEY[form.target_key];

  const canSave =
    !!form.date &&
    !!form.location &&
    !!form.item &&
    !!form.target_key &&
    form.temp_c.trim().length > 0;

  async function handleAddQuick() {
    const tempNum = Number.isFinite(Number(form.temp_c)) ? Number(form.temp_c) : null;
    const status = inferStatus(tempNum, selectedPreset);

    const input: TempLogInput = {
      date: form.date,
      staff_initials: form.staff_initials ? form.staff_initials.toUpperCase() : null,
      location: form.location || null,
      item: form.item || null,
      target_key: form.target_key || null,
      temp_c: tempNum,
      status,
    };

    await upsertTempLog(input);
    const next = await listTempLogs();
    setRows(next ?? []);
    onChange?.(); // let Dashboard refresh KPIs

    // keep most selections; clear item/temp for speed
    setForm((f) => ({ ...f, item: "", temp_c: "" }));
  }

  async function remove(id: string) {
    await deleteTempLog(id);
    setRows((prev) => prev.filter((r) => r.id !== id));
    onChange?.();
  }

  // Enter on temperature should submit
  function onTempKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" && canSave) {
      e.preventDefault();
      handleAddQuick();
    }
  }

  return (
    <div className="space-y-6">
      {/* Quick entry */}
      <div className="rounded-2xl border bg-white p-4 shadow-sm">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4 items-end">
          {/* Date */}
          <div>
            <label className="block text-xs text-gray-500 mb-1">Date</label>
            <input
              type="date"
              value={form.date}
              onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
              className="w-full rounded-xl border px-3 py-2"
            />
          </div>

          {/* Staff (free text with suggestions) */}
          <div>
            <label className="block text-xs text-gray-500 mb-1">Initials</label>
            <input
              list="staff-initials"
              value={form.staff_initials}
              onChange={(e) => setForm((f) => ({ ...f, staff_initials: e.target.value }))}
              placeholder="e.g., AA"
              className="w-full rounded-xl border px-3 py-2 uppercase"
            />
            <datalist id="staff-initials">
              {initials.map((ini) => (
                <option key={ini} value={ini} />
              ))}
            </datalist>
          </div>

          {/* Location (free text with suggestions) */}
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

          {/* Item */}
          <div className="lg:col-span-2">
            <label className="block text-xs text-gray-500 mb-1">Item</label>
            <input
              value={form.item}
              onChange={(e) => setForm((f) => ({ ...f, item: e.target.value }))}
              className="w-full rounded-xl border px-3 py-2"
              placeholder="e.g., Chicken curry"
            />
          </div>

          {/* Target */}
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
                  {p.minC != null || p.maxC != null
                    ? ` (${p.minC ?? "−∞"}–${p.maxC ?? "+∞"} °C)`
                    : ""}
                </option>
              ))}
            </select>
            {/* NOTE: range helper text intentionally removed per request */}
          </div>

          {/* Temperature */}
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
              className={cn(
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
              {rows.length ? (
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
                          ? `${p.label}${
                              p.minC != null || p.maxC != null
                                ? ` (${p.minC ?? "−∞"}–${p.maxC ?? "+∞"} °C)`
                                : ""
                            }`
                          : "—"}
                      </td>
                      <td className="py-2 pr-3">{r.temp_c ?? "—"}</td>
                      <td className="py-2 pr-3">
                        {st ? (
                          <span
                            className={cn(
                              "inline-flex rounded-full px-2 py-0.5 text-xs font-medium",
                              st === "pass"
                                ? "bg-emerald-100 text-emerald-800"
                                : "bg-red-100 text-red-800"
                            )}
                          >
                            {st}
                          </span>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td className="py-2 pr-3">
                        <button
                          onClick={() => remove(r.id)}
                          className="rounded-xl border px-2 py-1 hover:bg-gray-50"
                          aria-label="Delete"
                          title="Delete"
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

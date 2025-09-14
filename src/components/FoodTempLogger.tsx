"use client";

import React, { useEffect, useMemo, useState } from "react";
import { cn } from "@/lib/cn";
import {
  listTempLogs,
  upsertTempLog,
  deleteTempLog,
  listStaffInitials,
  type TempLogInput,
} from "@/app/actions/tempLogs";
import { LOCATION_PRESETS, TARGET_PRESETS } from "@/lib/temp-constants";

type TargetPreset = (typeof TARGET_PRESETS)[number];

type FormState = {
  date: string;
  staff_initials: string;
  location: string;
  item: string;
  target_key: string; // keep string for input control
  temp_c: string; // keep as string for input control
};

type LocalTempRow = {
  id: string;
  date: string | null;
  staff_initials: string | null;
  location: string | null;
  item: string | null;
  target_key: string | null;
  temp_c: number | null;
  status: "pass" | "fail" | null;
};

const LS_KEY = "tt_temp_logs";
const uid = () => Math.random().toString(36).slice(2);
const todayISO = () => new Date().toISOString().slice(0, 10);

function lsGet<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}
function lsSet<T>(key: string, val: T) {
  localStorage.setItem(key, JSON.stringify(val));
}
async function safe<T>(fn: () => Promise<T>): Promise<T | undefined> {
  try {
    return await fn();
  } catch {
    return undefined;
  }
}

function inferStatus(
  temp: number | null,
  preset: TargetPreset | undefined
): "pass" | "fail" | null {
  if (temp == null || !preset) return null;
  const { minC, maxC } = preset;
  if (minC != null && temp < minC) return "fail";
  if (maxC != null && temp > maxC) return "fail";
  return "pass";
}

export default function FoodTempLogger() {
  const [rows, setRows] = useState<LocalTempRow[]>([]);
  const [initials, setInitials] = useState<string[]>([]);
  const [form, setForm] = useState<FormState>({
    date: todayISO(),
    staff_initials: "",
    location: LOCATION_PRESETS[0] ?? "",
    item: "",
    target_key: TARGET_PRESETS[0]?.key ?? "ambient",
    temp_c: "",
  });

  // IMPORTANT: type the map as Map<string, TargetPreset> so any string key is accepted safely.
  const TARGET_MAP = useMemo<Map<string, TargetPreset>>(
    () => new Map(TARGET_PRESETS.map((p) => [p.key as string, p])),
    []
  );

  // Load local first; hydrate from server if available; collect initials from team/local.
  useEffect(() => {
    setRows(lsGet<LocalTempRow[]>(LS_KEY, []));

    (async () => {
      const serverInitials = await safe(() => listStaffInitials());
      let localTeam: string[] = [];
      try {
        const raw = localStorage.getItem("tt_staff");
        if (raw) {
          const staff = JSON.parse(raw) as Array<{ initials?: string | null }>;
          localTeam = staff
            .map((s) => (s.initials ?? "").toString().trim().toUpperCase())
            .filter(Boolean);
        }
      } catch {}
      setInitials(
        Array.from(
          new Set([...(serverInitials ?? []).map((i) => String(i).toUpperCase()), ...localTeam])
        ).sort()
      );
    })();

    (async () => {
      const serverRows = await safe(() => listTempLogs());
      if (serverRows && serverRows.length) {
        const mapped: LocalTempRow[] = serverRows.map((r) => {
          const key = (r.target_key ?? undefined) as string | undefined;
          const preset = key ? TARGET_MAP.get(key) : undefined;
          return {
            id: r.id,
            date: r.date ?? null,
            staff_initials: r.staff_initials ?? null,
            location: r.location ?? null,
            item: r.item ?? null,
            target_key: r.target_key ?? null,
            temp_c: r.temp_c ?? null,
            status: r.status ?? inferStatus(r.temp_c ?? null, preset),
          };
        });
        setRows(mapped);
        lsSet(LS_KEY, mapped);
      }
    })();
  }, [TARGET_MAP]);

  // KPIs based on rows state
  const kpis = React.useMemo(() => {
    const today = todayISO();
    const now = new Date(today + "T00:00:00Z").getTime();
    const sevenDaysAgo = now - 6 * 24 * 60 * 60 * 1000; // include today => 7 days
    let todayCount = 0;
    let sevenDayCount = 0;
    for (const r of rows) {
      if (!r.date) continue;
      if (r.date === today) todayCount++;
      const d = new Date(r.date + "T00:00:00Z").getTime();
      if (d >= sevenDaysAgo && d <= now) sevenDayCount++;
    }
    return { today: todayCount, seven: sevenDayCount };
  }, [rows]);

  const canSave =
    !!form.date &&
    !!form.location &&
    !!form.item &&
    !!form.target_key &&
    form.temp_c.trim().length > 0;

  async function handleAddQuick() {
    const tempNum = Number.isFinite(Number(form.temp_c)) ? Number(form.temp_c) : null;
    const preset = TARGET_MAP.get(form.target_key); // form.target_key is a string: OK
    const status = inferStatus(tempNum, preset);

    const localRow: LocalTempRow = {
      id: uid(),
      date: form.date,
      staff_initials: form.staff_initials || null,
      location: form.location || null,
      item: form.item || null,
      target_key: form.target_key || null,
      temp_c: tempNum,
      status,
    };

    // local-first
    setRows((prev) => {
      const next = [localRow, ...prev];
      lsSet(LS_KEY, next);
      return next;
    });

    // best-effort server
    const payload: TempLogInput = { ...localRow };
    await safe(() => upsertTempLog(payload));

    setForm((f) => ({ ...f, item: "", temp_c: "" }));
  }

  async function remove(id: string) {
    setRows((prev) => {
      const next = prev.filter((r) => r.id !== id);
      lsSet(LS_KEY, next);
      return next;
    });
    await safe(() => deleteTempLog(id));
  }

  function onTempKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" && canSave) {
      e.preventDefault();
      void handleAddQuick();
    }
  }

  return (
    <div className="space-y-6">
      {/* KPIs */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="rounded-2xl border bg-white p-4 shadow-sm">
          <div className="text-xs text-slate-500">Logs today</div>
          <div className="text-3xl font-semibold">{kpis.today}</div>
        </div>
        <div className="rounded-2xl border bg-white p-4 shadow-sm">
          <div className="text-xs text-slate-500">Logs (7 days)</div>
          <div className="text-3xl font-semibold">{kpis.seven}</div>
        </div>
      </div>

      {/* Quick entry */}
      <div className="rounded-2xl border bg-white p-4 shadow-sm">
        <div className="grid grid-cols-2 items-end gap-3 md:grid-cols-6">
          <div>
            <label className="mb-1 block text-xs text-gray-500">Staff (initials)</label>
            <input
              list="staff-initials"
              value={form.staff_initials}
              onChange={(e) =>
                setForm((f) => ({ ...f, staff_initials: e.target.value.trim().toUpperCase() }))
              }
              className="w-full rounded-xl border px-3 py-2"
              placeholder="e.g., WS"
            />
            <datalist id="staff-initials">
              {initials.map((ini) => (
                <option key={ini} value={ini} />
              ))}
            </datalist>
          </div>

          <div>
            <label className="mb-1 block text-xs text-gray-500">Location</label>
            <select
              value={form.location}
              onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))}
              className="w-full rounded-xl border px-3 py-2"
            >
              {LOCATION_PRESETS.map((loc) => (
                <option key={loc} value={loc}>
                  {loc}
                </option>
              ))}
            </select>
          </div>

          <div className="md:col-span-2">
            <label className="mb-1 block text-xs text-gray-500">Item</label>
            <input
              value={form.item}
              onChange={(e) => setForm((f) => ({ ...f, item: e.target.value }))}
              className="w-full rounded-xl border px-3 py-2"
              placeholder="e.g., Chicken curry"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs text-gray-500">Target</label>
            <select
              value={form.target_key}
              onChange={(e) => setForm((f) => ({ ...f, target_key: e.target.value }))}
              className="w-full rounded-xl border px-3 py-2"
            >
              {TARGET_PRESETS.map((p) => (
                <option key={p.key} value={p.key}>
                  {p.label}
                </option>
              ))}
            </select>
            {/* Range text intentionally hidden for a cleaner UI */}
          </div>

          <div>
            <label className="mb-1 block text-xs text-gray-500">Temperature (°C)</label>
            <input
              value={form.temp_c}
              onChange={(e) => setForm((f) => ({ ...f, temp_c: e.target.value }))}
              onKeyDown={onTempKeyDown}
              className="w-full rounded-xl border px-3 py-2"
              inputMode="decimal"
              placeholder="e.g., 5.0"
            />
          </div>

          <div className="md:col-span-6">
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
                  const key = (r.target_key ?? undefined) as string | undefined;
                  const preset = key ? TARGET_MAP.get(key) : undefined;
                  const status = r.status ?? inferStatus(r.temp_c, preset);
                  return (
                    <tr key={r.id} className="border-t">
                      <td className="py-2 pr-3">{r.date ?? "—"}</td>
                      <td className="py-2 pr-3">{r.staff_initials ?? "—"}</td>
                      <td className="py-2 pr-3">{r.location ?? "—"}</td>
                      <td className="py-2 pr-3">{r.item ?? "—"}</td>
                      <td className="py-2 pr-3">{preset ? preset.label : "—"}</td>
                      <td className="py-2 pr-3">{r.temp_c ?? "—"}</td>
                      <td className="py-2 pr-3">
                        {status ? (
                          <span
                            className={cn(
                              "inline-flex rounded-full px-2 py-0.5 text-xs font-medium",
                              status === "pass"
                                ? "bg-emerald-100 text-emerald-800"
                                : "bg-red-100 text-red-800"
                            )}
                          >
                            {status}
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

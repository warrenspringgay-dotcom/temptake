// src/components/FoodTempLogger.tsx
"use client";

import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import {
  LOCATION_PRESETS,
  TARGET_PRESETS,
  TARGET_BY_KEY,
  type TargetPreset,
} from "@/lib/temp-constants";

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

type Routine = {
  id: string;
  name: string | null;
  location: string | null;
  item: string | null;
  target_key: string | null;
};

type Props = {
  initials?: string[];
  locations?: string[];
};

const LS_LAST_INITIALS = "tt_last_initials";
const LS_LAST_LOCATION = "tt_last_location";

function cls(...parts: Array<string | false | undefined>) {
  return parts.filter(Boolean).join(" ");
}
function firstLetter(s: string | null | undefined) {
  return (s?.trim()?.charAt(0) || "").toUpperCase();
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

// resolve org_id to satisfy NOT NULL
async function getOrgId(uid: string): Promise<string | null> {
  try {
    const { data } = await supabase
      .from("team_members")
      .select("org_id, owner_id")
      .eq("user_id", uid)
      .maybeSingle();
    if (data?.org_id) return String(data.org_id);
    if (data?.owner_id) return String(data.owner_id);
  } catch {}

  try {
    const { data } = await supabase.auth.getUser();
    const u = data.user;
    const metaOrg =
      (u?.user_metadata as any)?.org_id ??
      (u?.app_metadata as any)?.org_id ??
      null;
    if (metaOrg) return String(metaOrg);
  } catch {}

  return null;
}

export default function FoodTempLogger({
  initials: initialsSeed,
  locations: locationsSeed,
}: Props) {
  // STATE
  const [rows, setRows] = useState<CanonRow[]>([]);
  const [initials, setInitials] = useState<string[]>(() =>
    Array.from(new Set([...(initialsSeed ?? [])]))
  );
  const [locations, setLocations] = useState<string[]>(() =>
    Array.from(new Set([...(locationsSeed ?? []), ...LOCATION_PRESETS]))
  );
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const [kpi, setKpi] = useState<{ trainingDue: number; allergenDue: number }>({
    trainingDue: 0,
    allergenDue: 0,
  });

  const [routines, setRoutines] = useState<Routine[]>([]);
  const [routineOpen, setRoutineOpen] = useState(false);

  // Entry form
  const [form, setForm] = useState({
    date: new Date().toISOString().slice(0, 10),
    staff_initials: "",
    location: "",
    item: "",
    target_key: (TARGET_PRESETS[0]?.key as string) ?? "chill",
    temp_c: "",
    saveRoutine: false,
  });

  const canSave =
    !!form.date &&
    !!form.location &&
    !!form.item &&
    !!form.target_key &&
    form.temp_c.trim().length > 0;

  // Prefill from LS
  useEffect(() => {
    try {
      const lsIni = localStorage.getItem(LS_LAST_INITIALS) || "";
      const lsLoc = localStorage.getItem(LS_LAST_LOCATION) || "";
      setForm((f) => ({
        ...f,
        staff_initials: lsIni || f.staff_initials,
        location: lsLoc || f.location,
      }));
      if (lsIni) setInitials((prev) => Array.from(new Set([lsIni, ...prev])));
      if (lsLoc) setLocations((prev) => Array.from(new Set([lsLoc, ...prev])));
    } catch {}
  }, []);

  // KPI data
  useEffect(() => {
    (async () => {
      try {
        const soon = new Date();
        soon.setDate(soon.getDate() + 14);

        let trainingDue = 0;
        let allergenDue = 0;

        try {
          const { data } = await supabase.from("team_members").select("*");
          trainingDue = (data ?? []).reduce((acc: number, r: any) => {
            const raw =
              r.training_expires_at ?? r.training_expiry ?? r.expires_at ?? null;
            if (!raw) return acc;
            const d = new Date(raw);
            return isNaN(d.getTime()) ? acc : d <= soon ? acc + 1 : acc;
          }, 0);
        } catch {}

        try {
          const { data } = await supabase.from("allergen_reviews").select("*");
          allergenDue = (data ?? []).reduce((acc: number, r: any) => {
            const raw =
              r.next_due ?? r.next_review_due ?? r.due_at ?? r.review_due ?? null;
            if (!raw) return acc;
            const d = new Date(raw);
            return isNaN(d.getTime()) ? acc : d <= soon ? acc + 1 : acc;
          }, 0);
        } catch {}

        setKpi({ trainingDue, allergenDue });
      } catch {
        setKpi({ trainingDue: 0, allergenDue: 0 });
      }
    })();
  }, []);

  // Load initials
  useEffect(() => {
    (async () => {
      const { data: tm } = await supabase.from("team_members").select("*");
      const fromDb =
        (tm ?? [])
          .map(
            (r: any) =>
              r.initials?.toString().toUpperCase() ||
              firstLetter(r.name) ||
              firstLetter(r.email)
          )
          .filter(Boolean) || [];
      const merged = Array.from(
        new Set([...(initialsSeed ?? []), ...fromDb, ...initials])
      );
      if (merged.length) setInitials(merged);
      if (!form.staff_initials && merged[0]) {
        setForm((f) => ({ ...f, staff_initials: merged[0] }));
      }
    })();
  }, [initialsSeed]); // eslint-disable-line

  // Load locations
  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("food_temp_logs")
        .select("area, location");
      const fromAreas =
        (data ?? [])
          .map((r: any) => (r.area ?? r.location ?? "").toString().trim())
          .filter((s: string) => s.length > 0) || [];
      const merged = Array.from(
        new Set([
          ...(locationsSeed ?? []),
          ...LOCATION_PRESETS,
          ...fromAreas,
          ...locations,
        ])
      );
      setLocations(merged.length ? merged : ["Kitchen"]);
      if (!form.location && merged[0]) {
        setForm((f) => ({ ...f, location: merged[0] }));
      }
    })();
  }, [locationsSeed]); // eslint-disable-line

  // Rows
  useEffect(() => {
    (async () => {
      setLoading(true);
      setErr(null);
      try {
        const { data } = await supabase
          .from("food_temp_logs")
          .select("*")
          .order("at", { ascending: false })
          .limit(200);
        const normalized: CanonRow[] = (data ?? []).map((r: any) => ({
          id: String(r.id ?? crypto.randomUUID()),
          date: toISODate(r.at ?? r.date ?? r.created_at ?? null),
          staff_initials:
            (r.staff_initials ?? r.initials ?? null)?.toString() ?? null,
          location: (r.area ?? r.location ?? null)?.toString() ?? null,
          item: (r.note ?? r.item ?? null)?.toString() ?? null,
          target_key: r.target_key != null ? String(r.target_key) : null,
          temp_c: r.temp_c != null ? Number(r.temp_c) : null,
          status: r.status,
        }));
        setRows(normalized);
      } catch (e: any) {
        setErr(e?.message || "Failed to fetch logs.");
        setRows([]);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  async function refreshRows() {
    const { data } = await supabase
      .from("food_temp_logs")
      .select("*")
      .order("at", { ascending: false })
      .limit(200);
    const normalized: CanonRow[] = (data ?? []).map((r: any) => ({
      id: String(r.id ?? crypto.randomUUID()),
      date: toISODate(r.at ?? r.date ?? r.created_at ?? null),
      staff_initials:
        (r.staff_initials ?? r.initials ?? null)?.toString() ?? null,
      location: (r.area ?? r.location ?? null)?.toString() ?? null,
      item: (r.note ?? r.item ?? null)?.toString() ?? null,
      target_key: r.target_key != null ? String(r.target_key) : null,
      temp_c: r.temp_c != null ? Number(r.temp_c) : null,
      status: r.status,
    }));
    setRows(normalized);
  }

  async function upsertRoutineIfChecked() {
    if (!form.saveRoutine) return;
    const uid = await getUid();
    const orgId = (await getOrgId(uid)) ?? uid;

    const autoName = `${form.location || "Location"} • ${
      form.item || "Item"
    } • ${form.target_key}`;

    const payload = {
      created_by: uid,
      org_id: orgId,
      name: autoName,
      location: form.location || null,
      item: form.item || null,
      target_key: form.target_key || null,
      last_used_at: new Date().toISOString(),
    };

    await supabase.from("temp_routines").upsert(payload, {
      onConflict: "created_by,location,item,target_key",
    });

    loadRoutines();
  }

  async function handleAddQuick() {
    const uid = await getUid();
    const orgId = (await getOrgId(uid)) ?? uid;

    const tempNum = Number.isFinite(Number(form.temp_c))
      ? Number(form.temp_c)
      : null;

    const preset =
      form.target_key && form.target_key in TARGET_BY_KEY
        ? (TARGET_BY_KEY as Record<string, TargetPreset>)[form.target_key]
        : undefined;
    const status = inferStatus(tempNum, preset);

    const payload = {
      created_by: uid,
      org_id: orgId,
      at: form.date,
      area: form.location || null,
      note: form.item || null,
      staff_initials: form.staff_initials
        ? form.staff_initials.toUpperCase()
        : null,
      target_key: form.target_key || null,
      temp_c: tempNum,
      status,
    };

    const { error } = await supabase.from("food_temp_logs").insert(payload);
    if (error) {
      alert(`Save failed: ${error.message}`);
      return;
    }

    await upsertRoutineIfChecked();

    try {
      if (form.staff_initials)
        localStorage.setItem(LS_LAST_INITIALS, form.staff_initials);
      if (form.location) localStorage.setItem(LS_LAST_LOCATION, form.location);
    } catch {}

    setForm((f) => ({ ...f, item: "", temp_c: "" }));
    await refreshRows();
  }

  function onTempKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" && canSave) {
      e.preventDefault();
      handleAddQuick();
    }
  }

  function pickRoutine(r: Routine) {
    setForm((f) => ({
      ...f,
      location: r.location || f.location,
      item: r.item || f.item,
      target_key: (r.target_key as string) || f.target_key,
    }));
    setRoutineOpen(false);
  }

  const routineList = useMemo(() => routines, [routines]);

  async function loadRoutines() {
    const { data } = await supabase
      .from("temp_routines")
      .select("id, name, location, item, target_key")
      .order("last_used_at", { ascending: false })
      .limit(100);
    setRoutines((data ?? []) as Routine[]);
  }
  useEffect(() => {
    loadRoutines();
  }, []);

  // RENDER
  return (
    <div className="space-y-6">
      {/* KPI card WITH tiles + smaller pills inside */}
      <div className="rounded-2xl border bg-white p-4 shadow-sm space-y-4">
        {/* KPI Tiles */}
        {(() => {
          const todayISO = new Date().toISOString().slice(0, 10);
          const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 3600 * 1000);
          const within7 = (d: string | null) =>
            d ? new Date(d) >= sevenDaysAgo : false;
          const entriesToday = rows.filter((r) => r.date === todayISO).length;
          const last7 = rows.filter((r) => within7(r.date)).length;
          const failures7 = rows.filter(
            (r) => within7(r.date) && r.status === "fail"
          ).length;
          const locations7 = new Set(
            rows.filter((r) => within7(r.date)).map((r) => r.location || "")
          ).size;

          return (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-xl border bg-white p-3">
                <div className="text-xs text-gray-500">Entries today</div>
                <div className="text-2xl font-semibold">{entriesToday}</div>
              </div>
              <div className="rounded-xl border bg-white p-3">
                <div className="text-xs text-gray-500">Last 7 days</div>
                <div className="text-2xl font-semibold">{last7}</div>
              </div>
              <div className="rounded-xl border bg-white p-3">
                <div className="text-xs text-gray-500">Failures (7d)</div>
                <div className="text-2xl font-semibold">{failures7}</div>
              </div>
              <div className="rounded-xl border bg-white p-3">
                <div className="text-xs text-gray-500">Locations (7d)</div>
                <div className="text-2xl font-semibold">{locations7}</div>
              </div>
            </div>
          );
        })()}

        {/* Review pills inside same card (smaller) */}
        <div className="flex flex-col gap-1.5">
          <a
            href="/team"
            className={cls(
              kpi.trainingDue > 0
                ? "bg-red-100 text-red-800"
                : "bg-emerald-100 text-emerald-800",
              "inline-flex items-center justify-between rounded-full px-2 py-0.5 text-xs"
            )}
            title="View team training"
          >
            <span className="font-medium">Training</span>
            <span className="ml-2 inline-block rounded-full bg-white/60 px-1.5 py-px text-[10px]">
              {kpi.trainingDue > 0 ? `${kpi.trainingDue} due` : "OK"}
            </span>
          </a>

          <a
            href="/allergens"
            className={cls(
              kpi.allergenDue > 0
                ? "bg-red-100 text-red-800"
                : "bg-emerald-100 text-emerald-800",
              "inline-flex items-center justify-between rounded-full px-2 py-0.5 text-xs"
            )}
            title="View allergen reviews"
          >
            <span className="font-medium">Allergen Review</span>
            <span className="ml-2 inline-block rounded-full bg-white/60 px-1.5 py-px text-[10px]">
              {kpi.allergenDue > 0 ? `${kpi.allergenDue} due` : "OK"}
            </span>
          </a>
        </div>
      </div>

      {/* ENTRY FORM */}
      <div className="rounded-2xl border bg-white p-4 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Enter Temperature Log</h2>
          <button
            type="button"
            onClick={() => setRoutineOpen(true)}
            className="rounded-lg border px-3 py-1.5 text-sm hover:bg-gray-50"
            title="Use routine"
          >
            Use routine
          </button>
        </div>

        {err && (
          <div className="mb-3 rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
            {err}
          </div>
        )}

        <div className="grid grid-cols-1 items-end gap-4 sm:grid-cols-2 lg:grid-cols-6">
          <div>
            <label className="mb-1 block text-xs text-gray-500">Date</label>
            <input
              type="date"
              value={form.date}
              onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
              className="w-full rounded-xl border px-3 py-2"
            />
          </div>

          {/* Initials: SELECT (prefilled) */}
          <div>
            <label className="mb-1 block text-xs text-gray-500">Initials</label>
            <select
              value={form.staff_initials}
              onChange={(e) => {
                const v = e.target.value.toUpperCase();
                setForm((f) => ({ ...f, staff_initials: v }));
                try {
                  localStorage.setItem(LS_LAST_INITIALS, v);
                } catch {}
              }}
              className="w-full rounded-xl border px-3 py-2 uppercase"
            >
              {!form.staff_initials && initials.length === 0 && (
                <option value="" disabled>
                  Loading initials…
                </option>
              )}
              {initials.map((ini) => (
                <option key={ini} value={ini}>
                  {ini}
                </option>
              ))}
            </select>
          </div>

          {/* Location: SELECT (prefilled) */}
          <div>
            <label className="mb-1 block text-xs text-gray-500">Location</label>
            <select
              value={form.location}
              onChange={(e) => {
                const v = e.target.value;
                setForm((f) => ({ ...f, location: v }));
                try {
                  localStorage.setItem(LS_LAST_LOCATION, v);
                } catch {}
              }}
              className="w-full rounded-xl border px-3 py-2"
            >
              {!form.location && locations.length === 0 && (
                <option value="" disabled>
                  Loading locations…
                </option>
              )}
              {locations.map((loc) => (
                <option key={loc} value={loc}>
                  {loc}
                </option>
              ))}
            </select>
          </div>

          <div className="lg:col-span-2">
            <label className="mb-1 block text-xs text-gray-500">Item</label>
            <input
              value={form.item}
              onChange={(e) =>
                setForm((f) => ({ ...f, item: e.target.value }))
              }
              className="w-full rounded-xl border px-3 py-2"
              placeholder="e.g., Chicken curry"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs text-gray-500">Target</label>
            <select
              value={form.target_key}
              onChange={(e) =>
                setForm((f) => ({ ...f, target_key: e.target.value }))
              }
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
          </div>

          <div>
            <label className="mb-1 block text-xs text-gray-500">
              Temp (°C)
            </label>
            <input
              value={form.temp_c}
              onChange={(e) =>
                setForm((f) => ({ ...f, temp_c: e.target.value }))
              }
              onKeyDown={onTempKeyDown}
              className="w-full rounded-xl border px-3 py-2"
              inputMode="decimal"
              placeholder="e.g., 5.0"
            />
          </div>

          {/* Save first, then checkbox */}
          <div className="lg:col-span-6 flex items-center gap-3">
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

            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={form.saveRoutine}
                onChange={(e) =>
                  setForm((f) => ({ ...f, saveRoutine: e.target.checked }))
                }
              />
              Save as routine
            </label>
          </div>
        </div>
      </div>

      {/* Routine picker */}
      {routineOpen && (
        <div
          className="fixed inset-0 z-[100] bg-black/30"
          role="dialog"
          aria-modal="true"
          onClick={() => setRoutineOpen(false)}
        >
          <div
            className="absolute inset-x-0 top-20 mx-auto w-full max-w-lg rounded-xl border bg-white p-4 shadow-sm"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-base font-semibold">Use a routine</h3>
              <button
                onClick={() => setRoutineOpen(false)}
                className="rounded-md p-2 hover:bg-gray-100"
                aria-label="Close"
              >
                ✕
              </button>
            </div>

            {routineList.length === 0 ? (
              <div className="text-sm text-gray-600">
                No routines yet. Tick <b>Save as routine</b> when you save a log
                to add one.
              </div>
            ) : (
              <ul className="divide-y">
                {routineList.map((r) => (
                  <li key={r.id} className="py-2">
                    <button
                      className="w-full rounded-md px-2 py-2 text-left hover:bg-gray-50"
                      onClick={() => pickRoutine(r)}
                    >
                      <div className="text-sm font-medium">
                        {r.name ??
                          `${r.location ?? "—"} • ${r.item ?? "—"} • ${
                            r.target_key ?? "—"
                          }`}
                      </div>
                      <div className="text-xs text-gray-600">
                        {r.location ?? "—"} · {r.item ?? "—"} ·{" "}
                        {r.target_key ?? "—"}
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}

      {/* Logs table */}
      <div className="rounded-2xl border bg-white p-4 shadow-sm">
        <h2 className="mb-4 text-lg font-semibold">Temperature Logs</h2>
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
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-6 text-center text-gray-500">
                    Loading…
                  </td>
                </tr>
              ) : rows.length ? (
                rows.map((r) => {
                  const preset =
                    r.target_key &&
                    (TARGET_BY_KEY as Record<string, TargetPreset>)[r.target_key];
                  const st = r.status ?? inferStatus(r.temp_c, preset);
                  return (
                    <tr key={r.id} className="border-t">
                      <td className="py-2 pr-3">{r.date ?? "—"}</td>
                      <td className="py-2 pr-3">{r.staff_initials ?? "—"}</td>
                      <td className="py-2 pr-3">{r.location ?? "—"}</td>
                      <td className="py-2 pr-3">{r.item ?? "—"}</td>
                      <td className="py-2 pr-3">
                        {preset
                          ? `${preset.label}${
                              preset.minC != null || preset.maxC != null
                                ? ` (${preset.minC ?? "−∞"}–${
                                    preset.maxC ?? "+∞"
                                  } °C)`
                                : ""
                            }`
                          : "—"}
                      </td>
                      <td className="py-2 pr-3">{r.temp_c ?? "—"}</td>
                      <td className="py-2 pr-3">
                        {st ? (
                          <span
                            className={cls(
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
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={7} className="py-6 text-center text-gray-500">
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

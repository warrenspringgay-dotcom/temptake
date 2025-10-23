// src/components/FoodTempLogger.tsx
"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabaseBrowser";
import { getActiveOrgIdClient } from "@/lib/orgClient";
import {
  LOCATION_PRESETS,
  TARGET_PRESETS,
  TARGET_BY_KEY,
  type TargetPreset,
} from "@/lib/temp-constants";
import RoutinePickerModal, { type RoutineRow } from "@/components/RoutinePickerModal";
import RoutineRunModal from "@/components/RoutineRunModal";
/* ================== Types ================== */
type CanonRow = {
  id: string;
  date: string | null; // yyyy-mm-dd
  staff_initials: string | null;
  location: string | null;
  item: string | null;
  target_key: string | null;
  temp_c: number | null;
  status: "pass" | "fail" | null;
};

type Props = {
  initials?: string[];
  locations?: string[];
};

/* ================== Helpers ================== */
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
  const d = new Date(val);
  if (isNaN(d.getTime())) return null;
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
function formatDDMMYYYY(iso: string | null) {
  if (!iso) return "—";
  const [y, m, d] = iso.split("-");
  if (!y || !m || !d) return iso;
  return `${d}/${m}/${y}`;
}
function inferStatus(temp: number | null, preset?: TargetPreset): "pass" | "fail" | null {
  if (temp == null || !preset) return null;
  const { minC, maxC } = preset;
  if (minC != null && temp < minC) return "fail";
  if (maxC != null && temp > maxC) return "fail";
  return "pass";
}
function normalizeRowsFromFood(data: any[]): CanonRow[] {
  return data.map((r) => {
    const temp =
      typeof r.temp_c === "number"
        ? r.temp_c
        : r.temp_c != null
        ? Number(r.temp_c)
        : null;

    return {
      id: String(r.id ?? crypto.randomUUID()),
      date: toISODate(r.at ?? r.created_at ?? null),
      staff_initials: (r.staff_initials ?? r.initials ?? null)?.toString() ?? null,
      location: (r.area ?? r.location ?? null)?.toString() ?? null,
      item: (r.note ?? r.item ?? null)?.toString() ?? null,
      target_key: r.target_key != null ? String(r.target_key) : null,
      temp_c: temp,
      status: (r.status as any) ?? null,
    };
  });
}

/* ================== Component ================== */
export default function FoodTempLogger({
  initials: initialsSeed = [],
  locations: locationsSeed = [],
}: Props) {
  const search = useSearchParams();

const [showPicker, setShowPicker] = useState(false);
const [runRoutine, setRunRoutine] = useState<RoutineRow | null>(null);

  // DATA
  const [rows, setRows] = useState<CanonRow[]>([]);
  const [initials, setInitials] = useState<string[]>(() =>
    Array.from(new Set([...initialsSeed]))
  );
  const [locations, setLocations] = useState<string[]>(() =>
    Array.from(new Set([...locationsSeed, ...LOCATION_PRESETS]))
  );
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  // KPIs (training & allergen due)
  const [kpi, setKpi] = useState({ trainingDue: 0, allergenDue: 0 });

  // ENTRY FORM
  const [formOpen, setFormOpen] = useState(true);
  const [form, setForm] = useState({
    date: new Date().toISOString().slice(0, 10),
    staff_initials: "",
    location: "",
    item: "",
    target_key: (TARGET_PRESETS[0]?.key as string) ?? "chill",
    temp_c: "",
  });

  // Routine picker
  const [routineModal, setRoutineModal] = useState(false);

  const canSave =
    !!form.date &&
    !!form.location &&
    !!form.item &&
    !!form.target_key &&
    form.temp_c.trim().length > 0;

  /* ---------- prime from localStorage ---------- */
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

  /* ---------- initials list (org-scoped) ---------- */
  useEffect(() => {
    (async () => {
      try {
        const orgId = await getActiveOrgIdClient();
        if (!orgId) return;

        const { data: tm } = await supabase
          .from("team_members")
          .select("initials,name,email")
          .eq("org_id", orgId)
          .order("initials", { ascending: true });

        const fromDb =
          (tm ?? [])
            .map(
              (r: any) =>
                r.initials?.toString().toUpperCase() ||
                firstLetter(r.name) ||
                firstLetter(r.email)
            )
            .filter(Boolean) || [];

        const merged = Array.from(new Set([...initialsSeed, ...fromDb]));
        if (merged.length) setInitials(merged);
        if (!form.staff_initials && merged[0]) {
          setForm((f) => ({ ...f, staff_initials: merged[0] }));
        }
      } catch {}
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialsSeed]);

  /* ---------- locations list (org-scoped) ---------- */
  useEffect(() => {
    (async () => {
      try {
        const orgId = await getActiveOrgIdClient();
        if (!orgId) {
          const base = Array.from(new Set([...locationsSeed, ...LOCATION_PRESETS]));
          setLocations(base.length ? base : ["Kitchen"]);
          if (!form.location) setForm((f) => ({ ...f, location: base[0] || "Kitchen" }));
          return;
        }

        const { data } = await supabase
          .from("food_temp_logs")
          .select("area")
          .eq("org_id", orgId)
          .order("area", { ascending: true });

        const fromAreas =
          (data ?? [])
            .map((r: any) => (r.area ?? "").toString().trim())
            .filter((s: string) => s.length > 0) || [];

        const merged = Array.from(
          new Set([...locationsSeed, ...LOCATION_PRESETS, ...fromAreas])
        );
        setLocations(merged.length ? merged : ["Kitchen"]);
        if (!form.location) setForm((f) => ({ ...f, location: merged[0] || "Kitchen" }));
      } catch {
        const base = Array.from(new Set([...locationsSeed, ...LOCATION_PRESETS]));
        setLocations(base.length ? base : ["Kitchen"]);
        if (!form.location) setForm((f) => ({ ...f, location: base[0] || "Kitchen" }));
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [locationsSeed]);

  /* ---------- KPI fetch (best-effort) ---------- */
  useEffect(() => {
    (async () => {
      try {
        const orgId = await getActiveOrgIdClient();
        if (!orgId) return;

        const soon = new Date();
        soon.setDate(soon.getDate() + 14);

        let trainingDue = 0;
        let allergenDue = 0;

        try {
          const { data } = await supabase
            .from("team_members")
            .select("training_expires_at,training_expiry,expires_at")
            .eq("org_id", orgId);
          trainingDue = (data ?? []).reduce((acc: number, r: any) => {
            const raw = r.training_expires_at ?? r.training_expiry ?? r.expires_at ?? null;
            if (!raw) return acc;
            const d = new Date(raw);
            return isNaN(d.getTime()) ? acc : d <= soon ? acc + 1 : acc;
          }, 0);
        } catch {}

        try {
          const { data } = await supabase
            .from("allergen_review")
            .select("last_reviewed,interval_days")
            .eq("org_id", orgId);

          allergenDue = (data ?? []).reduce((acc: number, r: any) => {
            const last = r.last_reviewed ? new Date(r.last_reviewed) : null;
            const interval = Number(r.interval_days ?? 0);
            if (!last || !Number.isFinite(interval)) return acc;
            const due = new Date(last);
            due.setDate(due.getDate() + interval);
            return due <= soon ? acc + 1 : acc;
          }, 0);
        } catch {}

        setKpi({ trainingDue, allergenDue });
      } catch {}
    })();
  }, []);

  /* ---------- rows (org-scoped) ---------- */
  async function loadRows() {
    setLoading(true);
    setErr(null);
    try {
      const orgId = await getActiveOrgIdClient();
      if (!orgId) {
        setRows([]);
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from("food_temp_logs")
        .select("*")
        .eq("org_id", orgId)
        .order("at", { ascending: false })
        .limit(300);

      if (error) throw error;
      setRows(normalizeRowsFromFood(data ?? []));
    } catch (e: any) {
      setErr(e?.message || "Failed to fetch logs.");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadRows();
  }, []);

  async function refreshRows() {
    await loadRows();
  }

  /* ---------- auto-apply routine when arriving with ?r=<routine_id> ---------- */
  useEffect(() => {
    const rid = search.get("r");
    if (!rid) return;

    (async () => {
      try {
        const { data, error } = await supabase
          .from("temp_routine_items")
          .select("position,location,item,target_key")
          .eq("routine_id", rid);
        if (error) throw error;

        const first = (data ?? [])
          .map((it: any) => ({
            position: Number(it.position ?? 0),
            location: it.location ?? "",
            item: it.item ?? "",
            target_key: it.target_key ?? "chill",
          }))
          .sort((a, b) => a.position - b.position)[0];

        if (first) {
          setForm((f) => ({
            ...f,
            location: first.location || f.location,
            item: first.item || f.item,
            target_key: first.target_key || f.target_key,
          }));
        }
      } catch {
        /* no-op */
      }
    })();
    // run once on mount (query param doesn't change without nav)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ---------- saving one entry (with org_id + status) ---------- */
  async function handleAddQuick() {
    const tempNum = Number.isFinite(Number(form.temp_c)) ? Number(form.temp_c) : null;
    const preset = (TARGET_BY_KEY as Record<string, TargetPreset | undefined>)[form.target_key];
    const status: "pass" | "fail" | null = inferStatus(tempNum, preset);

    const org_id = await getActiveOrgIdClient();
    if (!org_id) {
      alert("No organisation found for this user.");
      return;
    }

    const payload = {
      org_id,
      at: form.date, // YYYY-MM-DD is acceptable for timestamptz
      area: form.location || null,
      note: form.item || null,
      staff_initials: form.staff_initials ? form.staff_initials.toUpperCase() : null,
      target_key: form.target_key || null,
      temp_c: tempNum,
      status,
    };

    const { error } = await supabase.from("food_temp_logs").insert(payload);
    if (error) {
      alert(`Save failed: ${error.message}`);
      return;
    }

    try {
      if (form.staff_initials) localStorage.setItem(LS_LAST_INITIALS, form.staff_initials);
      if (form.location) localStorage.setItem(LS_LAST_LOCATION, form.location);
    } catch {}

    setForm((f) => ({ ...f, item: "", temp_c: "" }));
    await refreshRows();
  }

  const onTempKeyDown: React.KeyboardEventHandler<HTMLInputElement> = (e) => {
    if (e.key === "Enter" && canSave) {
      e.preventDefault();
      handleAddQuick();
    }
  };

  /* ---------- grouped rows by date ---------- */
  const grouped = useMemo(() => {
    const map = new Map<string, CanonRow[]>();
    for (const r of rows) {
      const key = r.date ?? "—";
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(r);
    }
    return Array.from(map.entries())
      .sort((a, b) => (a[0] < b[0] ? 1 : -1))
      .map(([date, list]) => ({ date, list }));
  }, [rows]);

  /* ================== Render ================== */
  return (
    <div className="space-y-6">
      {/* KPI grid + pills */}
      <div className="space-y-4 rounded-2xl border bg-white p-4 shadow-sm">
        {(() => {
          const todayISO = new Date().toISOString().slice(0, 10);
          const since = new Date(Date.now() - 7 * 24 * 3600 * 1000);
          const in7d = (d: string | null) => (d ? new Date(d) >= since : false);

          const entriesToday = rows.filter((r) => r.date === todayISO).length;
          const last7 = rows.filter((r) => in7d(r.date)).length;
          const fails7 = rows.filter((r) => in7d(r.date) && r.status === "fail").length;
          const loc7 = new Set(rows.filter((r) => in7d(r.date)).map((r) => r.location || "")).size;

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
                <div className="text-2xl font-semibold">{fails7}</div>
              </div>
              <div className="rounded-xl border bg-white p-3">
                <div className="text-xs text-gray-500">Locations (7d)</div>
                <div className="text-2xl font-semibold">{loc7}</div>
              </div>
            </div>
          );
        })()}

        <div className="flex flex-wrap gap-2">
          <a
            href="/team"
            className={cls(
              kpi.trainingDue > 0 ? "bg-red-100 text-red-800" : "bg-emerald-100 text-emerald-800",
              "inline-flex items-center justify-between rounded-full px-2 py-[3px] text-xs max-w-fit"
            )}
            title="View team training"
          >
            <span className="font-medium">Training</span>
            <span className="ml-2 inline-block rounded-full bg-white/60 px-1.5 py-[1px] text-[11px] leading-none">
              {kpi.trainingDue > 0 ? `${kpi.trainingDue} due` : "OK"}
            </span>
          </a>

          <a
            href="/allergens"
            className={cls(
              kpi.allergenDue > 0 ? "bg-red-100 text-red-800" : "bg-emerald-100 text-emerald-800",
              "inline-flex items-center justify-between rounded-full px-2 py-[3px] text-xs max-w-fit"
            )}
            title="View allergen reviews"
          >
            <span className="font-medium">Allergen Review</span>
            <span className="ml-2 inline-block rounded-full bg-white/60 px-1.5 py-[1px] text-[11px] leading-none">
              {kpi.allergenDue > 0 ? `${kpi.allergenDue} due` : "OK"}
            </span>
          </a>
        </div>

        {err && (
          <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
            {err}
          </div>
        )}
      </div>

      {/* ENTRY FORM */}
      <div className="rounded-2xl border bg-white p-4 shadow-sm">
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <h2 className="text-lg font-semibold">Enter Temperature Log</h2>
          <div className="ml-auto flex items-center gap-2">
           <button
  type="button"
  onClick={() => setShowPicker(true)}
  className="rounded-xl border px-3 py-1.5 text-sm hover:bg-gray-50"
  title="Pick a routine"
>
  Use routine
</button>

            <button
              type="button"
              onClick={() => setFormOpen((v) => !v)}
              className="flex items-center gap-1 rounded-xl border px-3 py-1.5 text-sm hover:bg-gray-50"
              title="Hide or show entry form"
              aria-expanded={formOpen}
            >
              {formOpen ? "Hide" : "Show"}
              <span className={`transition-transform ${formOpen ? "rotate-180" : ""}`}>▾</span>
            </button>
          </div>
        </div>

        {formOpen && (
          <div className="grid grid-cols-1 items-end gap-4 sm:grid-cols-2 lg:grid-cols-6">
            <div>
              <label className="mb-1 block text-xs text-gray-500">Date</label>
              <input
                type="date"
                value={form.date}
                onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
                className="h-10 w-full rounded-xl border px-3 py-2"
              />
            </div>

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
                className="h-10 w-full rounded-xl border px-3 py-2 uppercase"
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
                className="h-10 w-full rounded-xl border px-3 py-2"
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
                onChange={(e) => setForm((f) => ({ ...f, item: e.target.value }))}
                className="h-10 w-full rounded-xl border px-3 py-2"
                placeholder="e.g., Chicken curry"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs text-gray-500">Target</label>
              <select
                value={form.target_key}
                onChange={(e) => setForm((f) => ({ ...f, target_key: e.target.value }))}
                className="h-10 w-full rounded-xl border px-3 py-2"
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
              <label className="mb-1 block text-xs text-gray-500">Temp (°C)</label>
              <input
                value={form.temp_c}
                onChange={(e) => setForm((f) => ({ ...f, temp_c: e.target.value }))}
                onKeyDown={onTempKeyDown}
                className="h-10 w-full rounded-xl border px-3 py-2"
                inputMode="decimal"
                placeholder="e.g., 5.0"
              />
            </div>

            <div className="lg:col-span-6">
              <button
                onClick={handleAddQuick}
                disabled={!canSave}
                className={cls(
                  "rounded-2xl px-4 py-2 text-sm font-medium text-white",
                  canSave ? "bg-black hover:bg-gray-900" : "bg-gray-400"
                )}
              >
                Save quick entry
              </button>
            </div>
          </div>
        )}
      </div>

    <RoutinePickerModal
  open={routineModal}
  onClose={() => setRoutineModal(false)}
  onApply={(r) => {
    const first = (r.items ?? []).slice().sort((a, b) => (a.position ?? 0) - (b.position ?? 0))[0];
    if (first) {
      setForm((f) => ({
        ...f,
        location: first.location ?? f.location,
        item: first.item ?? f.item,
        target_key: first.target_key ?? f.target_key,
      }));
    }
    setRoutineModal(false);
  }}
/>
<RoutinePickerModal
  open={showPicker}
  onClose={()=>setShowPicker(false)}
  onPick={(r) => { setShowPicker(false); setRunRoutine(r); }}
/>

<RoutineRunModal
  open={!!runRoutine}
  routine={runRoutine}
  defaultDate={form.date}
  defaultInitials={form.staff_initials}
  onClose={()=>setRunRoutine(null)}
  onSaved={refreshRows}
/>

      {/* LOGS TABLE */}
      <div className="rounded-2xl border bg-white p-4 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Temperature Logs</h2>
          <button
            onClick={refreshRows}
            className="rounded-xl border px-3 py-1.5 text-sm hover:bg-gray-50"
          >
            Refresh
          </button>
        </div>
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
              ) : grouped.length ? (
                grouped.map((g) => (
                  <React.Fragment key={g.date}>
                    <tr className="border-t bg-gray-50/70">
                      <td colSpan={7} className="py-2 px-2 text-xs font-medium text-gray-700">
                        {formatDDMMYYYY(g.date)}
                      </td>
                    </tr>
                    {g.list.map((r) => {
                      const preset: TargetPreset | undefined =
                        r.target_key
                          ? (TARGET_BY_KEY as Record<string, TargetPreset | undefined>)[r.target_key]
                          : undefined;
                      const st: "pass" | "fail" | null = r.status ?? inferStatus(r.temp_c, preset);
                      return (
                        <tr key={r.id} className="border-t">
                          <td className="py-2 pr-3">{/* grouped date header */}</td>
                          <td className="py-2 pr-3">{r.staff_initials ?? "—"}</td>
                          <td className="py-2 pr-3">{r.location ?? "—"}</td>
                          <td className="py-2 pr-3">{r.item ?? "—"}</td>
                          <td className="py-2 pr-3">
                            {preset
                              ? `${preset.label}${
                                  preset.minC != null || preset.maxC != null
                                    ? ` (${preset.minC ?? "−∞"}–${preset.maxC ?? "+∞"} °C)`
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
                    })}
                  </React.Fragment>
                ))
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

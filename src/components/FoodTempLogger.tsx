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

/* ----------------------------- Types & Utils ----------------------------- */

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
  last_used_at?: string | null;
};

type Props = { initials?: string[]; locations?: string[] };

const LS_LAST_INITIALS = "tt_last_initials";
const LS_LAST_LOCATION = "tt_last_location";

const cls = (...p: Array<string | false | undefined>) => p.filter(Boolean).join(" ");
const firstLetter = (s?: string | null) => (s?.trim()?.charAt(0) || "").toUpperCase();
function toISODate(v: any): string | null {
  if (!v) return null;
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return null;
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate(),
  ).padStart(2, "0")}`;
}
const ddmmyyyy = (iso?: string | null) => {
  if (!iso) return "—";
  const [y, m, d] = iso.split("-");
  return d && m && y ? `${d}/${m}/${y}` : iso;
};
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
async function getOrgId(): Promise<string | null> {
  try {
    const { data: userRes } = await supabase.auth.getUser();
    const uid = userRes.user?.id;
    if (!uid) return null;

    const { data: tm } = await supabase
      .from("team_members")
      .select("org_id, owner_id")
      .eq("user_id", uid)
      .maybeSingle();

    if (tm?.org_id) return String(tm.org_id);
    if (tm?.owner_id) return String(tm.owner_id);

    const metaOrg =
      (userRes.user?.user_metadata as any)?.org_id ??
      (userRes.user?.app_metadata as any)?.org_id ??
      null;

    return metaOrg ? String(metaOrg) : null;
  } catch {
    return null;
  }
}

/* ------------------------------- Component -------------------------------- */

export default function FoodTempLogger({ initials: initialsSeed, locations: locationsSeed }: Props) {
  const [rows, setRows] = useState<CanonRow[]>([]);
  const [initials, setInitials] = useState<string[]>(() => Array.from(new Set([...(initialsSeed ?? [])])));
  const [locations, setLocations] = useState<string[]>(() =>
    Array.from(new Set([...(locationsSeed ?? []), ...LOCATION_PRESETS])),
  );
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const [kpi, setKpi] = useState({ trainingDue: 0, allergenDue: 0 });

  const [routines, setRoutines] = useState<Routine[]>([]);
  const [routinePickerOpen, setRoutinePickerOpen] = useState(false);
  const [routineManagerOpen, setRoutineManagerOpen] = useState(false);
  const [formOpen, setFormOpen] = useState(true);

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
    !!form.date && !!form.location && !!form.item && !!form.target_key && form.temp_c.trim().length > 0;

  /* ------------------------------ Bootstrap -------------------------------- */

  useEffect(() => {
    try {
      const lsIni = localStorage.getItem(LS_LAST_INITIALS) || "";
      const lsLoc = localStorage.getItem(LS_LAST_LOCATION) || "";
      setForm((f) => ({ ...f, staff_initials: lsIni || f.staff_initials, location: lsLoc || f.location }));
      if (lsIni) setInitials((prev) => Array.from(new Set([lsIni, ...prev])));
      if (lsLoc) setLocations((prev) => Array.from(new Set([lsLoc, ...prev])));
    } catch {}
  }, []);

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
            const raw = r.training_expires_at ?? r.training_expiry ?? r.expires_at ?? null;
            if (!raw) return acc;
            const d = new Date(raw);
            return Number.isNaN(d.getTime()) ? acc : d <= soon ? acc + 1 : acc;
          }, 0);
        } catch {}

        try {
          const { data } = await supabase.from("allergen_reviews").select("*");
          allergenDue = (data ?? []).reduce((acc: number, r: any) => {
            const raw = r.next_due ?? r.next_review_due ?? r.due_at ?? r.review_due ?? null;
            if (!raw) return acc;
            const d = new Date(raw);
            return Number.isNaN(d.getTime()) ? acc : d <= soon ? acc + 1 : acc;
          }, 0);
        } catch {}

        setKpi({ trainingDue, allergenDue });
      } catch {
        setKpi({ trainingDue: 0, allergenDue: 0 });
      }
    })();
  }, []);

  useEffect(() => {
    (async () => {
      const { data: tm } = await supabase.from("team_members").select("*");
      const fromDb =
        (tm ?? [])
          .map(
            (r: any) =>
              r.initials?.toString().toUpperCase() || firstLetter(r.name) || firstLetter(r.email),
          )
          .filter(Boolean) || [];
      const merged = Array.from(new Set([...(initialsSeed ?? []), ...fromDb, ...initials]));
      if (merged.length) setInitials(merged);
      if (!form.staff_initials && merged[0]) setForm((f) => ({ ...f, staff_initials: merged[0] }));
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialsSeed]);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("food_temp_logs").select("area, location");
      const fromAreas =
        (data ?? [])
          .map((r: any) => (r.area ?? r.location ?? "").toString().trim())
          .filter((s: string) => s.length > 0) || [];
      const merged = Array.from(new Set([...(locationsSeed ?? []), ...LOCATION_PRESETS, ...fromAreas, ...locations]));
      setLocations(merged.length ? merged : ["Kitchen"]);
      if (!form.location && merged[0]) setForm((f) => ({ ...f, location: merged[0] }));
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [locationsSeed]);

  useEffect(() => {
    (async () => {
      setLoading(true);
      setErr(null);
      try {
        const { data } = await supabase.from("food_temp_logs").select("*").order("at", { ascending: false }).limit(200);
        const normalized: CanonRow[] = (data ?? []).map((r: any) => ({
          id: String(r.id ?? crypto.randomUUID()),
          date: toISODate(r.at ?? r.date ?? r.created_at ?? null),
          staff_initials: (r.staff_initials ?? r.initials ?? null)?.toString() ?? null,
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
    const { data } = await supabase.from("food_temp_logs").select("*").order("at", { ascending: false }).limit(200);
    const normalized: CanonRow[] = (data ?? []).map((r: any) => ({
      id: String(r.id ?? crypto.randomUUID()),
      date: toISODate(r.at ?? r.date ?? r.created_at ?? null),
      staff_initials: (r.staff_initials ?? r.initials ?? null)?.toString() ?? null,
      location: (r.area ?? r.location ?? null)?.toString() ?? null,
      item: (r.note ?? r.item ?? null)?.toString() ?? null,
      target_key: r.target_key != null ? String(r.target_key) : null,
      temp_c: r.temp_c != null ? Number(r.temp_c) : null,
      status: r.status,
    }));
    setRows(normalized);
  }

  /* ----------------------------- Routines --------------------------------- */

  async function loadRoutines() {
    const uid = await getUid();
    const orgId = await getOrgId();
    let q = supabase
      .from("temp_routines")
      .select("id, name, location, item, target_key, last_used_at")
      .order("last_used_at", { ascending: false })
      .limit(100)
      .eq("created_by", uid);

    // IMPORTANT: .is('org_id', null) when orgId is null
    const { data, error } = orgId != null ? await q.eq("org_id", orgId) : await q.is("org_id", null);

    if (!error) setRoutines((data ?? []) as Routine[]);
  }


   // find-or-insert that handles null org_id and CHECKS ERRORS
async function saveRoutine(def: {
  name: string | null;
  location: string | null;
  item: string | null;
  target_key: string | null;
}) {
  const uid = await getUid();
  const orgId = await getOrgId();
  const last_used_at = new Date().toISOString();

  // Find existing (handle NULL org with .is)
  let findQ = supabase
    .from("temp_routines")
    .select("id")
    .eq("created_by", uid)
    .eq("location", def.location)
    .eq("item", def.item)
    .eq("target_key", def.target_key);

  const { data: existing, error: findErr } =
    orgId != null ? await findQ.eq("org_id", orgId).maybeSingle()
                  : await findQ.is("org_id", null).maybeSingle();

  if (findErr) throw new Error(`routine lookup failed: ${findErr.message}`);

  if (existing?.id) {
    const { error } = await supabase
      .from("temp_routines")
      .update({ last_used_at, name: def.name })
      .eq("id", existing.id);
    if (error) throw new Error(`routine update failed: ${error.message}`);
  } else {
    const { error } = await supabase.from("temp_routines").insert({
      created_by: uid,
      org_id: orgId ?? null,
      name: def.name,
      location: def.location,
      item: def.item,
      target_key: def.target_key,
      last_used_at,
    });
    if (error) throw new Error(`routine insert failed: ${error.message}`);
  }
}

// load routines (handles org_id NULL and CHECKS ERRORS)
async function loadRoutines() {
  const uid = await getUid();
  const orgId = await getOrgId();

  let q = supabase
    .from("temp_routines")
    .select("id, name, location, item, target_key, last_used_at")
    .eq("created_by", uid)
    .order("last_used_at", { ascending: false })
    .limit(100);

  const { data, error } =
    orgId != null ? await q.eq("org_id", orgId) : await q.is("org_id", null);

  if (error) throw new Error(`routine load failed: ${error.message}`);
  setRoutines((data ?? []) as Routine[]);
}

  /* -------------------------------- Save ---------------------------------- */

  async function handleAddQuick() {
    const uid = await getUid();
    const orgId = (await getOrgId()) ?? uid;

    const tempNum = Number.isFinite(Number(form.temp_c)) ? Number(form.temp_c) : null;
    const preset =
      form.target_key && form.target_key in TARGET_BY_KEY
        ? (TARGET_BY_KEY as Record<string, TargetPreset>)[form.target_key]
        : undefined;
    const status = inferStatus(tempNum, preset);

    const payload = {
      created_by: uid,
      org_id: orgId,
      at: form.date,
      area: form.location?.trim() || null,
      note: form.item?.trim() || null,
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

    if (form.saveRoutine) {
      try {
        await saveRoutine({
          name: `${form.location || "Location"} • ${form.item || "Item"} • ${form.target_key}`,
          location: form.location?.trim() || null,
          item: form.item?.trim() || null,
          target_key: form.target_key || null,
        });
        await loadRoutines();
      } catch (e: any) {
        console.warn("Saving routine failed:", e?.message);
      }
    }

    try {
      if (form.staff_initials) localStorage.setItem(LS_LAST_INITIALS, form.staff_initials);
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
    setRoutinePickerOpen(false);
  }

  const grouped = useMemo(() => {
    const by: Record<string, CanonRow[]> = {};
    for (const r of rows) {
      const k = r.date ?? "—";
      (by[k] ??= []).push(r);
    }
    return Object.entries(by);
  }, [rows]);

  /* --------------------------------- UI ----------------------------------- */

  return (
    <div className="space-y-6">
      {/* KPIs */}
      <div className="rounded-2xl border bg-white p-4 shadow-sm space-y-4">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <KpiCard
            label="Entries today"
            value={rows.filter((r) => r.date === new Date().toISOString().slice(0, 10)).length}
          />
          <KpiCard
            label="Last 7 days"
            value={rows.filter((r) => (r.date ? new Date(r.date) >= new Date(Date.now() - 7 * 864e5) : false)).length}
          />
          <KpiCard
            label="Failures (7d)"
            value={
              rows.filter(
                (r) => (r.date ? new Date(r.date) >= new Date(Date.now() - 7 * 864e5) : false) && r.status === "fail",
              ).length
            }
          />
          <KpiCard
            label="Locations (7d)"
            value={new Set(rows.filter((r) => r.date && new Date(r.date) >= new Date(Date.now() - 7 * 864e5)).map((r) => r.location || "")).size}
          />
        </div>

        <div className="flex flex-col gap-1">
          <a
            href="/team"
            className={cls(
              kpi.trainingDue > 0 ? "bg-red-100 text-red-800" : "bg-emerald-100 text-emerald-800",
              "inline-flex items-center justify-between rounded-full px-1.5 py-[2px] text-[13px] leading-[1.1] max-w-fit",
            )}
          >
            <span className="font-medium">Training</span>
            <span className="ml-2 inline-block rounded-full bg-white/60 px-1 py-[1px] text-[12px] leading-none">
              {kpi.trainingDue > 0 ? `${kpi.trainingDue} due` : "OK"}
            </span>
          </a>
          <a
            href="/allergens"
            className={cls(
              kpi.allergenDue > 0 ? "bg-red-100 text-red-800" : "bg-emerald-100 text-emerald-800",
              "inline-flex items-center justify-between rounded-full px-1.5 py-[2px] text-[13px] leading-[1.1] max-w-fit",
            )}
          >
            <span className="font-medium">Allergen Review</span>
            <span className="ml-2 inline-block rounded-full bg-white/60 px-1 py-[1px] text-[12px] leading-none">
              {kpi.allergenDue > 0 ? `${kpi.allergenDue} due` : "OK"}
            </span>
          </a>
        </div>
      </div>

      {/* Form block */}
      <div className="rounded-2xl border bg-white shadow-sm">
        <div className="flex items-center justify-between px-4 py-3">
          <span className="text-lg font-semibold">Enter Temperature Log</span>
          <div className="flex items-center gap-2">
            <button onClick={() => setRoutinePickerOpen(true)} className="rounded-lg border px-3 py-1.5 text-sm hover:bg-gray-50">
              Use routine
            </button>
            <button onClick={() => setRoutineManagerOpen(true)} className="rounded-lg border px-3 py-1.5 text-sm hover:bg-gray-50">
              Manage routines
            </button>
            <button onClick={() => setFormOpen((s) => !s)} className="rounded-md border px-2 py-1 text-xs">
              {formOpen ? "Hide ▲" : "Show ▼"}
            </button>
          </div>
        </div>

        {formOpen && (
          <div className="border-t p-4">
            {err && (
              <div className="mb-3 rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">{err}</div>
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
                  {!form.staff_initials && initials.length === 0 && <option value="" disabled>Loading initials…</option>}
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
                  className="w-full rounded-xl border px-3 py-2"
                >
                  {!form.location && locations.length === 0 && <option value="" disabled>Loading locations…</option>}
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
                      {p.minC != null || p.maxC != null ? ` (${p.minC ?? "−∞"}–${p.maxC ?? "+∞"} °C)` : ""}
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
                  className="w-full rounded-xl border px-3 py-2"
                  inputMode="decimal"
                  placeholder="e.g., 5.0"
                />
              </div>

              <div className="lg:col-span-6 flex items-center gap-3">
                <button
                  onClick={handleAddQuick}
                  disabled={!canSave}
                  className={cls(
                    "rounded-2xl px-4 py-2 font-medium text-white",
                    canSave ? "bg-black hover:bg-gray-900" : "bg-gray-400",
                  )}
                >
                  Save quick entry
                </button>

                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={form.saveRoutine}
                    onChange={(e) => setForm((f) => ({ ...f, saveRoutine: e.target.checked }))}
                  />
                  Save as routine
                </label>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Routine picker */}
      {routinePickerOpen && (
        <Modal onClose={() => setRoutinePickerOpen(false)} title="Use a routine">
          {routines.length === 0 ? (
            <div className="text-sm text-gray-600">No routines yet. Click <b>Manage routines</b> to add some.</div>
          ) : (
            <ul className="divide-y">
              {routines.map((r) => (
                <li key={r.id} className="py-2">
                  <button
                    className="w-full rounded-md px-2 py-2 text-left hover:bg-gray-50"
                    onClick={() => pickRoutine(r)}
                  >
                    <div className="text-sm font-medium">
                      {r.name ?? `${r.location ?? "—"} • ${r.item ?? "—"} • ${r.target_key ?? "—"}`}
                    </div>
                    <div className="text-xs text-gray-600">
                      {r.location ?? "—"} · {r.item ?? "—"} · {r.target_key ?? "—"}
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Modal>
      )}

      {/* Routine manager (scrollable) */}
      {routineManagerOpen && (
        <RoutineManager
          onClose={() => setRoutineManagerOpen(false)}
          onSaved={async () => {
            await loadRoutines();
            setRoutineManagerOpen(false);
          }}
        />
      )}

      {/* Logs grouped by date with dd/mm/yyyy header */}
      <div className="rounded-2xl border bg-white p-4 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Temperature Logs</h2>
          <button
            type="button"
            onClick={() => setRoutinePickerOpen(true)}
            className="rounded-lg border px-3 py-1.5 text-sm hover:bg-gray-50"
          >
            Use routine
          </button>
        </div>

        {loading ? (
          <div className="py-6 text-center text-gray-500">Loading…</div>
        ) : grouped.length === 0 ? (
          <div className="py-6 text-center text-gray-500">No entries</div>
        ) : (
          <div className="space-y-6">
            {grouped.map(([date, entries]) => (
              <div key={date} className="rounded-xl border">
                <div className="sticky top-0 z-10 rounded-t-xl bg-gray-50 px-3 py-2 text-sm font-semibold">
                  {ddmmyyyy(date)}
                </div>
                <div className="overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead>
                      <tr className="text-left text-gray-500">
                        <th className="py-2 pr-3">Staff</th>
                        <th className="py-2 pr-3">Location</th>
                        <th className="py-2 pr-3">Item</th>
                        <th className="py-2 pr-3">Target</th>
                        <th className="py-2 pr-3">Temp (°C)</th>
                        <th className="py-2 pr-3">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {entries.map((r) => {
                        const preset =
                          r.target_key &&
                          (TARGET_BY_KEY as Record<string, TargetPreset>)[r.target_key];
                        const st = r.status ?? inferStatus(r.temp_c, preset);
                        return (
                          <tr key={r.id} className="border-t">
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
                                    st === "pass" ? "bg-emerald-100 text-emerald-800" : "bg-red-100 text-red-800",
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
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/* --------------------------------- Bits ---------------------------------- */

function KpiCard({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-xl border bg-white p-3">
      <div className="text-xs text-gray-500">{label}</div>
      <div className="text-2xl font-semibold">{value}</div>
    </div>
  );
}

function Modal({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-[100] bg-black/30" onClick={onClose} role="dialog" aria-modal="true">
      <div
        className="absolute inset-x-0 top-10 mx-auto w-full max-w-2xl rounded-xl border bg-white shadow-sm"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 z-10 flex items-center justify-between border-b bg-white px-4 py-3">
          <h3 className="text-base font-semibold">{title}</h3>
          <button onClick={onClose} className="rounded-md p-2 hover:bg-gray-100" aria-label="Close">
            ✕
          </button>
        </div>
        {/* scrollable body */}
        <div className="max-h-[70vh] overflow-y-auto px-4 py-3">{children}</div>
      </div>
    </div>
  );
}

/* --------------------------- Routine Manager ----------------------------- */

function RoutineManager({
  onClose,
  onSaved,
}: {
  onClose: () => void;
  onSaved: () => Promise<void> | void;
}) {
  const [rows, setRows] = useState<
    Array<{ id: string; location: string; item: string; target_key: string }>
  >([{ id: crypto.randomUUID(), location: "", item: "", target_key: TARGET_PRESETS[0]?.key ?? "chill" }]);

  const [saving, setSaving] = useState(false);

  function addRow() {
    setRows((r) => [...r, { id: crypto.randomUUID(), location: "", item: "", target_key: TARGET_PRESETS[0]?.key ?? "chill" }]);
  }
  function removeRow(id: string) {
    setRows((r) => r.filter((x) => x.id !== id));
  }
  function update(id: string, patch: Partial<{ location: string; item: string; target_key: string }>) {
    setRows((r) => r.map((x) => (x.id === id ? { ...x, ...patch } : x)));
  }

  async function saveAll() {
    setSaving(true);
    try {
      const { data: u } = await supabase.auth.getUser();
      if (!u?.user) throw new Error("You are signed out.");
      const uid = u.user.id;

      // resolve org
      let orgId: string | null = null;
      try {
        const { data: tm } = await supabase
          .from("team_members")
          .select("org_id, owner_id")
          .eq("user_id", uid)
          .maybeSingle();
        orgId = tm?.org_id ?? tm?.owner_id ?? null;
      } catch {}

      for (const r of rows) {
        const name = `${r.location || "Location"} • ${r.item || "Item"} • ${r.target_key}`;
        const last_used_at = new Date().toISOString();

        // find that handles null org
        let findQ = supabase
          .from("temp_routines")
          .select("id")
          .eq("created_by", uid)
          .eq("location", r.location || null)
          .eq("item", r.item || null)
          .eq("target_key", r.target_key || null);

        const { data: existing } =
          orgId != null ? await findQ.eq("org_id", orgId).maybeSingle() : await findQ.is("org_id", null).maybeSingle();

        if (existing?.id) {
          await supabase.from("temp_routines").update({ name, last_used_at }).eq("id", existing.id);
        } else {
          await supabase.from("temp_routines").insert({
            created_by: uid,
            org_id: orgId ?? null,
            name,
            location: r.location || null,
            item: r.item || null,
            target_key: r.target_key || null,
            last_used_at,
          });
        }
      }

      await onSaved();
    } catch (e) {
      console.error(e);
      alert("Failed to save routines.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal onClose={onClose} title="Manage routines">
      <div className="space-y-3">
        {rows.map((r) => (
          <div key={r.id} className="grid grid-cols-1 gap-3 sm:grid-cols-4">
            <div>
              <label className="mb-1 block text-xs text-gray-500">Location</label>
              <input
                value={r.location}
                onChange={(e) => update(r.id, { location: e.target.value })}
                className="w-full rounded-xl border px-3 py-2"
                placeholder="e.g., Kitchen"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="mb-1 block text-xs text-gray-500">Item</label>
              <input
                value={r.item}
                onChange={(e) => update(r.id, { item: e.target.value })}
                className="w-full rounded-xl border px-3 py-2"
                placeholder="e.g., Chicken curry"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-gray-500">Target</label>
              <select
                value={r.target_key}
                onChange={(e) => update(r.id, { target_key: e.target.value })}
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
            <div className="sm:col-span-4 -mt-1 flex justify-end">
              <button
                type="button"
                onClick={() => removeRow(r.id)}
                className="rounded-md border px-2 py-1 text-xs hover:bg-gray-50"
                aria-label="Remove"
              >
                Remove
              </button>
            </div>
          </div>
        ))}

        <div className="sticky bottom-0 flex items-center justify-between border-t bg-white pt-3">
          <button type="button" onClick={addRow} className="rounded-md border px-3 py-1.5 text-sm hover:bg-gray-50">
            + Add another
          </button>
          <div className="flex gap-2">
            <button type="button" onClick={onClose} className="rounded-md border px-3 py-1.5 text-sm hover:bg-gray-50">
              Cancel
            </button>
            <button
              type="button"
              disabled={saving}
              onClick={saveAll}
              className={cls("rounded-md px-4 py-1.5 text-sm text-white", saving ? "bg-gray-400" : "bg-black hover:bg-gray-900")}
            >
              {saving ? "Saving…" : "Save routines"}
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
}

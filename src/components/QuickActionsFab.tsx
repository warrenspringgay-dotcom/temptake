// src/components/TempFab.tsx
"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseBrowser";
import { getActiveOrgIdClient } from "@/lib/orgClient";
import { getActiveLocationIdClient } from "@/lib/locationClient";
import {
  TARGET_PRESETS,
  TARGET_BY_KEY,
  type TargetPreset,
} from "@/lib/temp-constants";
import { useToast } from "@/components/ui/use-toast";
import RoutineRunModal from "@/components/RoutineRunModal";
import type { RoutineRow } from "@/components/RoutinePickerModal";

const LS_LAST_INITIALS = "tt_last_initials";
const LS_LAST_LOCATION = "tt_last_location";

type FormState = {
  date: string;
  staff_initials: string;
  location: string;
  item: string;
  target_key: string;
  temp_c: string;
};

const cls = (...parts: Array<string | false | null | undefined>) =>
  parts.filter(Boolean).join(" ");

function inferStatus(
  temp: number | null,
  preset?: TargetPreset
): "pass" | "fail" | null {
  if (temp == null || !preset) return null;
  const { minC, maxC } = preset;
  if (minC != null && temp < minC) return "fail";
  if (maxC != null && temp > maxC) return "fail";
  return "pass";
}

export default function TempFab() {
  const { toast } = useToast();
  const router = useRouter();

  const [open, setOpen] = useState(false);
  const [entriesToday, setEntriesToday] = useState<number | null>(null);
  const [showMenu, setShowMenu] = useState(false);

  const [initials, setInitials] = useState<string[]>([]);
  const [locations, setLocations] = useState<string[]>([]);
  const [form, setForm] = useState<FormState>({
    date: new Date().toISOString().slice(0, 10),
    staff_initials: "",
    location: "",
    item: "",
    target_key: TARGET_PRESETS[0]?.key ?? "chill",
    temp_c: "",
  });

  const canSave =
    !!form.date &&
    !!form.location &&
    !!form.item &&
    !!form.target_key &&
    form.temp_c.trim().length > 0;

  // Routine picker / runner
  const [showPicker, setShowPicker] = useState(false);
  const [pickerLoading, setPickerLoading] = useState(false);
  const [pickerErr, setPickerErr] = useState<string | null>(null);
  const [pickerList, setPickerList] = useState<RoutineRow[]>([]);
  const [runRoutine, setRunRoutine] = useState<RoutineRow | null>(null);

  /* --------- helpers --------- */

  async function refreshEntriesToday() {
    try {
      const orgId = await getActiveOrgIdClient();
      if (!orgId) {
        setEntriesToday(0);
        return;
      }
      const locationId = await getActiveLocationIdClient();

      const start = new Date();
      start.setHours(0, 0, 0, 0);
      const end = new Date();
      end.setHours(23, 59, 59, 999);

      let query = supabase
        .from("food_temp_logs")
        .select("id", { count: "exact", head: true })
        .eq("org_id", orgId)
        .gte("at", start.toISOString())
        .lte("at", end.toISOString());

      if (locationId) {
        query = query.eq("location_id", locationId);
      }

      const { count, error } = await query;
      if (error || count == null) {
        setEntriesToday(0);
        return;
      }
      setEntriesToday(count);
    } catch {
      setEntriesToday(0);
    }
  }

  /* --------- boot: initials + locations + last used values --------- */

  useEffect(() => {
    // basic date, then localStorage
    setForm((f) => ({
      ...f,
      date: new Date().toISOString().slice(0, 10),
    }));

    try {
      const lsIni = localStorage.getItem(LS_LAST_INITIALS) || "";
      const lsLoc = localStorage.getItem(LS_LAST_LOCATION) || "";
      setForm((f) => ({
        ...f,
        staff_initials: lsIni || f.staff_initials,
        location: lsLoc || f.location,
      }));
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const orgId = await getActiveOrgIdClient();
        const locationId = await getActiveLocationIdClient();

        // initials from team_members
        if (orgId) {
          const { data: tm } = await supabase
            .from("team_members")
            .select("initials")
            .eq("org_id", orgId)
            .order("initials", { ascending: true });

          const iniList =
            (tm ?? [])
              .map((r: any) => r.initials?.toString().toUpperCase())
              .filter(Boolean) || [];
          setInitials(iniList);
          if (!form.staff_initials && iniList[0]) {
            setForm((f) => ({ ...f, staff_initials: iniList[0] }));
          }
        }

        // locations from recent logs
        if (orgId) {
          let q = supabase
            .from("food_temp_logs")
            .select("area")
            .eq("org_id", orgId)
            .order("at", { ascending: false })
            .limit(200);

          if (locationId) q = q.eq("location_id", locationId);

          const { data } = await q;
          const fromAreas =
            (data ?? [])
              .map((r: any) => (r.area ?? "").toString().trim())
              .filter((s: string) => s.length > 0) || [];
          const unique = Array.from(new Set(fromAreas));
          setLocations(unique.length ? unique : ["Kitchen"]);
          if (!form.location) {
            setForm((f) => ({ ...f, location: unique[0] || "Kitchen" }));
          }
        }
      } catch {
        // fallback
        if (!locations.length) {
          setLocations(["Kitchen"]);
          if (!form.location) {
            setForm((f) => ({ ...f, location: "Kitchen" }));
          }
        }
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    refreshEntriesToday();
  }, []);

  /* --------- save entry --------- */

  async function handleSave() {
    if (!canSave) return;

    const tempNum = Number.isFinite(Number(form.temp_c))
      ? Number(form.temp_c)
      : null;
    const preset = (TARGET_BY_KEY as Record<string, TargetPreset | undefined>)[
      form.target_key
    ];
    const status: "pass" | "fail" | null = inferStatus(tempNum, preset);

    const org_id = await getActiveOrgIdClient();
    const location_id = await getActiveLocationIdClient();

    if (!org_id) {
      toast({
        variant: "destructive",
        title: "No organisation found",
        description: "Please check your account and try again.",
      });
      return;
    }

    if (!location_id) {
      toast({
        variant: "destructive",
        title: "No location selected",
        description: "Pick a site/location first.",
      });
      return;
    }

    // selected date + current time
    let atIso: string;
    try {
      const selectedDate = new Date(form.date);
      const now = new Date();
      const at = new Date(
        selectedDate.getFullYear(),
        selectedDate.getMonth(),
        selectedDate.getDate(),
        now.getHours(),
        now.getMinutes(),
        now.getSeconds(),
        now.getMilliseconds()
      );
      atIso = at.toISOString();
    } catch {
      atIso = new Date().toISOString();
    }

    const payload = {
      org_id,
      location_id,
      at: atIso,
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
      toast({
        variant: "destructive",
        title: "Save failed",
        description: error.message,
      });
      return;
    }

    try {
      if (form.staff_initials)
        localStorage.setItem(LS_LAST_INITIALS, form.staff_initials);
      if (form.location) localStorage.setItem(LS_LAST_LOCATION, form.location);
    } catch {}

    toast({ title: "Temperature saved" });

    // reset item + temp, keep date/initials/location
    setForm((f) => ({ ...f, item: "", temp_c: "" }));
    await refreshEntriesToday();
    setOpen(false);
  }

  /* --------- routines --------- */

  async function openRoutinePicker() {
    setShowPicker(true);
    setPickerLoading(true);
    setPickerErr(null);

    try {
      const orgId = await getActiveOrgIdClient();

      let rowsAny: any[] = [];
      if (orgId) {
        const q1 = await supabase
          .from("temp_routines")
          .select("id,name,active")
          .eq("org_id", orgId)
          .order("name", { ascending: true });
        rowsAny = q1.data ?? [];

        if (rowsAny.length === 0) {
          const q2 = await supabase
            .from("temp_routines")
            .select("id,name,active")
            .eq("organisation_id", orgId)
            .order("name", { ascending: true });
          rowsAny = q2.data ?? [];
        }
      }

      if (rowsAny.length === 0) {
        const q3 = await supabase
          .from("routines")
          .select("id,name,active")
          .order("name", { ascending: true });
        rowsAny = q3.data ?? [];
      }

      const list: RoutineRow[] =
        rowsAny.map((r: any) => ({
          id: String(r.id),
          name: r.name ?? "Untitled",
          active: !!(r.active ?? true),
          items: [],
        })) || [];

      setPickerList(list);
    } catch (e: any) {
      setPickerErr(e?.message || "Failed to load routines.");
      setPickerList([]);
    } finally {
      setPickerLoading(false);
    }
  }

  async function pickRoutine(r: RoutineRow) {
    try {
      let items: any[] = [];
      const t1 = await supabase
        .from("temp_routine_items")
        .select("id,routine_id,position,location,item,target_key")
        .eq("routine_id", r.id)
        .order("position", { ascending: true });
      items = t1.data ?? [];

      if (items.length === 0) {
        const t2 = await supabase
          .from("routine_items")
          .select("id,routine_id,position,location,item,target_key")
          .eq("routine_id", r.id)
          .order("position", { ascending: true });
        items = t2.data ?? [];
      }

      const filled: RoutineRow = {
        ...r,
        items: (items ?? []).map((it: any) => ({
          id: String(it.id),
          routine_id: String(it.routine_id),
          position: Number(it.position ?? 0),
          location: it.location ?? null,
          item: it.item ?? null,
          target_key: String(it.target_key ?? "chill"),
        })),
      };

      setShowPicker(false);
      setRunRoutine({
        ...filled,
        items: filled.items.sort((a, b) => a.position - b.position),
      });
    } catch (e: any) {
      toast({
        variant: "destructive",
        title: "Failed to load routine",
        description: e?.message || "Please try again.",
      });
    }
  }

  /* --------- render --------- */

  const wrapperClass =
    entriesToday !== null && entriesToday === 0 ? "no-temps-today" : "";

  return (
    <>
      {/* FAB + zero-entries pulse wrapper */}
      <div className={wrapperClass}>
        <button
          type="button"
          onClick={() => setShowMenu((v) => !v)}
          className="fab fixed bottom-6 right-4 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-r from-emerald-500 via-lime-500 to-emerald-500 text-3xl font-bold leading-none text-white shadow-lg shadow-emerald-500/40 hover:brightness-110"
        >
          <span>+</span>
          {entriesToday !== null && (
            <div className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full w-6 h-6 flex items-center justify-center">
              {entriesToday}
            </div>
          )}
        </button>
      </div>

      {/* Quick choice menu (Wall vs Quick log) */}
      {showMenu && (
        <div className="fixed bottom-24 right-4 z-50 flex flex-col items-end">
          <div className="rounded-2xl border border-emerald-100 bg-white/95 p-3 shadow-xl shadow-emerald-500/20 w-64">
            <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
              What would you like to do?
            </div>
            <div className="space-y-2">
              <button
                type="button"
                onClick={() => {
                  setShowMenu(false);
                  setOpen(true);
                }}
                className="w-full rounded-xl bg-gradient-to-r from-emerald-500 via-lime-500 to-emerald-500 px-3 py-2.5 text-sm font-semibold text-white shadow-sm shadow-emerald-500/40 hover:brightness-105"
              >
                Quick temp log
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowMenu(false);
                  router.push("/wall");
                }}
                className="w-full rounded-xl bg-gradient-to-r from-sky-500 via-blue-500 to-indigo-500 px-3 py-2.5 text-sm font-semibold text-white shadow-sm shadow-blue-500/40 hover:brightness-105"
              >
                Open wall
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Quick entry modal */}
      {open && (
        <div
          className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm"
          onClick={() => setOpen(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="mx-auto mt-6 flex h-[70vh] w-full max-w-lg flex-col overflow-hidden rounded-t-2xl border border-white/30 bg-white/95 shadow-xl shadow-slate-900/25 backdrop-blur sm:mt-24 sm:h-auto sm:rounded-2xl"
          >
            {/* header */}
            <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
              <div className="text-base font-semibold text-slate-900">
                Quick temperature entry
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs text-slate-700 hover:bg-slate-100"
              >
                Close
              </button>
            </div>

            {/* body */}
            <div className="grow space-y-3 overflow-y-auto px-4 py-3 text-sm">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs text-gray-500">
                    Date
                  </label>
                  <input
                    type="date"
                    value={form.date}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, date: e.target.value }))
                    }
                    className="h-10 w-full rounded-xl border border-slate-200 bg-white/90 px-3 py-2 shadow-sm"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-xs text-gray-500">
                    Initials
                  </label>
                  <select
                    value={form.staff_initials}
                    onChange={(e) => {
                      const v = e.target.value.toUpperCase();
                      setForm((f) => ({ ...f, staff_initials: v }));
                      try {
                        localStorage.setItem(LS_LAST_INITIALS, v);
                      } catch {}
                    }}
                    className="h-10 w-full rounded-xl border border-slate-200 bg-white/90 px-3 py-2 uppercase shadow-sm"
                  >
                    {!form.staff_initials && initials.length === 0 && (
                      <option value="" disabled>
                        Loading…
                      </option>
                    )}
                    {initials.map((i) => (
                      <option key={i} value={i}>
                        {i}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mb-1 block text-xs text-gray-500">
                    Location
                  </label>
                  <select
                    value={form.location}
                    onChange={(e) => {
                      const v = e.target.value;
                      setForm((f) => ({ ...f, location: v }));
                      try {
                        localStorage.setItem(LS_LAST_LOCATION, v);
                      } catch {}
                    }}
                    className="h-10 w-full rounded-xl border border-slate-200 bg-white/90 px-3 py-2 shadow-sm"
                  >
                    {!form.location && locations.length === 0 && (
                      <option value="" disabled>
                        Loading…
                      </option>
                    )}
                    {locations.map((loc) => (
                      <option key={loc} value={loc}>
                        {loc}
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
                    className="h-10 w-full rounded-xl border border-slate-200 bg-white/90 px-3 py-2 shadow-sm"
                    inputMode="decimal"
                    placeholder="e.g., 5.0"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1 block text-xs text-gray-500">Item</label>
                <input
                  value={form.item}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, item: e.target.value }))
                  }
                  className="h-10 w-full rounded-xl border border-slate-200 bg-white/90 px-3 py-2 shadow-sm"
                  placeholder="e.g., Chicken curry"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs text-gray-500">
                  Target
                </label>
                <select
                  value={form.target_key}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, target_key: e.target.value }))
                  }
                  className="h-10 w-full rounded-xl border border-slate-200 bg-white/90 px-3 py-2 text-xs shadow-sm"
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
            </div>

            {/* footer */}
            <div className="flex flex-col gap-2 border-t bg-white/90 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
              {/* Use routine button */}
              <button
                type="button"
                onClick={openRoutinePicker}
                className="inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-white/80 px-3 py-1.5 text-sm text-slate-800 shadow-sm hover:bg-white"
              >
                Use routine
              </button>

              <div className="flex flex-1 justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="rounded-md px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>

                <button
                  type="button"
                  disabled={!canSave}
                  onClick={handleSave}
                  className={cls(
                    "rounded-2xl px-4 py-1.5 text-sm font-medium text-white shadow-sm shadow-emerald-500/30",
                    canSave
                      ? "bg-gradient-to-r from-emerald-500 via-lime-500 to-emerald-500 hover:brightness-105"
                      : "bg-gray-400 cursor-not-allowed"
                  )}
                >
                  Save quick entry
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Inline Routine Picker Modal */}
      {showPicker && (
        <div
          className="fixed inset-0 z-[60] bg-black/40 backdrop-blur-sm"
          onClick={() => setShowPicker(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="mx-auto mt-6 flex h-[70vh] w-full max-w-lg flex-col overflow-hidden rounded-t-2xl border border-white/30 bg-white/90 shadow-xl shadow-slate-900/20 backdrop-blur sm:mt-24 sm:h-auto sm:rounded-2xl"
          >
            <div className="sticky top-0 z-10 border-b bg-white/90 px-4 py-3 text-base font-semibold">
              Pick a routine
            </div>
            <div className="grow overflow-y-auto px-4 py-3">
              {pickerLoading ? (
                <div className="p-4 text-sm text-gray-500">Loading…</div>
              ) : pickerErr ? (
                <div className="rounded-md border border-red-200 bg-red-50/90 p-3 text-sm text-red-800">
                  {pickerErr}
                </div>
              ) : pickerList.length === 0 ? (
                <div className="rounded border border-dashed border-gray-300 bg-white/80 p-6 text-center text-sm text-gray-500">
                  No routines yet.
                </div>
              ) : (
                <div className="space-y-2">
                  {pickerList.map((r) => (
                    <button
                      key={r.id}
                      onClick={() => pickRoutine(r)}
                      className="flex w-full items-center justify-between rounded-xl border border-slate-200 bg-white/80 px-3 py-2 text-left text-sm shadow-sm hover:bg-white"
                    >
                      <div>
                        <div className="font-medium">{r.name}</div>
                        {!r.active && (
                          <div className="text-xs text-gray-500">Inactive</div>
                        )}
                      </div>
                      <span className="text-gray-400">{">"}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div className="sticky bottom-0 z-10 flex items-center justify-end gap-2 border-t bg-white/90 px-4 py-3">
              <button
                type="button"
                className="rounded-md px-3 py-1.5 text-sm hover:bg-gray-50"
                onClick={() => setShowPicker(false)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Full routine run modal */}
      <RoutineRunModal
        open={!!runRoutine}
        routine={runRoutine}
        defaultDate={form.date}
        defaultInitials={form.staff_initials}
        onClose={() => setRunRoutine(null)}
        onSaved={async () => {
          toast({ title: "Routine logged" });
          setRunRoutine(null);
          await refreshEntriesToday();
          setOpen(false);
        }}
      />
    </>
  );
}

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
import { Thermometer, Brush } from "lucide-react";

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

// ===== Cleaning helpers (aligned with FoodTempLogger) =====
const isoToday = () => new Date().toISOString().slice(0, 10);
const getDow1to7 = (ymd: string) => {
  const date = new Date(ymd);
  return ((date.getDay() + 6) % 7) + 1; // Mon=1..Sun=7
};
const getDom = (ymd: string) => new Date(ymd).getDate();

function isDueOn(
  frequency: "daily" | "weekly" | "monthly",
  weekday: number | null,
  month_day: number | null,
  ymd: string
) {
  switch (frequency) {
    case "daily":
      return true;
    case "weekly":
      return weekday === getDow1to7(ymd);
    case "monthly":
      return month_day === getDom(ymd);
    default:
      return false;
  }
}

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
  const { addToast } = useToast();
  const router = useRouter();

  const [open, setOpen] = useState(false);
  const [entriesToday, setEntriesToday] = useState<number | null>(null);
  const [openCleaning, setOpenCleaning] = useState<number | null>(null);
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

  // Count today’s *open* cleaning tasks:
  // tasks due today minus runs recorded today
  async function refreshCleaningOpen() {
    try {
      const orgId = await getActiveOrgIdClient();
      if (!orgId) {
        setOpenCleaning(0);
        return;
      }
      const locationId = await getActiveLocationIdClient();
      if (!locationId) {
        setOpenCleaning(0);
        return;
      }

      const todayISO = isoToday();

      // 1) Load all cleaning tasks for this org + location
      const { data: tData, error: tErr } = await supabase
        .from("cleaning_tasks")
        .select("id, frequency, weekday, month_day")
        .eq("org_id", orgId)
        .eq("location_id", locationId);

      if (tErr || !tData) {
        setOpenCleaning(0);
        return;
      }

      type TaskRow = {
        id: string | number;
        frequency: "daily" | "weekly" | "monthly" | null;
        weekday: number | null;
        month_day: number | null;
      };

      const tasks: TaskRow[] = tData as TaskRow[];

      const dueToday = tasks.filter((t) =>
        isDueOn(
          (t.frequency ?? "daily") as "daily" | "weekly" | "monthly",
          t.weekday ?? null,
          t.month_day ?? null,
          todayISO
        )
      );

      if (dueToday.length === 0) {
        setOpenCleaning(0);
        return;
      }

      // 2) Load runs for today
      const { data: rData, error: rErr } = await supabase
        .from("cleaning_task_runs")
        .select("task_id, run_on")
        .eq("org_id", orgId)
        .eq("location_id", locationId)
        .eq("run_on", todayISO);

      if (rErr) {
        setOpenCleaning(0);
        return;
      }

      const doneIds = new Set<string>(
        (rData ?? []).map((r: any) => String(r.task_id))
      );

      const openCount = dueToday.filter(
        (t) => !doneIds.has(String(t.id))
      ).length;

      setOpenCleaning(openCount);
    } catch {
      setOpenCleaning(0);
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

        // initials from team_members (and logged-in user)
        if (orgId) {
          const [{ data: authData }, { data: tmData }] = await Promise.all([
            supabase.auth.getUser(),
            supabase
              .from("team_members")
              .select("initials,email")
              .eq("org_id", orgId)
              .order("initials", { ascending: true }),
          ]);

          const email = authData?.user?.email?.toLowerCase() ?? null;

          const iniList: string[] =
            (tmData ?? [])
              .map((r: any) =>
                r.initials ? r.initials.toString().toUpperCase().trim() : ""
              )
              .filter(Boolean) || [];

          // Logged-in user's initials from team_members
          let mine =
            (tmData ?? [])
              .find(
                (r: any) =>
                  r.email &&
                  email &&
                  r.email.toString().toLowerCase() === email
              )
              ?.initials?.toString()
              .toUpperCase()
              .trim() || "";

          // Fallback to last used initials from localStorage
          if (!mine) {
            try {
              if (typeof window !== "undefined") {
                const fromLs =
                  localStorage.getItem(LS_LAST_INITIALS) || "";
                mine = fromLs.toUpperCase().trim();
              }
            } catch {
              // ignore
            }
          }

          let sorted = iniList;
          if (mine && iniList.includes(mine)) {
            sorted = [mine, ...iniList.filter((i) => i !== mine)];
          }

          setInitials(sorted);

          // If no initials selected yet, choose user's initials first, otherwise first option
          if (!form.staff_initials) {
            const chosen = mine || sorted[0] || "";
            if (chosen) {
              setForm((f) => ({ ...f, staff_initials: chosen }));
            }
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

  // Initial fetch
  useEffect(() => {
    void refreshEntriesToday();
    void refreshCleaningOpen();
  }, []);

  // Small poll so broom disappears shortly after cleaning is confirmed
  useEffect(() => {
    const id = setInterval(() => {
      void refreshCleaningOpen();
    }, 20000); // 20s – tweak if you want faster/slower
    return () => clearInterval(id);
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
      addToast({
        title: "No organisation found",
        message: "Please check your account and try again.",
        type: "error",
      });
      return;
    }

    if (!location_id) {
      addToast({
        title: "No location selected",
        message: "Pick a site/location first.",
        type: "error",
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
      addToast({
        title: "Save failed",
        message: error.message,
        type: "error",
      });
      return;
    }

    try {
      if (form.staff_initials)
        localStorage.setItem(LS_LAST_INITIALS, form.staff_initials);
      if (form.location) localStorage.setItem(LS_LAST_LOCATION, form.location);
    } catch {
      // ignore
    }

    addToast({
      title: "Temperature saved",
      type: "success",
    });

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
      addToast({
        title: "Failed to load routine",
        message: e?.message || "Please try again.",
        type: "error",
      });
    }
  }

  /* --------- render --------- */

  const wrapperClass =
    entriesToday !== null && entriesToday === 0 ? "no-temps-today" : "";

  const showTempWarning =
    entriesToday !== null && entriesToday === 0; // no temps yet today
  const showCleaningWarning =
    openCleaning !== null && openCleaning > 0; // there are open cleaning tasks

  return (
    <>
      {/* FAB + orbs wrapper */}
      <div className={cls(wrapperClass, "fixed bottom-6 right-4 z-40")}>
        {/* Main FAB */}
        <button
          type="button"
          onClick={() => setShowMenu((v) => !v)}
          className="fab relative flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-r from-emerald-500 via-lime-500 to-emerald-500 text-3xl font-bold leading-none text-white shadow-lg shadow-emerald-500/40 hover:brightness-110"
        >
          <span>+</span>
        </button>

        {/* 2 o'clock – temperature orb (opens quick entry modal) */}
        {showTempWarning && (
          <button
            type="button"
            onClick={() => {
              setShowMenu(false);
              setOpen(true);
            }}
            className="absolute -top-2 -right-2 flex h-7 w-7 items-center justify-center rounded-full bg-red-500 text-white shadow-md shadow-red-500/60 active:scale-90 transition cursor-pointer"
          >
            <Thermometer className="h-4 w-4" />
          </button>
        )}

        {/* 10 o'clock – cleaning orb */}
        {showCleaningWarning && (
          <button
            type="button"
            onClick={() => router.push("/cleaning-rota")}
            className="absolute -top-2 -left-2 flex h-7 w-7 items-center justify-center rounded-full bg-sky-500 text-white shadow-md shadow-sky-500/60 active:scale-90 transition cursor-pointer"
          >
            <Brush className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Quick choice menu (closes when clicking outside) */}
      {showMenu && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-end"
          onClick={() => setShowMenu(false)}
        >
          <div
            className="mb-24 mr-4 flex flex-col items-end"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-64 rounded-2xl border border-emerald-100 bg-white/95 p-3 shadow-xl shadow-emerald-500/20">
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
                      } catch {
                        // ignore
                      }
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
                      } catch {
                        // ignore
                      }
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
          addToast({ title: "Routine logged", type: "success" });
          setRunRoutine(null);
          await refreshEntriesToday();
          await refreshCleaningOpen();
          setOpen(false);
        }}
      />
    </>
  );
}

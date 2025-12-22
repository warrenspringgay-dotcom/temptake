// src/components/TempFab.tsx
"use client";
import posthog from "posthog-js";

import React, { useEffect, useMemo, useRef, useState } from "react";
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
import { Thermometer, Brush, Mic, MicOff, ClipboardList } from "lucide-react";
import { useVoiceTempEntry } from "@/lib/useVoiceTempEntry";

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

  // local cache for active ids (so realtime can subscribe once)
  const [activeOrgId, setActiveOrgId] = useState<string | null>(null);
  const [activeLocationId, setActiveLocationId] = useState<string | null>(null);

  // Prevent overlapping cleaning refresh calls
  const cleaningRefreshInFlight = useRef(false);
  const cleaningRefreshQueued = useRef(false);

  // ✅ Voice hook must be top-level (not inside useEffect)
  const { supported: voiceSupported, listening, start, stop } = useVoiceTempEntry(
    {
      lang: "en-GB",
      onResult: (r) => {
        setForm((f) => ({
          ...f,
          temp_c: r.temp_c ?? f.temp_c,
          item: r.item ?? f.item,
          location: r.location ?? f.location,
          staff_initials: r.staff_initials ?? f.staff_initials,
        }));

        posthog.capture("temp_voice_parsed", {
          raw: r.raw,
          has_temp: !!r.temp_c,
          has_item: !!r.item,
          has_location: !!r.location,
        });
      },
      onError: (msg) => {
        addToast({ title: "Voice entry failed", message: msg, type: "error" });
      },
    }
  );

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

      if (locationId) query = query.eq("location_id", locationId);

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
  async function refreshCleaningOpen(force = false) {
    // simple coalescing so spam events don't overlap
    if (cleaningRefreshInFlight.current) {
      cleaningRefreshQueued.current = true;
      return;
    }

    cleaningRefreshInFlight.current = true;

    try {
      const orgId = force ? (activeOrgId ?? (await getActiveOrgIdClient())) : (activeOrgId ?? (await getActiveOrgIdClient()));
      if (!orgId) {
        setOpenCleaning(0);
        return;
      }

      const locationId =
        force
          ? (activeLocationId ?? (await getActiveLocationIdClient()))
          : (activeLocationId ?? (await getActiveLocationIdClient()));

      if (!locationId) {
        setOpenCleaning(0);
        return;
      }

      // keep state fresh for realtime subscription usage
      if (orgId !== activeOrgId) setActiveOrgId(orgId);
      if (locationId !== activeLocationId) setActiveLocationId(locationId);

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

      const openCount = dueToday.filter((t) => !doneIds.has(String(t.id))).length;
      setOpenCleaning(openCount);
    } catch {
      setOpenCleaning(0);
    } finally {
      cleaningRefreshInFlight.current = false;

      if (cleaningRefreshQueued.current) {
        cleaningRefreshQueued.current = false;
        // run one more time if we got spammed while busy
        void refreshCleaningOpen(true);
      }
    }
  }

  /* --------- boot: initials + locations + last used values --------- */

  useEffect(() => {
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
    } catch {}
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const orgId = await getActiveOrgIdClient();
        const locationId = await getActiveLocationIdClient();
        setActiveOrgId(orgId ?? null);
        setActiveLocationId(locationId ?? null);

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

          if (!mine) {
            try {
              const fromLs = localStorage.getItem(LS_LAST_INITIALS) || "";
              mine = fromLs.toUpperCase().trim();
            } catch {}
          }

          let sorted = iniList;
          if (mine && iniList.includes(mine)) {
            sorted = [mine, ...iniList.filter((i) => i !== mine)];
          }

          setInitials(sorted);

          if (!form.staff_initials) {
            const chosen = mine || sorted[0] || "";
            if (chosen) {
              setForm((f) => ({ ...f, staff_initials: chosen }));
            }
          }
        }

        // locations from recent logs
                // locations from recent logs
        if (orgId) {
          let q = supabase
            .from("food_temp_logs")
            .select("area")
            .eq("org_id", orgId)
            .order("at", { ascending: false })
            .limit(200);

          if (locationId) q = q.eq("location_id", locationId);

          type LogRow = { area: string | null };

          const { data: logsData } = await q;

          // logsData comes back as any[], normalise to a clean string[]
          const fromAreas: string[] =
            (logsData ?? [])
              .map((r: LogRow) => (r.area ?? "").toString().trim())
              .filter((s: string) => s.length > 0);

          const unique: string[] = Array.from(new Set<string>(fromAreas));

          const finalAreas: string[] = unique.length ? unique : ["Kitchen"];

          setLocations(finalAreas);

          if (!form.location) {
            setForm((f) => ({ ...f, location: finalAreas[0] || "Kitchen" }));
          }
        }

      } catch {
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

  // Initial refresh
  useEffect(() => {
    void refreshEntriesToday();
    void refreshCleaningOpen(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Faster fallback poll (safety net only)
  useEffect(() => {
    const id = setInterval(() => {
      void refreshCleaningOpen(false);
    }, 6000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeOrgId, activeLocationId]);

  // Refresh on focus/visibility so it never "lags" when you come back
  useEffect(() => {
    const onVis = () => {
      if (document.visibilityState === "visible") void refreshCleaningOpen(true);
    };
    const onFocus = () => void refreshCleaningOpen(true);

    document.addEventListener("visibilitychange", onVis);
    window.addEventListener("focus", onFocus);
    return () => {
      document.removeEventListener("visibilitychange", onVis);
      window.removeEventListener("focus", onFocus);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Allow other pages to force immediate refresh (recommended)
  useEffect(() => {
    const onCleaningChanged = () => {
      void refreshCleaningOpen(true);
    };
    window.addEventListener("tt-cleaning-changed", onCleaningChanged);
    return () => window.removeEventListener("tt-cleaning-changed", onCleaningChanged);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Realtime: update orb instantly when runs/tasks change
  useEffect(() => {
    if (!activeOrgId || !activeLocationId) return;
      const channel = supabase
        .channel("food_temp_logs_changes")
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "food_temp_logs",
            filter: `org_id=eq.${activeOrgId}`,
          },
          (payload: any) => {
            // only care about the active location (runs have location_id)
            const loc =
              (payload.new as any)?.location_id ??
              (payload.old as any)?.location_id ??
              null;
            if (loc && String(loc) !== String(activeLocationId)) return;

            // ...rest of your logic...
          

          void refreshCleaningOpen(true);
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeOrgId, activeLocationId]);

  useEffect(() => {
    const handler = () => {
      setShowMenu(false);
      setOpen(true);
      posthog.capture("temp_kpi_card_clicked");
    };

    window.addEventListener("tt-open-temp-modal", handler);
    return () => window.removeEventListener("tt-open-temp-modal", handler);
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
    } catch {}

    addToast({ title: "Temperature saved", type: "success" });

    posthog.capture("temp_quick_log_saved", {
      source: "fab_quick",
      target_key: form.target_key,
      temp_c: tempNum,
      status,
    });

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

  /* --------- derived --------- */

  const wrapperClass =
    entriesToday !== null && entriesToday === 0 ? "no-temps-today" : "";

  const showTempWarning = entriesToday !== null && entriesToday === 0;
  const showCleaningWarning = openCleaning !== null && openCleaning > 0;

  /* --------- render --------- */

  return (
    <>
      {/* FAB + orbs wrapper */}
      <div className={cls(wrapperClass, "fixed bottom-6 right-4 z-40")}>
        <button
          type="button"
          onClick={() => {
            setShowMenu((v) => !v);
            posthog.capture("fab_opened");
          }}
          className="fab relative flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-r from-emerald-500 via-lime-500 to-emerald-500 text-3xl font-bold leading-none text-white shadow-lg shadow-emerald-500/40 hover:brightness-110 active:scale-[0.98] transition"
        >
          <span>+</span>
        </button>

        {showTempWarning && (
          <button
            type="button"
            onClick={() => {
              setShowMenu(false);
              setOpen(true);
              posthog.capture("temp_warning_orb_clicked");
            }}
            className="absolute -top-2 -right-2 flex h-7 w-7 items-center justify-center rounded-full bg-red-500 text-white shadow-md shadow-red-500/60 active:scale-90 transition"
            title="No temps logged today"
          >
            <Thermometer className="h-4 w-4" />
          </button>
        )}

        {showCleaningWarning && (
          <button
            type="button"
            onClick={() => {
              router.push("/cleaning-rota");
              posthog.capture("cleaning_warning_orb_clicked");
            }}
            className="absolute -top-2 -left-2 flex h-7 w-7 items-center justify-center rounded-full bg-sky-500 text-white shadow-md shadow-sky-500/60 active:scale-90 transition"
            title={`${openCleaning ?? 0} cleaning tasks outstanding`}
          >
            <Brush className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Quick choice menu */}
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
                    posthog.capture("fab_choose_quick_temp");
                  }}
                  className="w-full rounded-xl bg-gradient-to-r from-emerald-500 via-lime-500 to-emerald-500 px-3 py-2.5 text-sm font-semibold text-white shadow-sm shadow-emerald-500/40 hover:brightness-105"
                >
                  Quick temp log
                </button>

                <button
                  type="button"
                  onClick={async () => {
                    setShowMenu(false);
                    await openRoutinePicker();
                    posthog.capture("fab_choose_routine");
                  }}
                  className="w-full rounded-xl bg-slate-900 px-3 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-black"
                >
                  <span className="inline-flex items-center justify-center gap-2">
                    <ClipboardList className="h-4 w-4" />
                    Run a routine
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setShowMenu(false);
                    router.push("/wall");
                    posthog.capture("fab_choose_wall");
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

      {/* Routine picker modal */}
      {showPicker && (
        <div
          className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm"
          onClick={() => setShowPicker(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="mx-auto mt-10 w-full max-w-lg overflow-hidden rounded-2xl border border-white/30 bg-white/95 shadow-xl shadow-slate-900/25"
          >
            <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
              <div className="text-sm font-semibold text-slate-900">
                Choose a routine
              </div>
              <button
                type="button"
                className="rounded-lg bg-slate-100 px-2 py-1 text-xs text-slate-700 hover:bg-slate-200"
                onClick={() => setShowPicker(false)}
              >
                Close
              </button>
            </div>

            <div className="max-h-[70vh] overflow-y-auto p-4">
              {pickerLoading ? (
                <div className="py-8 text-center text-sm text-slate-500">
                  Loading…
                </div>
              ) : pickerErr ? (
                <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                  {pickerErr}
                </div>
              ) : pickerList.length === 0 ? (
                <div className="py-8 text-center text-sm text-slate-500">
                  No routines found.
                </div>
              ) : (
                <div className="space-y-2">
                  {pickerList.map((r) => (
                    <button
                      key={r.id ?? r.name}
                      type="button"
                      onClick={() => pickRoutine(r)}
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-left text-sm shadow-sm hover:bg-slate-50"
                    >
                      <div className="font-semibold text-slate-900">{r.name}</div>
                      <div className="text-[11px] text-slate-500">
                        {r.active ? "Active" : "Inactive"}
                      </div>
                    </button>
                  ))}
                </div>
              )}
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
            className="mx-auto mt-6 flex h-[72vh] w-full max-w-lg flex-col overflow-hidden rounded-t-2xl border border-white/30 bg-white/95 shadow-xl shadow-slate-900/25 sm:mt-24 sm:h-auto sm:rounded-2xl"
          >
            <div className="flex items-center justify-between border-b border-slate-200 bg-white/90 px-4 py-3">
              <div>
                <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                  Quick temp log
                </div>
                <div className="text-base font-semibold text-slate-900">
                  Add a temperature
                </div>
              </div>

              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-xl bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-200"
              >
                Close
              </button>
            </div>

            <div className="flex-1 space-y-3 overflow-y-auto p-4 text-sm">
              {/* voice controls */}
              <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-xs font-semibold text-slate-900">
                      Voice entry
                    </div>
                    <div className="text-[11px] text-slate-500">
                      Say: “Walk-in fridge 3.4 degrees JB”
                    </div>
                  </div>

                  {voiceSupported ? (
                    <button
                      type="button"
                      onClick={() => (listening ? stop() : start())}
                      className={cls(
                        "inline-flex items-center justify-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold text-white shadow-sm transition",
                        listening ? "bg-rose-600 hover:bg-rose-700" : "bg-slate-900 hover:bg-black"
                      )}
                    >
                      {listening ? (
                        <>
                          <MicOff className="h-4 w-4" />
                          Stop
                        </>
                      ) : (
                        <>
                          <Mic className="h-4 w-4" />
                          Start
                        </>
                      )}
                    </button>
                  ) : (
                    <div className="text-[11px] font-semibold text-slate-500">
                      Not supported
                    </div>
                  )}
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-medium text-slate-700">
                    Date
                  </label>
                  <input
                    type="date"
                    value={form.date}
                    onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
                    className="mt-1 h-10 w-full rounded-xl border border-slate-200 bg-white px-3 shadow-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700">
                    Initials
                  </label>
                  <select
                    value={form.staff_initials}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, staff_initials: e.target.value }))
                    }
                    className="mt-1 h-10 w-full rounded-xl border border-slate-200 bg-white px-3 shadow-sm"
                  >
                    <option value="">Select…</option>
                    {initials.map((i) => (
                      <option key={i} value={i}>
                        {i}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700">
                  Location / Area
                </label>
                <input
                  value={form.location}
                  onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))}
                  list="tt-areas"
                  className="mt-1 h-10 w-full rounded-xl border border-slate-200 bg-white px-3 shadow-sm"
                  placeholder="e.g. Walk-in fridge"
                />
                <datalist id="tt-areas">
                  {locations.map((l) => (
                    <option key={l} value={l} />
                  ))}
                </datalist>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700">
                  Item
                </label>
                <input
                  value={form.item}
                  onChange={(e) => setForm((f) => ({ ...f, item: e.target.value }))}
                  className="mt-1 h-10 w-full rounded-xl border border-slate-200 bg-white px-3 shadow-sm"
                  placeholder="e.g. Chicken curry hot hold"
                />
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-medium text-slate-700">
                    Target preset
                  </label>
                  <select
                    value={form.target_key}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, target_key: e.target.value }))
                    }
                    className="mt-1 h-10 w-full rounded-xl border border-slate-200 bg-white px-3 shadow-sm"
                  >
                    {TARGET_PRESETS.map((p) => (
                      <option key={p.key} value={p.key}>
                        {p.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700">
                    Temperature (°C)
                  </label>
                  <input
                    value={form.temp_c}
                    onChange={(e) => setForm((f) => ({ ...f, temp_c: e.target.value }))}
                    className="mt-1 h-10 w-full rounded-xl border border-slate-200 bg-white px-3 shadow-sm"
                    inputMode="decimal"
                    placeholder="e.g. 3.4"
                  />
                </div>
              </div>
            </div>

            <div className="border-t border-slate-200 bg-white/90 p-4">
              <button
                type="button"
                disabled={!canSave}
                onClick={handleSave}
                className={cls(
                  "w-full rounded-2xl px-4 py-3 text-sm font-semibold text-white shadow-sm transition",
                  canSave
                    ? "bg-gradient-to-r from-emerald-500 via-lime-500 to-emerald-500 hover:brightness-105"
                    : "cursor-not-allowed bg-slate-300"
                )}
              >
                Save temperature
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Routine run modal */}
      <RoutineRunModal
        open={!!runRoutine}
        routine={runRoutine as any}
        defaultDate={isoToday()}
        defaultInitials={form.staff_initials || ""}
        onClose={() => setRunRoutine(null)}
        onSaved={async () => {
          setRunRoutine(null);
          // routines may have side effects; keep KPIs fresh
          await refreshEntriesToday();
          await refreshCleaningOpen(true);
        }}
      />
    </>
  );
}

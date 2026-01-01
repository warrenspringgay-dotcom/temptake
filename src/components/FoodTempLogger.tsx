// src/components/FoodTempLogger.tsx
"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";

import { supabase } from "@/lib/supabaseBrowser";
import { getActiveOrgIdClient } from "@/lib/orgClient";
import { getActiveLocationIdClient } from "@/lib/locationClient";
import {
  LOCATION_PRESETS,
  TARGET_PRESETS,
  TARGET_BY_KEY,
  type TargetPreset,
} from "@/lib/temp-constants";
import RoutineRunModal from "@/components/RoutineRunModal";
import { CLEANING_CATEGORIES } from "@/components/ManageCleaningTasksModal";
import type { RoutineRow } from "@/components/RoutinePickerModal";

/* =============== Types =============== */
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

/* leaderboard / employee of month */
type EmployeeOfMonth = {
  display_name: string | null;
  points: number | null;
  temp_logs_count: number | null;
  cleaning_count: number | null;
};

/* cleaning rota types */
type Frequency = "daily" | "weekly" | "monthly";
type CleanTask = {
  id: string;
  org_id: string;
  area: string | null;
  task: string;
  category: string | null;
  frequency: Frequency;
  weekday: number | null;
  month_day: number | null;
};
type CleanRun = {
  task_id: string;
  run_on: string;
  done_by: string | null;
};

/* =============== Small helpers =============== */

function sameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function formatPrettyDate(d: Date) {
  const WEEKDAYS = [
    "Sunday",
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
  ];
  const MONTHS = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
  ];

  const weekday = WEEKDAYS[d.getDay()];
  const day = d.getDate();
  const month = MONTHS[d.getMonth()];
  const year = d.getFullYear();

  // No comma – always: Friday 14 November 2025
  return `${weekday} ${day} ${month} ${year}`;
}

const LS_LAST_INITIALS = "tt_last_initials";
const LS_LAST_LOCATION = "tt_last_location";

const cls = (...parts: Array<string | false | undefined>) =>
  parts.filter(Boolean).join(" ");

const firstLetter = (s: string | null | undefined) =>
  (s?.trim()?.charAt(0) || "").toUpperCase();

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
  if (!y || !m || !d) return iso!;
  return `${d}/${m}/${y}`;
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
      staff_initials:
        (r.staff_initials ?? r.initials ?? null)?.toString() ?? null,
      location: (r.area ?? r.location ?? null)?.toString() ?? null,
      item: (r.note ?? r.item ?? null)?.toString() ?? null,
      target_key: r.target_key != null ? String(r.target_key) : null,
      temp_c: temp,
      status: (r.status as any) ?? null,
    };
  });
}

/** ✅ Fix TS "implicit any" in sort callbacks everywhere */
type HasPosition = { position: number };
const byPosition = (a: HasPosition, b: HasPosition) => a.position - b.position;

/* cleaning rota helpers */
const isoToday = () => new Date().toISOString().slice(0, 10);
const nice = (yyyy_mm_dd: string) =>
  new Date(yyyy_mm_dd).toLocaleDateString(undefined, {
    weekday: "short",
    day: "2-digit",
    month: "short",
  });
const getDow1to7 = (ymd: string) => {
  const date = new Date(ymd);
  return ((date.getDay() + 6) % 7) + 1; // Mon=1..Sun=7
};
const getDom = (ymd: string) => new Date(ymd).getDate();

function isDueOn(t: CleanTask, ymd: string) {
  switch (t.frequency) {
    case "daily":
      return true;
    case "weekly":
      return t.weekday === getDow1to7(ymd);
    case "monthly":
      return t.month_day === getDom(ymd);
    default:
      return false;
  }
}

function CategoryPill({
  title,
  total,
  open,
  onClick,
}: {
  title: string;
  total: number;
  open: number;
  onClick: () => void;
}) {
  const hasOpen = open > 0;
  const color = hasOpen
    ? "bg-red-50/90 text-red-700 border-red-200"
    : "bg-emerald-50/90 text-emerald-700 border-emerald-200";

  return (
    <button
      onClick={onClick}
      className={cls(
        "flex min-h-[64px] flex-col justify-between rounded-xl border px-3 py-2 text-left text-sm shadow-sm transition",
        "backdrop-blur-sm",
        "hover:brightness-105",
        color
      )}
    >
      <div className="text-[13px] leading-tight">{title}</div>
      <div className="mt-1 text-lg font-semibold leading-none">
        {total}
        <span className="ml-1 text-[11px] opacity-75">({open} open)</span>
      </div>
    </button>
  );
}

function Pill({ done, onClick }: { done: boolean; onClick: () => void }) {
  return done ? (
    <button
      className="shrink-0 rounded-full bg-emerald-500/10 px-2 py-0.5 text-xs font-medium text-emerald-800 hover:bg-emerald-500/20"
      onClick={onClick}
      title="Mark incomplete"
    >
      Complete
    </button>
  ) : (
    <button
      className="shrink-0 rounded-full bg-red-500/10 px-2 py-0.5 text-xs font-medium text-red-700 hover:bg-red-500/20"
      onClick={onClick}
      title="Mark complete"
    >
      Incomplete
    </button>
  );
}

/* =============== Component =============== */
export default function FoodTempLogger({
  initials: initialsSeed = [],
  locations: locationsSeed = [],
}: Props) {
  const search = useSearchParams();

  // Modals
  const [showPicker, setShowPicker] = useState(false);
  const [runRoutine, setRunRoutine] = useState<RoutineRow | null>(null);

  // Inline picker data
  const [pickerLoading, setPickerLoading] = useState(false);
  const [pickerErr, setPickerErr] = useState<string | null>(null);
  const [pickerList, setPickerList] = useState<RoutineRow[]>([]);

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

  // Employee of the month (from leaderboard view)
  const [employeeOfMonth, setEmployeeOfMonth] =
    useState<EmployeeOfMonth | null>(null);

  // KPIs (training & allergen due/overdue)
  const [kpi, setKpi] = useState({
    trainingDueSoon: 0,
    trainingOver: 0,
    allergenDueSoon: 0,
    allergenOver: 0,
  });

  // Cleaning rota (today)
  const [tasks, setTasks] = useState<CleanTask[]>([]);
  const [runs, setRuns] = useState<CleanRun[]>([]);
  const runsKey = useMemo(() => {
    const m = new Map<string, CleanRun>();
    for (const r of runs) m.set(`${r.task_id}|${r.run_on}`, r);
    return m;
  }, [runs]);

  // initials selector for runs
  const [ini, setIni] = useState<string>("");

  // Completion modal (single + “complete all”)
  const [confirm, setConfirm] = useState<{
    ids: string[];
    run_on: string;
  } | null>(null);
  const [confirmLabel, setConfirmLabel] =
    useState<string>("Confirm completion");
  const [confirmInitials, setConfirmInitials] = useState("");

  // ✅ Corrective actions modal (only for FAIL)
  const [corrective, setCorrective] = useState<{
    open: boolean;
    tempLogId: string | null;
    tempC: number | null;
    targetKey: string | null;
    item: string | null;
    location: string | null;
    initials: string | null;
  }>({
    open: false,
    tempLogId: null,
    tempC: null,
    targetKey: null,
    item: null,
    location: null,
    initials: null,
  });

  const [correctiveForm, setCorrectiveForm] = useState({
    action: "",
    doRecheck: true,
    recheck_temp_c: "",
  });

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

  const canSave =
    !!form.date &&
    !!form.location &&
    !!form.item &&
    !!form.target_key &&
    form.temp_c.trim().length > 0;

  // Header date (uses form.date, so header follows the selected log date)
  const headerDateObj: Date = (() => {
    if (!form.date) return new Date();
    const d = new Date(form.date);
    return isNaN(d.getTime()) ? new Date() : d;
  })();
  const isTodayHeader = sameDay(headerDateObj, new Date());

  /* prime from localStorage */
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
      if (lsIni) setIni(lsIni.toUpperCase());
    } catch {}
  }, []);

  /* initials list (org-scoped) */
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
          setIni(merged[0]);
        }
      } catch {}
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialsSeed]);

  /* locations list (org + location-scoped) */
  useEffect(() => {
    (async () => {
      try {
        const orgId = await getActiveOrgIdClient();
        const locationId = await getActiveLocationIdClient();

        if (!orgId) {
          const base = Array.from(
            new Set([...locationsSeed, ...LOCATION_PRESETS])
          );
          setLocations(base.length ? base : ["Kitchen"]);
          if (!form.location)
            setForm((f) => ({ ...f, location: base[0] || "Kitchen" }));
          return;
        }

        let query = supabase
          .from("food_temp_logs")
          .select("area")
          .eq("org_id", orgId)
          .order("at", { ascending: false })
          .limit(500);

        if (locationId) {
          query = query.eq("location_id", locationId);
        }

        const { data } = await query;

        const fromAreas =
          (data ?? [])
            .map((r: any) => (r.area ?? "").toString().trim())
            .filter((s: string) => s.length > 0) || [];

        const merged = Array.from(
          new Set([...locationsSeed, ...LOCATION_PRESETS, ...fromAreas])
        );
        setLocations(merged.length ? merged : ["Kitchen"]);
        if (!form.location)
          setForm((f) => ({ ...f, location: merged[0] || "Kitchen" }));
      } catch {
        const base = Array.from(
          new Set([...locationsSeed, ...LOCATION_PRESETS])
        );
        setLocations(base.length ? base : ["Kitchen"]);
        if (!form.location)
          setForm((f) => ({ ...f, location: base[0] || "Kitchen" }));
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [locationsSeed]);

  /* KPI fetch (org-level) */
  useEffect(() => {
    (async () => {
      try {
        const orgId = await getActiveOrgIdClient();
        if (!orgId) return;

        const soon = new Date();
        soon.setDate(soon.getDate() + 14);
        const todayD = new Date();

        let trainingDueSoon = 0;
        let trainingOver = 0;
        let allergenDueSoon = 0;
        let allergenOver = 0;

        try {
          const { data } = await supabase
            .from("team_members")
            .select("training_expires_at,training_expiry,expires_at")
            .eq("org_id", orgId);

          (data ?? []).forEach((r: any) => {
            const raw =
              r.training_expires_at ??
              r.training_expiry ??
              r.expires_at ??
              null;
            if (!raw) return;
            const d = new Date(raw);
            if (isNaN(d.getTime())) return;
            if (d < todayD) trainingOver++;
            else if (d <= soon) trainingDueSoon++;
          });
        } catch {}

        try {
          const { data } = await supabase
            .from("allergen_review")
            .select("last_reviewed,interval_days")
            .eq("org_id", orgId);

          (data ?? []).forEach((r: any) => {
            const last = r.last_reviewed ? new Date(r.last_reviewed) : null;
            const interval = Number(r.interval_days ?? 0);
            if (!last || !Number.isFinite(interval)) return;
            const due = new Date(last);
            due.setDate(due.getDate() + interval);
            if (due < todayD) allergenOver++;
            else if (due <= soon) allergenDueSoon++;
          });
        } catch {}

        setKpi({ trainingDueSoon, trainingOver, allergenDueSoon, allergenOver });
      } catch {}
    })();
  }, []);

  /* Employee of the month fetch (leaderboard) */
  useEffect(() => {
    (async () => {
      try {
        const orgId = await getActiveOrgIdClient();
        if (!orgId) return;

        const { data, error } = await supabase
          .from("leaderboard")
          .select("display_name, points, temp_logs_count, cleaning_count")
          .eq("org_id", orgId)
          .order("points", { ascending: false })
          .limit(1);

        if (error) throw error;
        setEmployeeOfMonth(data?.[0] ?? null);
      } catch {
        setEmployeeOfMonth(null);
      }
    })();
  }, []);

  /* rows (org + location scoped) */
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

      const locationId = await getActiveLocationIdClient();

      let query = supabase
        .from("food_temp_logs")
        .select("*")
        .eq("org_id", orgId);

      if (locationId) {
        query = query.eq("location_id", locationId);
      }

      const { data, error } = await query
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

  /* Prefill first item via ?r= */
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
            location: String(it.location ?? ""),
            item: String(it.item ?? ""),
            target_key: String(it.target_key ?? "chill"),
          }))
          .sort(byPosition)[0];

        if (first) {
          setForm((f) => ({
            ...f,
            location: first.location || f.location,
            item: first.item || f.item,
            target_key: first.target_key || f.target_key,
          }));
        }
      } catch {}
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* open full Run modal via ?run=<routine_id> */
  useEffect(() => {
    const runId = search.get("run");
    if (!runId) return;

    (async () => {
      try {
        const { data: r, error: rErr } = await supabase
          .from("temp_routines")
          .select("id,name,active,last_used_at")
          .eq("id", runId)
          .maybeSingle();
        if (rErr || !r) return;

        const { data: items } = await supabase
          .from("temp_routine_items")
          .select("id,routine_id,position,location,item,target_key")
          .eq("routine_id", r.id);

        const routine: RoutineRow = {
          id: r.id,
          name: r.name,
          active: r.active ?? true,
          items: (items ?? [])
            .map((it: any) => ({
              id: String(it.id),
              routine_id: String(it.routine_id),
              position: Number(it.position ?? 0),
              location: it.location ?? null,
              item: it.item ?? null,
              target_key: String(it.target_key ?? "chill"),
            }))
            .sort(byPosition),
        };

        setRunRoutine(routine);
      } catch {}
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ===== Routines: inline picker (robust fallbacks) ===== */
  async function openRoutinePicker() {
    setShowPicker(true);
    setPickerErr(null);
    setPickerLoading(true);
    try {
      const orgId = await getActiveOrgIdClient();

      let rows: any[] = [];
      if (orgId) {
        const q1 = await supabase
          .from("temp_routines")
          .select("id,name,active")
          .eq("org_id", orgId)
          .order("name", { ascending: true });
        rows = q1.data ?? [];

        if (rows.length === 0) {
          const q2 = await supabase
            .from("temp_routines")
            .select("id,name,active")
            .eq("organisation_id", orgId)
            .order("name", { ascending: true });
          rows = q2.data ?? [];
        }
      }

      if (rows.length === 0) {
        const q3 = await supabase
          .from("routines")
          .select("id,name,active")
          .order("name", { ascending: true });
        rows = q3.data ?? [];
      }

      const list: RoutineRow[] =
        rows.map((r: any) => ({
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
        items: filled.items.sort(byPosition),
      });
    } catch (e: any) {
      alert(e?.message || "Failed to load routine items.");
    }
  }

  async function saveCorrectiveAction(args: {
    tempLogId: string;
    action: string;
    recheckTempC: number | null;
  }) {
    const org_id = await getActiveOrgIdClient();
    const location_id = await getActiveLocationIdClient();
    if (!org_id) throw new Error("No organisation found.");
    if (!location_id) throw new Error("No location selected.");

    const preset =
      corrective.targetKey != null
        ? (TARGET_BY_KEY as Record<string, TargetPreset | undefined>)[
            String(corrective.targetKey)
          ]
        : undefined;

    const recheckStatus =
      args.recheckTempC != null ? inferStatus(args.recheckTempC, preset) : null;

    const payload = {
      org_id,
      location_id,
      temp_log_id: args.tempLogId,
      action: args.action.trim(),
      recheck_temp_c: args.recheckTempC,
      recheck_at: args.recheckTempC != null ? new Date().toISOString() : null,
      recheck_status: recheckStatus,
      recorded_by: (corrective.initials ?? form.staff_initials ?? ini ?? "")
        .toUpperCase()
        .trim() || null,
    };

    const { error } = await supabase
      .from("food_temp_corrective_actions")
      .insert(payload);

    if (error) throw error;
  }

  /* save one entry (org + location scoped) */
  async function handleAddQuick() {
    const tempNum = Number.isFinite(Number(form.temp_c))
      ? Number(form.temp_c)
      : null;
    const preset = (
      TARGET_BY_KEY as Record<string, TargetPreset | undefined>
    )[form.target_key];
    const status: "pass" | "fail" | null = inferStatus(tempNum, preset);

    const org_id = await getActiveOrgIdClient();
    const location_id = await getActiveLocationIdClient();

    if (!org_id) {
      alert("No organisation found for this user.");
      return;
    }

    if (!location_id) {
      alert("No location selected.");
      return;
    }

    const payload = {
      org_id,
      location_id,
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

    // ✅ get inserted id so we can attach corrective actions
    const { data: inserted, error } = await supabase
      .from("food_temp_logs")
      .insert(payload)
      .select("id")
      .single();

    if (error) {
      alert(`Save failed: ${error.message}`);
      return;
    }

    try {
      if (form.staff_initials)
        localStorage.setItem(LS_LAST_INITIALS, form.staff_initials);
      if (form.location) localStorage.setItem(LS_LAST_LOCATION, form.location);
    } catch {}

    const justItem = form.item;
    const justLocation = form.location;
    const justTarget = form.target_key;
    const justIni = (form.staff_initials || ini || initials[0] || "")
      .toUpperCase()
      .trim();

    setForm((f) => ({ ...f, item: "", temp_c: "" }));
    await refreshRows();

    // ✅ auto-open corrective modal only when FAIL
    if (status === "fail" && inserted?.id) {
      setCorrective({
        open: true,
        tempLogId: String(inserted.id),
        tempC: tempNum,
        targetKey: justTarget ?? null,
        item: justItem || null,
        location: justLocation || null,
        initials: justIni || null,
      });
      setCorrectiveForm({ action: "", doRecheck: true, recheck_temp_c: "" });
    }
  }

  const onTempKeyDown: React.KeyboardEventHandler<HTMLInputElement> = (e) => {
    if (e.key === "Enter" && canSave) {
      e.preventDefault();
      handleAddQuick();
    }
  };

  /* grouped rows by date */
  const grouped = useMemo(() => {
    const map = new Map<string, CanonRow[]>();
    for (const r of rows) {
      const key = r.date ?? "—";
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(r);
    }
    return Array.from(map.entries())
      .sort((a: [string, CanonRow[]], b: [string, CanonRow[]]) =>
        a[0] < b[0] ? 1 : -1
      )
      .map(([date, list]) => ({ date, list }));
  }, [rows]);

  /* Cleaning rota: load today's due + runs (org + location scoped) */
  async function loadRotaToday() {
    try {
      const org_id = await getActiveOrgIdClient();
      const locationId = await getActiveLocationIdClient();
      if (!org_id || !locationId) return;

      const todayISO = isoToday();

      const { data: tData } = await supabase
        .from("cleaning_tasks")
        .select(
          "id, org_id, location_id, area, task, category, frequency, weekday, month_day"
        )
        .eq("org_id", org_id)
        .eq("location_id", locationId);

      const all: CleanTask[] =
        (tData ?? []).map((r: any) => ({
          id: String(r.id),
          org_id: String(r.org_id),
          area: r.area ?? null,
          task: r.task ?? r.name ?? "",
          category: r.category ?? null,
          frequency: (r.frequency ?? "daily") as Frequency,
          weekday: r.weekday ? Number(r.weekday) : null,
          month_day: r.month_day ? Number(r.month_day) : null,
        })) || [];

      setTasks(all);

      const { data: rData } = await supabase
        .from("cleaning_task_runs")
        .select("task_id,run_on,done_by,location_id")
        .eq("org_id", org_id)
        .eq("location_id", locationId)
        .eq("run_on", todayISO);

      setRuns(
        (rData ?? []).map((r: any) => ({
          task_id: String(r.task_id),
          run_on: r.run_on as string,
          done_by: r.done_by ?? null,
        }))
      );
    } catch {}
  }
  useEffect(() => {
    loadRotaToday();
  }, []);

  const todayISO = isoToday();
  const dueTodayAll = useMemo(
    () => tasks.filter((t) => isDueOn(t, todayISO)),
    [tasks, todayISO]
  );
  const dueDaily = useMemo(
    () => dueTodayAll.filter((t) => t.frequency === "daily"),
    [dueTodayAll]
  );
  const dueNonDaily = useMemo(
    () => dueTodayAll.filter((t) => t.frequency !== "daily"),
    [dueTodayAll]
  );
  const doneCount = useMemo(
    () => dueTodayAll.filter((t) => runsKey.has(`${t.id}|${todayISO}`)).length,
    [dueTodayAll, runsKey, todayISO]
  );

  const dailyByCat = useMemo(() => {
    const map = new Map<string, CleanTask[]>();
    for (const c of CLEANING_CATEGORIES) map.set(c, []);
    for (const t of dueDaily) {
      const key = t.category ?? "Opening checks";
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(t);
    }
    return map;
  }, [dueDaily]);

  // List of tasks included in the current confirm modal (for display)
  const confirmTasks = useMemo(
    () => (confirm ? tasks.filter((t) => confirm.ids.includes(t.id)) : []),
    [confirm, tasks]
  );

  /* complete api (org + location scoped) */
  async function completeTasks(ids: string[], iniVal: string) {
    if (!ids.length) {
      setConfirm(null);
      setConfirmInitials("");
      return;
    }

    try {
      const org_id = await getActiveOrgIdClient();
      const locationId = await getActiveLocationIdClient();

      if (!org_id) {
        alert("No organisation found.");
        return;
      }
      if (!locationId) {
        alert("No location selected.");
        return;
      }

      const run_on = todayISO;

      const payload = ids.map((id) => ({
        org_id,
        location_id: locationId,
        task_id: id,
        run_on,
        done_by: iniVal.toUpperCase(),
      }));

      const { error } = await supabase
        .from("cleaning_task_runs")
        .upsert(payload, {
          onConflict: "task_id,run_on",
          ignoreDuplicates: true,
        });

      if (error) throw error;

      await loadRotaToday();
    } catch (e: any) {
      alert(e?.message || "Failed to save completion.");
    } finally {
      setConfirm(null);
      setConfirmInitials("");
    }
  }

  async function uncompleteTask(id: string) {
    try {
      const org_id = await getActiveOrgIdClient();
      const locationId = await getActiveLocationIdClient();
      if (!org_id || !locationId) return;

      const { error } = await supabase
        .from("cleaning_task_runs")
        .delete()
        .eq("org_id", org_id)
        .eq("location_id", locationId)
        .eq("task_id", id)
        .eq("run_on", todayISO);
      if (error) throw error;
      setRuns((prev) =>
        prev.filter((r) => !(r.task_id === id && r.run_on === todayISO))
      );
    } catch (e: any) {
      alert(e?.message || "Failed to undo completion.");
    }
  }

  return (
    <div className="space-y-6">
      {/* Big centred header, like Cleaning Rota */}
      <div className="text-center">
        <h1 className="text-lg font-semibold text-slate-900 sm:text-xl">
          {/* Title intentionally blank per your current design */}
        </h1>

        <div className="mt-3">
          <div className="text-xs font-semibold uppercase tracking-[0.25em] text-slate-400">
            {isTodayHeader ? "Today" : "Selected date"}
          </div>
          <div className="mt-1 text-xl font-semibold text-slate-900 sm:text-2xl">
            {formatPrettyDate(headerDateObj)}
          </div>
        </div>
      </div>

      {/* KPI grid + pills */}
      <div className="space-y-4 rounded-3xl border border-white/30 bg-white/70 p-4 shadow-lg shadow-slate-900/10 backdrop-blur">
        {(() => {
          const todayISO = new Date().toISOString().slice(0, 10);
          const since = new Date(Date.now() - 7 * 24 * 3600 * 1000);
          const in7d = (d: string | null) => (d ? new Date(d) >= since : false);

          const entriesToday = rows.filter((r) => r.date === todayISO).length;
          const last7 = rows.filter((r) => in7d(r.date)).length;
          const fails7 = rows.filter((r) => in7d(r.date) && r.status === "fail")
            .length;

          const entriesTodayIsEmpty = entriesToday === 0;
          const entriesTodayIcon = entriesTodayIsEmpty ? "❌" : "✅";
          const entriesTodayTile =
            "rounded-xl p-3 min-h-[76px] flex flex-col justify-between border shadow-sm backdrop-blur-sm " +
            (entriesTodayIsEmpty
              ? "border-red-200 bg-red-50/90 text-red-800"
              : "border-emerald-200 bg-emerald-50/90 text-emerald-900");

          const hasCleaning = dueTodayAll.length > 0;
          const allCleaningDone = hasCleaning && doneCount === dueTodayAll.length;
          const cleaningIcon = !hasCleaning ? "ℹ️" : allCleaningDone ? "✅" : "❌";
          const cleaningColor = !hasCleaning
            ? "border-gray-200 bg-white/80 text-gray-800"
            : allCleaningDone
            ? "border-emerald-200 bg-emerald-50/90 text-emerald-900"
            : "border-red-200 bg-red-50/90 text-red-800";

          const cleaningTileBase =
            "rounded-xl p-3 min-h-[76px] text-left flex flex-col justify-between border shadow-sm backdrop-blur-sm transition hover:brightness-105";

          const failsTileColor =
            fails7 > 0
              ? "border-red-200 bg-red-50/90 text-red-800"
              : "border-gray-200 bg-white/80 text-gray-800";
          const failsIcon = fails7 > 0 ? "⚠️" : "✅";

          const eomName = employeeOfMonth?.display_name || "—";
          const eomPoints = employeeOfMonth?.points ?? 0;
          const eomTemp = employeeOfMonth?.temp_logs_count ?? 0;
          const eomClean = employeeOfMonth?.cleaning_count ?? 0;

          return (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
              {/* tile 1: Entries today */}
              <div className={entriesTodayTile}>
                <div className="flex items-center justify-between text-xs">
                  <span>Entries today</span>
                  <span className="text-base">{entriesTodayIcon}</span>
                </div>
                <div className="mt-1 text-2xl font-semibold">{entriesToday}</div>
                <div className="mt-1 hidden text-[11px] opacity-80 md:block">
                  {entriesTodayIsEmpty
                    ? "No temperatures logged yet today."
                    : "Great — at least one log recorded."}
                </div>
              </div>

              {/* tile 2: Last 7 days */}
              <div className="flex min-h-[76px] flex-col justify-between rounded-xl border border-gray-200 bg-white/80 p-3 text-gray-800 shadow-sm backdrop-blur-sm">
                <div className="text-xs text-gray-500">Last 7 days</div>
                <div className="mt-1 text-2xl font-semibold">{last7}</div>
              </div>

              {/* tile 3: Failures (7d) */}
              <div
                className={
                  "flex min-h-[76px] flex-col justify-between rounded-xl border p-3 text-xs shadow-sm backdrop-blur-sm " +
                  failsTileColor
                }
              >
                <div className="flex items-center justify-between text-xs">
                  <span>Failures (7d)</span>
                  <span className="text-base">{failsIcon}</span>
                </div>
                <div className="mt-1 text-2xl font-semibold">{fails7}</div>
                <div className="mt-1 hidden text-[11px] opacity-80 md:block">
                  {fails7 > 0
                    ? "Check and record any corrective actions."
                    : "No failed temperature checks in the last week."}
                </div>
              </div>

              {/* tile 4: Employee of the month (from leaderboard) */}
              <div className="flex min-h-[76px] flex-col justify-between rounded-xl border border-amber-200 bg-amber-50/90 p-3 text-amber-900 shadow-sm backdrop-blur-sm">
                <div className="flex items-center justify-between text-xs">
                  <span>Employee of the month</span>
                  <span className="text-lg">🏆</span>
                </div>
                <div className="mt-1 text-lg font-semibold truncate">{eomName}</div>
                <div className="mt-1 text-[11px] opacity-80 md:block">
                  {eomPoints
                    ? `${eomPoints} pts · Temps ${eomTemp} · Cleaning ${eomClean}`
                    : "Based on points from cleaning & temp logs."}
                </div>
              </div>

              {/* tile 5: Cleaning (today) */}
              <button
                type="button"
                onClick={() => {
                  const ids = dueTodayAll
                    .filter((t) => !runsKey.has(`${t.id}|${todayISO}`))
                    .map((t) => t.id);
                  setConfirm({ ids, run_on: todayISO });
                  setConfirmLabel("Complete all today");
                  setConfirmInitials(form.staff_initials || ini || initials[0] || "");
                }}
                className={`${cleaningTileBase} ${cleaningColor}`}
                title="View and complete today’s cleaning tasks"
              >
                <div className="flex items-center justify-between text-xs">
                  <span>Cleaning (today)</span>
                  <span className="text-base">{cleaningIcon}</span>
                </div>
                <div className="mt-1 text-2xl font-semibold">
                  {doneCount}/{dueTodayAll.length}
                </div>
                <div className="mt-1 hidden text-[11px] underline opacity-80 md:block">
                  {hasCleaning
                    ? allCleaningDone
                      ? "All cleaning tasks completed."
                      : "Click to complete remaining tasks."
                    : "No cleaning tasks scheduled for today."}
                </div>
              </button>
            </div>
          );
        })()}

        {/* KPI pills row – simple training/allergen overview */}
        <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-slate-600">
          <span className="rounded-full bg-amber-50 px-2 py-0.5">
            Training due soon: <span className="font-semibold">{kpi.trainingDueSoon}</span>
          </span>
          <span className="rounded-full bg-red-50 px-2 py-0.5">
            Training overdue: <span className="font-semibold">{kpi.trainingOver}</span>
          </span>
          <span className="rounded-full bg-amber-50 px-2 py-0.5">
            Allergen review due soon:{" "}
            <span className="font-semibold">{kpi.allergenDueSoon}</span>
          </span>
          <span className="rounded-full bg-red-50 px-2 py-0.5">
            Allergen review overdue:{" "}
            <span className="font-semibold">{kpi.allergenOver}</span>
          </span>
        </div>

        {err && (
          <div className="mt-2 rounded-md border border-red-200 bg-red-50/90 px-3 py-2 text-sm text-red-800">
            {err}
          </div>
        )}
      </div>

      {/* ======= Today’s Cleaning Tasks (dashboard card) ======= */}
      <div className="rounded-3xl border border-white/30 bg-white/70 p-4 shadow-lg shadow-slate-900/10 backdrop-blur">
        <div className="mb-2 flex items-center gap-2">
          <h2 className="text-lg font-semibold">Today’s Cleaning Tasks</h2>

          <div className="ml-auto flex items-center gap-2">
            <div className="rounded-xl border border-gray-200 bg-white/70 px-3 py-1.5 text-sm shadow-sm">
              {doneCount}/{dueTodayAll.length}
            </div>
            <button
              className="inline-flex items-center justify-center whitespace-nowrap rounded-2xl bg-gradient-to-r from-emerald-500 via-lime-500 to-emerald-500 px-3 py-1.5 text-sm font-medium text-white shadow-sm shadow-emerald-500/30 hover:brightness-105 disabled:opacity-60"
              onClick={() => {
                const ids = dueTodayAll
                  .filter((t) => !runsKey.has(`${t.id}|${todayISO}`))
                  .map((t) => t.id);
                setConfirm({ ids, run_on: todayISO });
                setConfirmLabel("Complete all today");
                setConfirmInitials(ini || form.staff_initials || initials[0] || "");
              }}
              disabled={
                !dueTodayAll.length ||
                dueTodayAll.every((t) => runsKey.has(`${t.id}|${todayISO}`))
              }
            >
              Complete All
            </button>
          </div>
        </div>

        {/* Weekly/Monthly only */}
        <div className="space-y-2">
          <div className="text-[11px] font-semibold uppercase text-gray-500">
            Weekly / Monthly
          </div>
          {dueNonDaily.length === 0 ? (
            <div className="rounded-xl border border-gray-200 bg-white/70 p-3 text-sm text-gray-500 shadow-sm">
              No tasks.
            </div>
          ) : (
            <>
              {dueNonDaily.map((t) => {
                const key = `${t.id}|${todayISO}`;
                const done = runsKey.has(key);
                const run = runsKey.get(key) || null;
                return (
                  <div
                    key={t.id}
                    className="flex items-start justify-between gap-2 rounded-xl border border-gray-200 bg-white/80 px-2 py-2 text-sm shadow-sm backdrop-blur-sm"
                  >
                    <div className={done ? "text-gray-500 line-through" : ""}>
                      <div className="font-medium">{t.task}</div>
                      <div className="text-xs text-gray-500">
                        {t.category ?? t.area ?? "—"} •{" "}
                        {t.frequency === "weekly" ? "Weekly" : "Monthly"}
                      </div>
                      {run?.done_by && (
                        <div className="text-[11px] text-gray-400">
                          Done by {run.done_by}
                        </div>
                      )}
                    </div>
                    <Pill
                      done={done}
                      onClick={() =>
                        done
                          ? uncompleteTask(t.id)
                          : completeTasks([t.id], ini || form.staff_initials || "")
                      }
                    />
                  </div>
                );
              })}
            </>
          )}
        </div>

        {/* Daily – category summary only */}
        <div className="mt-4 space-y-2">
          <div className="text-[11px] font-semibold uppercase text-gray-500">
            Daily tasks (by category)
          </div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
            {CLEANING_CATEGORIES.map((cat) => {
              const list = dailyByCat.get(cat) ?? [];
              const open = list.filter(
                (t) => !runsKey.has(`${t.id}|${todayISO}`)
              ).length;
              return (
                <CategoryPill
                  key={cat}
                  title={cat}
                  total={list.length}
                  open={open}
                  onClick={() => {
                    const ids = list
                      .filter((t) => !runsKey.has(`${t.id}|${todayISO}`))
                      .map((t) => t.id);
                    setConfirm({ ids, run_on: todayISO });
                    setConfirmLabel(`Complete: ${cat}`);
                    setConfirmInitials(ini || form.staff_initials || initials[0] || "");
                  }}
                />
              );
            })}
          </div>
        </div>
      </div>

      {/* ======= ENTRY FORM ======= */}
      <div className="rounded-3xl border border-white/30 bg-white/70 p-4 shadow-lg shadow-slate-900/10 backdrop-blur">
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <h2 className="text-lg font-semibold">Enter Temperature Log</h2>
          <div className="ml-auto flex items-center gap-2">
            <button
              type="button"
              onClick={openRoutinePicker}
              className="rounded-2xl border border-slate-200 bg-white/70 px-3 py-1.5 text-sm text-slate-800 shadow-sm hover:bg-white"
              title="Pick a routine"
            >
              Use routine
            </button>

            <button
              type="button"
              onClick={() => setFormOpen((v) => !v)}
              className="flex items-center gap-1 rounded-2xl border border-slate-200 bg-white/70 px-3 py-1.5 text-sm text-slate-800 shadow-sm hover:bg-white"
              title="Hide or show entry form"
              aria-expanded={formOpen}
            >
              {formOpen ? "Hide" : "Show"}
              <span className={`transition-transform ${formOpen ? "rotate-180" : ""}`}>
                ▾
              </span>
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
                className="h-10 w-full rounded-xl border border-slate-200 bg-white/80 px-3 py-2 shadow-sm"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs text-gray-500">Initials</label>
              <select
                value={form.staff_initials}
                onChange={(e) => {
                  const v = e.target.value.toUpperCase();
                  setForm((f) => ({ ...f, staff_initials: v }));
                  setIni(v);
                  try {
                    localStorage.setItem(LS_LAST_INITIALS, v);
                  } catch {}
                }}
                className="h-10 w-full rounded-xl border border-slate-200 bg-white/80 px-3 py-2 uppercase shadow-sm"
              >
                {!form.staff_initials && initials.length === 0 && (
                  <option value="" disabled>
                    Loading initials…
                  </option>
                )}
                {initials.map((iniVal) => (
                  <option key={iniVal} value={iniVal}>
                    {iniVal}
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
                className="h-10 w-full rounded-xl border border-slate-200 bg-white/80 px-3 py-2 shadow-sm"
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
                className="h-10 w-full rounded-xl border border-slate-200 bg-white/80 px-3 py-2 shadow-sm"
                placeholder="e.g., Chicken curry"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs text-gray-500">Target</label>
              <select
                value={form.target_key}
                onChange={(e) => setForm((f) => ({ ...f, target_key: e.target.value }))}
                className="h-10 w-full rounded-xl border border-slate-200 bg-white/80 px-3 py-2 text-xs shadow-sm"
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
                className="h-10 w-full rounded-xl border border-slate-200 bg-white/80 px-3 py-2 shadow-sm"
                inputMode="decimal"
                placeholder="e.g., 5.0"
              />
            </div>

            <div className="lg:col-span-6">
              <button
                onClick={handleAddQuick}
                disabled={!canSave}
                className={cls(
                  "rounded-2xl px-4 py-2 text-sm font-medium text-white shadow-sm shadow-emerald-500/30",
                  canSave
                    ? "bg-gradient-to-r from-emerald-500 via-lime-500 to-emerald-500 hover:brightness-105"
                    : "bg-gray-400 cursor-not-allowed"
                )}
              >
                Save quick entry
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ✅ Corrective action modal */}
      {corrective.open && (
        <div
          className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm"
          onClick={() => setCorrective((c) => ({ ...c, open: false }))}
        >
          <form
            onClick={(e) => e.stopPropagation()}
            onSubmit={async (e) => {
              e.preventDefault();
              const id = corrective.tempLogId;
              if (!id) return;

              const action = correctiveForm.action.trim();
              if (!action) return;

              const recheckTemp =
                correctiveForm.doRecheck && correctiveForm.recheck_temp_c.trim().length
                  ? Number(correctiveForm.recheck_temp_c)
                  : null;

              try {
                await saveCorrectiveAction({
                  tempLogId: id,
                  action,
                  recheckTempC: Number.isFinite(recheckTemp as any) ? recheckTemp : null,
                });

                setCorrective((c) => ({ ...c, open: false }));
                setCorrectiveForm({ action: "", doRecheck: true, recheck_temp_c: "" });
              } catch (err: any) {
                alert(err?.message || "Failed to save corrective action.");
              }
            }}
            className="mx-auto mt-6 flex h-[75vh] w-full max-w-sm flex-col overflow-hidden rounded-t-2xl border border-white/30 bg-white/90 shadow-xl shadow-slate-900/25 backdrop-blur sm:mt-24 sm:h-auto sm:rounded-2xl"
          >
            <div className="sticky top-0 z-10 border-b bg-white/90 px-4 py-3 text-base font-semibold">
              Corrective action required (FAIL)
            </div>

            <div className="grow space-y-3 overflow-y-auto px-4 py-3 text-sm">
              <div className="rounded-xl border border-red-200 bg-red-50/80 p-2 text-red-900">
                <div className="font-semibold">Failed temperature logged</div>
                <div className="mt-1 text-xs opacity-90">
                  {corrective.location ?? "—"} • {corrective.item ?? "—"} •{" "}
                  {corrective.tempC != null ? `${corrective.tempC}°C` : "—"} •{" "}
                  {(corrective.initials ?? "—").toUpperCase()}
                </div>
              </div>

              <label className="block">
                <div className="mb-1 text-gray-600">What corrective action did you take?</div>
                <textarea
                  value={correctiveForm.action}
                  onChange={(e) => setCorrectiveForm((f) => ({ ...f, action: e.target.value }))}
                  className="min-h-[96px] w-full rounded-xl border border-slate-200 bg-white/80 px-3 py-2 shadow-sm"
                  placeholder="Example: moved item to working fridge, adjusted thermostat, discarded batch, called engineer…"
                  required
                />
              </label>

              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={correctiveForm.doRecheck}
                  onChange={(e) =>
                    setCorrectiveForm((f) => ({ ...f, doRecheck: e.target.checked }))
                  }
                />
                Record a re-check temperature now
              </label>

              {correctiveForm.doRecheck && (
                <label className="block">
                  <div className="mb-1 text-gray-600">Re-check temp (°C)</div>
                  <input
                    value={correctiveForm.recheck_temp_c}
                    onChange={(e) =>
                      setCorrectiveForm((f) => ({ ...f, recheck_temp_c: e.target.value }))
                    }
                    inputMode="decimal"
                    className="h-10 w-full rounded-xl border border-slate-200 bg-white/80 px-3 py-2 shadow-sm"
                    placeholder="e.g. 3.2"
                  />
                </label>
              )}
            </div>

            <div className="sticky bottom-0 z-10 flex items-center justify-end gap-2 border-t bg-white/90 px-4 py-3">
              <button
                type="button"
                className="rounded-md px-3 py-1.5 text-sm hover:bg-gray-50"
                onClick={() => setCorrective((c) => ({ ...c, open: false }))}
              >
                Close
              </button>
              <button
                type="submit"
                className="rounded-2xl bg-slate-900 px-3 py-1.5 text-sm font-medium text-white shadow-sm hover:bg-slate-800"
              >
                Save corrective action
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ===== Inline Routine Picker Modal ===== */}
      {showPicker && (
        <div
          className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm"
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
                        {!r.active && <div className="text-xs text-gray-500">Inactive</div>}
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

      {/* Full run modal */}
      <RoutineRunModal
        open={!!runRoutine}
        routine={runRoutine}
        defaultDate={form.date}
        defaultInitials={form.staff_initials}
        onClose={() => setRunRoutine(null)}
        onSaved={async () => {
          await refreshRows();
        }}
      />

      {/* ======= LOGS ======= */}
      <div className="rounded-3xl border border-white/30 bg-white/70 p-4 shadow-lg shadow-slate-900/10 backdrop-blur">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Temperature Logs</h2>
          <button
            onClick={refreshRows}
            className="rounded-2xl border border-slate-200 bg-white/80 px-3 py-1.5 text-sm text-slate-800 shadow-sm hover:bg-white"
          >
            Refresh
          </button>
        </div>

        {/* Desktop/tablet – grouped by date */}
        <div className="hidden overflow-x-auto md:block">
          <table className="w-full table-fixed text-sm">
            <thead className="bg-slate-50/80 text-slate-600">
              <tr className="text-left text-[11px] font-semibold uppercase tracking-wide">
                <th className="w-[8.5rem] px-3 py-2">Date</th>
                <th className="w-16 px-3 py-2">Initials</th>
                <th className="w-[9rem] px-3 py-2">Location</th>
                <th className="w-[10rem] px-3 py-2">Item</th>
                <th className="w-[10rem] px-3 py-2">Target</th>
                <th className="w-[7rem] px-3 py-2">Temp (°C)</th>
                <th className="w-[6.5rem] px-3 py-2 text-right">Status</th>
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
                    {/* Date header row */}
                    <tr className="border-t bg-slate-50/80">
                      <td
                        colSpan={7}
                        className="px-3 py-2 text-sm font-semibold text-slate-700"
                      >
                        {formatDDMMYYYY(g.date)}
                      </td>
                    </tr>
                    {/* Rows for that date */}
                    {g.list.map((r) => {
                      const preset: TargetPreset | undefined = r.target_key
                        ? (TARGET_BY_KEY as any)[r.target_key]
                        : undefined;
                      const st = r.status ?? inferStatus(r.temp_c, preset);
                      return (
                        <tr key={r.id} className="border-t bg-white/80">
                          <td className="px-3 py-2 text-xs text-gray-400"></td>
                          <td className="px-3 py-2 font-medium uppercase">
                            {r.staff_initials ?? "—"}
                          </td>
                          <td className="px-3 py-2">{r.location ?? "—"}</td>
                          <td className="px-3 py-2">{r.item ?? "—"}</td>
                          <td className="px-3 py-2">
                            {preset
                              ? `${preset.label}${
                                  preset.minC != null || preset.maxC != null
                                    ? ` (${preset.minC ?? "−∞"}–${preset.maxC ?? "+∞"} °C)`
                                    : ""
                                }`
                              : "—"}
                          </td>
                          <td className="px-3 py-2">{r.temp_c ?? "—"}</td>
                          <td className="px-3 py-2 text-right">
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

        {/* Mobile cards */}
        <div className="space-y-2 md:hidden">
          {loading ? (
            <div className="py-4 text-center text-sm text-gray-500">Loading…</div>
          ) : grouped.length ? (
            grouped.map((g) => (
              <div key={g.date}>
                <div className="mb-1 text-xs font-medium text-gray-600">
                  {formatDDMMYYYY(g.date)}
                </div>
                <div className="space-y-2">
                  {g.list.map((r) => {
                    const preset: TargetPreset | undefined = r.target_key
                      ? (TARGET_BY_KEY as any)[r.target_key]
                      : undefined;
                    const st = r.status ?? inferStatus(r.temp_c, preset);
                    return (
                      <div
                        key={r.id}
                        className="rounded-xl border border-slate-200 bg-white/80 p-3 shadow-sm"
                      >
                        <div className="flex items-center justify-between">
                          <div className="text-sm font-medium">{r.item ?? "—"}</div>
                          {st && (
                            <span
                              className={cls(
                                "ml-2 rounded-full px-2 py-0.5 text-[11px] font-medium",
                                st === "pass"
                                  ? "bg-emerald-100 text-emerald-800"
                                  : "bg-red-100 text-red-800"
                              )}
                            >
                              {st}
                            </span>
                          )}
                        </div>
                        <div className="mt-1 text-xs text-gray-600">
                          {r.location ?? "—"} • {r.staff_initials ?? "—"} •{" "}
                          {r.temp_c ?? "—"}°C
                        </div>
                        <div className="mt-1 text-[11px] text-gray-500">
                          Target:{" "}
                          {preset
                            ? `${preset.label}${
                                preset.minC != null || preset.maxC != null
                                  ? ` (${preset.minC ?? "−∞"}–${preset.maxC ?? "+∞"} °C)`
                                  : ""
                              }`
                            : "—"}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))
          ) : (
            <div className="py-4 text-center text-sm text-gray-500">No entries</div>
          )}
        </div>
      </div>

      {/* Cleaning completion modal – shows individual tasks */}
      {confirm && (
        <div
          className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm"
          onClick={() => setConfirm(null)}
        >
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!confirmInitials.trim()) return;
              completeTasks(confirm.ids, confirmInitials.trim());
            }}
            onClick={(e) => e.stopPropagation()}
            className="mx-auto mt-6 flex h-[70vh] w-full max-w-sm flex-col overflow-hidden rounded-t-2xl border border-white/30 bg-white/90 shadow-xl shadow-slate-900/25 backdrop-blur sm:mt-24 sm:h-auto sm:rounded-2xl"
          >
            <div className="sticky top-0 z-10 border-b bg-white/90 px-4 py-3 text-base font-semibold">
              {confirmLabel}
            </div>
            <div className="grow space-y-3 overflow-y-auto px-4 py-3 text-sm">
              <div className="rounded-xl border border-slate-200 bg-slate-50/90 p-2">
                <div className="font-medium">{confirm.ids.length} task(s)</div>
                <div className="mt-1 text-xs text-gray-500">
                  For <strong>{nice(confirm.run_on)}</strong>
                </div>
              </div>

              {confirmTasks.length > 0 && (
                <div className="rounded-xl border border-slate-200 bg-white/90 p-2">
                  <div className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-gray-500">
                    Tasks to mark complete
                  </div>
                  <ul className="space-y-2 text-sm">
                    {confirmTasks.map((t) => (
                      <li
                        key={t.id}
                        className="rounded-lg border border-slate-100 bg-slate-50/80 px-2 py-1.5"
                      >
                        <div className="font-medium">{t.task}</div>
                        <div className="text-[11px] text-gray-500">
                          {t.category ?? t.area ?? "—"} •{" "}
                          {t.frequency === "daily"
                            ? "Daily"
                            : t.frequency === "weekly"
                            ? "Weekly"
                            : "Monthly"}
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <label className="block text-sm">
                <div className="mb-1 text-gray-600">Initials</div>
                <select
                  className="w-full rounded-xl border border-slate-200 bg-white/80 px-2 py-1.5 uppercase shadow-sm"
                  value={confirmInitials}
                  onChange={(e) => setConfirmInitials(e.target.value.toUpperCase())}
                  required
                >
                  <option value="" disabled>
                    Select…
                  </option>
                  {initials.map((i) => (
                    <option key={i} value={i}>
                      {i}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <div className="sticky bottom-0 z-10 flex items-center justify-end gap-2 border-t bg-white/90 px-4 py-3">
              <button
                type="button"
                className="rounded-md px-3 py-1.5 text-sm hover:bg-gray-50"
                onClick={() => setConfirm(null)}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="rounded-2xl bg-gradient-to-r from-emerald-500 via-lime-500 to-emerald-500 px-3 py-1.5 text-sm font-medium text-white shadow-sm shadow-emerald-500/30 hover:brightness-105"
              >
                Mark tasks complete
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

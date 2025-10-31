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

/* ---- Cleaning rota types ---- */
type Frequency = "daily" | "weekly" | "monthly";
type CleanTask = {
  id: string; // bigint in DB; keep as string and cast when writing
  area: string | null;
  task: string;
  frequency: Frequency;
  weekday: number | null;   // 1..7 (Mon..Sun)
  month_day: number | null; // 1..31
};
type CleanRun = {
  task_id: string;
  run_on: string; // yyyy-mm-dd
  done_by: string | null;
};

/* ================== Helpers ================== */
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

/* ---- cleaning rota helpers ---- */
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

/* ================== Component ================== */
export default function FoodTempLogger({
  initials: initialsSeed = [],
  locations: locationsSeed = [],
}: Props) {
  const search = useSearchParams();

  // Modals
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

  // Completion modal (single + “complete all daily”)
  const [confirm, setConfirm] = useState<{ ids: string[]; run_on: string } | null>(null);
  const [confirmLabel, setConfirmLabel] = useState<string>("Confirm completion");
  const [confirmInitials, setConfirmInitials] = useState("");

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
          .order("at", { ascending: false })
          .limit(500);

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

  /* ---------- KPI fetch (due vs overdue) ---------- */
  useEffect(() => {
    (async () => {
      try {
        const orgId = await getActiveOrgIdClient();
        if (!orgId) return;

        const soon = new Date();
        soon.setDate(soon.getDate() + 14);
        const today = new Date();

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
            const raw = r.training_expires_at ?? r.training_expiry ?? r.expires_at ?? null;
            if (!raw) return;
            const d = new Date(raw);
            if (isNaN(d.getTime())) return;
            if (d < today) trainingOver++;
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
            if (due < today) allergenOver++;
            else if (due <= soon) allergenDueSoon++;
          });
        } catch {}

        setKpi({ trainingDueSoon, trainingOver, allergenDueSoon, allergenOver });
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

  /* ---------- Prefill first item via ?r= ---------- */
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
      } catch {}
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ---------- NEW: open full Run modal via ?run=<routine_id> ---------- */
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
          items:
            (items ?? [])
              .map((it: any) => ({
                id: it.id,
                routine_id: it.routine_id,
                position: Number(it.position ?? 0),
                location: it.location ?? null,
                item: it.item ?? null,
                target_key: it.target_key ?? "chill",
              }))
              .sort((a, b) => a.position - b.position),
        };

        setRunRoutine(routine);
      } catch {
        /* ignore */
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ---------- saving one entry ---------- */
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
      at: form.date, // YYYY-MM-DD
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

  /* ---------- Cleaning rota: load today's due + runs ---------- */
  async function loadRotaToday() {
    try {
      const org_id = await getActiveOrgIdClient();
      if (!org_id) return;

      const today = isoToday();

      const { data: tData } = await supabase
        .from("cleaning_tasks")
        .select("id,area,task,frequency,weekday,month_day")
        .eq("org_id", org_id);

      const all: CleanTask[] =
        (tData ?? []).map((r: any) => ({
          id: String(r.id),
          area: r.area ?? null,
          task: r.task ?? r.name ?? "",
          frequency: (r.frequency ?? "daily") as Frequency,
          weekday: r.weekday ? Number(r.weekday) : null,
          month_day: r.month_day ? Number(r.month_day) : null,
        })) || [];

      setTasks(all);

      const { data: rData } = await supabase
        .from("cleaning_task_runs")
        .select("task_id,run_on,done_by")
        .eq("org_id", org_id)
        .eq("run_on", today);

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

  const today = isoToday();
  const dueTodayAll = useMemo(() => tasks.filter((t) => isDueOn(t, today)), [tasks, today]);
  const dueDaily = useMemo(
    () => dueTodayAll.filter((t) => t.frequency === "daily"),
    [dueTodayAll]
  );
  const dueNonDaily = useMemo(
    () => dueTodayAll.filter((t) => t.frequency !== "daily"),
    [dueTodayAll]
  );
  const doneCount = useMemo(
    () => dueTodayAll.filter((t) => runsKey.has(`${t.id}|${today}`)).length,
    [dueTodayAll, runsKey, today]
  );

  async function completeTasks(ids: string[], ini: string) {
    try {
      const org_id = await getActiveOrgIdClient();
      if (!org_id) return;
      const run_on = today;

      const payload = ids.map((id) => ({
        org_id,
        task_id: Number(id), // DB uses bigint
        run_on,
        done_by: ini.toUpperCase(),
      }));

      const { error } = await supabase.from("cleaning_task_runs").insert(payload);
      if (error) throw error;

      setRuns((prev) => [
        ...prev,
        ...ids.map((id) => ({ task_id: id, run_on, done_by: ini.toUpperCase() })),
      ]);
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
      if (!org_id) return;
      const { error } = await supabase
        .from("cleaning_task_runs")
        .delete()
        .eq("org_id", org_id)
        .eq("task_id", Number(id))
        .eq("run_on", today);
      if (error) throw error;
      setRuns((prev) => prev.filter((r) => !(r.task_id === id && r.run_on === today)));
    } catch (e: any) {
      alert(e?.message || "Failed to undo completion.");
    }
  }

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

          return (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
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
                <div className="text-xs text-gray-500">Top logger</div>
                <div className="text-2xl font-semibold">
                  {(() => {
                    const freq = new Map<string, number>();
                    rows
                      .filter((r) => in7d(r.date) && r.staff_initials)
                      .forEach((r) =>
                        freq.set(r.staff_initials!, (freq.get(r.staff_initials!) ?? 0) + 1)
                      );
                    const best = Array.from(freq.entries()).sort((a, b) => b[1] - a[1])[0];
                    return best ? best[0] : "—";
                  })()}
                </div>
              </div>
              <div className="rounded-xl border bg-white p-3">
                <div className="text-xs text-gray-500">Cleaning (today)</div>
                <div className="text-2xl font-semibold">
                  {doneCount}/{dueTodayAll.length}
                </div>
              </div>
            </div>
          );
        })()}

        <div className="flex flex-wrap gap-2">
          <a
            href="/team"
            className={cls(
              kpi.trainingOver > 0
                ? "bg-red-100 text-red-800"
                : kpi.trainingDueSoon > 0
                ? "bg-amber-100 text-amber-800"
                : "bg-emerald-100 text-emerald-800",
              "inline-flex items-center justify-between rounded-full px-2 py-[3px] text-xs max-w-fit"
            )}
            title="View team training"
          >
            <span className="font-medium">Training</span>
            <span className="ml-2 inline-block rounded-full bg-white/60 px-1.5 py-[1px] text-[11px] leading-none">
              {kpi.trainingOver > 0
                ? `${kpi.trainingOver} overdue`
                : kpi.trainingDueSoon > 0
                ? `${kpi.trainingDueSoon} due`
                : "OK"}
            </span>
          </a>

          <a
            href="/allergens"
            className={cls(
              kpi.allergenOver > 0
                ? "bg-red-100 text-red-800"
                : kpi.allergenDueSoon > 0
                ? "bg-amber-100 text-amber-800"
                : "bg-emerald-100 text-emerald-800",
              "inline-flex items-center justify-between rounded-full px-2 py-[3px] text-xs max-w-fit"
            )}
            title="View allergen reviews"
          >
            <span className="font-medium">Allergen Review</span>
            <span className="ml-2 inline-block rounded-full bg-white/60 px-1.5 py-[1px] text-[11px] leading-none">
              {kpi.allergenOver > 0
                ? `${kpi.allergenOver} overdue`
                : kpi.allergenDueSoon > 0
                ? `${kpi.allergenDueSoon} due`
                : "OK"}
            </span>
          </a>
        </div>

        {err && (
          <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
            {err}
          </div>
        )}
      </div>

      {/* ======= Cleaning rota: Today’s Tasks ======= */}
      <div className="rounded-2xl border bg-white p-4 shadow-sm">
        <div className="mb-2 flex items-center gap-2">
          <h2 className="text-lg font-semibold">Today’s Cleaning Tasks</h2>
          <div className="ml-auto flex items-center gap-2">
            {dueDaily.some((t) => !runsKey.has(`${t.id}|${today}`)) && (
              <button
                className="rounded-full border px-3 py-1.5 text-xs hover:bg-gray-50"
                onClick={() => {
                  const ids = dueDaily
                    .filter((t) => !runsKey.has(`${t.id}|${today}`))
                    .map((t) => t.id);
                  setConfirm({ ids, run_on: today });
                  setConfirmLabel("Complete all daily");
                  setConfirmInitials(form.staff_initials || initials[0] || "");
                }}
              >
                Complete all daily
              </button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {/* Weekly/Monthly */}
          <div className="space-y-2">
            <div className="text-xs font-medium uppercase text-gray-500">Weekly / Monthly</div>
            {dueNonDaily.length === 0 && (
              <div className="rounded border p-3 text-sm text-gray-500">No tasks.</div>
            )}
            {dueNonDaily.map((t) => {
              const key = `${t.id}|${today}`;
              const done = runsKey.has(key);
              const run = runsKey.get(key) || null;
              return (
                <div
                  key={key}
                  className="flex items-start justify-between gap-2 rounded border px-2 py-2 text-sm"
                >
                  <div className={done ? "text-gray-500 line-through" : ""}>
                    <div className="font-medium">{t.task}</div>
                    {t.area && <div className="text-xs text-gray-500">{t.area}</div>}
                    <div className="text-xs text-gray-400">
                      {t.frequency === "weekly" ? "Weekly" : "Monthly"}
                      {run?.done_by ? ` • Done by ${run.done_by}` : ""}
                    </div>
                  </div>

                  {done ? (
                    <button
                      className="shrink-0 rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-800"
                      onClick={() => uncompleteTask(t.id)}
                    >
                      Done
                    </button>
                  ) : (
                    <button
                      className="shrink-0 rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-800"
                      onClick={() => {
                        setConfirm({ ids: [t.id], run_on: today });
                        setConfirmLabel("Confirm completion");
                        setConfirmInitials(form.staff_initials || initials[0] || "");
                      }}
                    >
                      Complete
                    </button>
                  )}
                </div>
              );
            })}
          </div>

          {/* Daily */}
          <div className="space-y-2">
            <div className="text-xs font-medium uppercase text-gray-500">Daily</div>
            {dueDaily.length === 0 && (
              <div className="rounded border p-3 text-sm text-gray-500">No tasks.</div>
            )}
            {dueDaily.map((t) => {
              const key = `${t.id}|${today}`;
              const done = runsKey.has(key);
              const run = runsKey.get(key) || null;
              return (
                <div
                  key={key}
                  className="flex items-start justify-between gap-2 rounded border px-2 py-2 text-sm"
                >
                  <div className={done ? "text-gray-500 line-through" : ""}>
                    <div className="font-medium">{t.task}</div>
                    {t.area && <div className="text-xs text-gray-500">{t.area}</div>}
                    {run?.done_by && (
                      <div className="text-xs text-gray-400">Done by {run.done_by}</div>
                    )}
                  </div>

                  {done ? (
                    <button
                      className="shrink-0 rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-800"
                      onClick={() => uncompleteTask(t.id)}
                    >
                      Done
                    </button>
                  ) : (
                    <button
                      className="shrink-0 rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-800"
                      onClick={() => {
                        setConfirm({ ids: [t.id], run_on: today });
                        setConfirmLabel("Confirm completion");
                        setConfirmInitials(form.staff_initials || initials[0] || "");
                      }}
                    >
                      Complete
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ======= ENTRY FORM ======= */}
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

      {/* Routine picker modal */}
      <RoutinePickerModal
        open={showPicker}
        onClose={() => setShowPicker(false)}
        onPick={(r: RoutineRow) => {
          setShowPicker(false);
          setRunRoutine(r);
        }}
      />

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

      {/* ======= LOGS: table (desktop) + cards (mobile) ======= */}
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

        {/* Desktop/tablet */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full table-fixed text-sm">
            <thead className="bg-gray-50 text-gray-600">
              <tr className="text-left">
                <th className="px-3 py-2 w-[8.5rem]">Date</th>
                <th className="px-3 py-2 w-16">Initials</th>
                <th className="px-3 py-2 w-[9rem]">Location</th>
                <th className="px-3 py-2 w-[10rem]">Item</th>
                <th className="px-3 py-2 w-[10rem]">Target</th>
                <th className="px-3 py-2 w-[7rem]">Temp (°C)</th>
                <th className="px-3 py-2 w-[6.5rem] text-right">Status</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-6 text-center text-gray-500">Loading…</td>
                </tr>
              ) : rows.length ? (
                rows.map((r) => {
                  const preset = r.target_key ? (TARGET_BY_KEY as any)[r.target_key] : undefined;
                  const st = r.status ?? inferStatus(r.temp_c, preset);
                  return (
                    <tr key={r.id} className="border-t">
                      <td className="px-3 py-2">{formatDDMMYYYY(r.date)}</td>
                      <td className="px-3 py-2 font-medium uppercase">{r.staff_initials ?? "—"}</td>
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
                            className={
                              "inline-flex rounded-full px-2 py-0.5 text-xs font-medium " +
                              (st === "pass"
                                ? "bg-emerald-100 text-emerald-800"
                                : "bg-red-100 text-red-800")
                            }
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
                  <td colSpan={7} className="py-6 text-center text-gray-500">No entries</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile cards */}
        <div className="md:hidden space-y-2">
          {loading ? (
            <div className="text-center text-sm text-gray-500 py-4">Loading…</div>
          ) : grouped.length ? (
            grouped.map((g) => (
              <div key={g.date}>
                <div className="mb-1 text-xs font-medium text-gray-600">
                  {formatDDMMYYYY(g.date)}
                </div>
                <div className="space-y-2">
                  {g.list.map((r) => {
                    const preset: TargetPreset | undefined =
                      r.target_key ? (TARGET_BY_KEY as any)[r.target_key] : undefined;
                    const st = r.status ?? inferStatus(r.temp_c, preset);
                    return (
                      <div key={r.id} className="rounded-xl border p-3">
                        <div className="flex items-center justify-between">
                          <div className="text-sm font-medium">{r.item ?? "—"}</div>
                          {st && (
                            <span
                              className={
                                "ml-2 rounded-full px-2 py-0.5 text-[11px] font-medium " +
                                (st === "pass"
                                  ? "bg-emerald-100 text-emerald-800"
                                  : "bg-red-100 text-red-800")
                              }
                            >
                              {st}
                            </span>
                          )}
                        </div>
                        <div className="mt-1 text-xs text-gray-600">
                          {r.location ?? "—"} • {r.staff_initials ?? "—"} • {r.temp_c ?? "—"}°C
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
            <div className="text-center text-sm text-gray-500 py-4">No entries</div>
          )}
        </div>
      </div>

      {/* Cleaning completion modal (z-50 to sit above anything) */}
      {confirm && (
        <div className="fixed inset-0 z-50 bg-black/30" onClick={() => setConfirm(null)}>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!confirmInitials.trim()) return;
              completeTasks(confirm.ids, confirmInitials.trim());
            }}
            onClick={(e) => e.stopPropagation()}
            className="mx-auto mt-6 flex h-[70vh] w-full max-w-sm flex-col overflow-hidden rounded-t-2xl border bg-white shadow sm:mt-24 sm:h-auto sm:rounded-2xl"
          >
            <div className="sticky top-0 z-10 border-b bg-white px-4 py-3 text-base font-semibold">
              {confirmLabel}
            </div>
            <div className="grow overflow-y-auto px-4 py-3 space-y-3">
              <div className="rounded border bg-gray-50 p-2 text-sm">
                <div className="font-medium">
                  {confirm.ids.length === 1
                    ? (tasks.find((t) => t.id === confirm.ids[0])?.task ?? "Task")
                    : `${confirm.ids.length} tasks`}
                </div>
                <div className="mt-1 text-xs text-gray-500">
                  For <strong>{nice(confirm.run_on)}</strong>
                </div>
              </div>

              <label className="block text-sm">
                <div className="mb-1 text-gray-600">Initials</div>
                <select
                  className="w-full rounded-xl border px-2 py-1.5 uppercase"
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
            <div className="sticky bottom-0 z-10 flex items-center justify-end gap-2 border-t bg-white px-4 py-3">
              <button
                type="button"
                className="rounded-md px-3 py-1.5 text-sm hover:bg-gray-50"
                onClick={() => setConfirm(null)}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="rounded-xl bg-black px-3 py-1.5 text-sm font-medium text-white hover:bg-gray-900"
              >
                Confirm
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

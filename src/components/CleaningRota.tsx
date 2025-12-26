"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { supabase } from "@/lib/supabaseBrowser";
import { getActiveOrgIdClient } from "@/lib/orgClient";
import { getActiveLocationIdClient } from "@/lib/locationClient";
import ManageCleaningTasksModal, {
  CLEANING_CATEGORIES,
} from "@/components/ManageCleaningTasksModal";

const PAGE = "max-w-[1100px] mx-auto px-3 sm:px-4";

// glassy panel
const CARD =
  "rounded-3xl border border-white/40 bg-white/70 shadow-lg backdrop-blur-md ";

type Frequency = "daily" | "weekly" | "monthly";

type Task = {
  id: string;
  org_id: string;
  task: string;
  area: string | null;
  category: string | null;
  frequency: Frequency;
  weekday: number | null;
  month_day: number | null;
};

type Run = {
  task_id: string;
  run_on: string;
  done_by: string | null;
};

type CleaningIncident = {
  id: string;
  happened_on: string;
  type: string | null;
  details: string | null;
  corrective_action: string | null;
  preventive_action: string | null;
  created_by: string | null;
  created_at: string | null;
};

type DailySignoffRow = {
  id: string;
  org_id: string;
  location_id: string;
  signoff_on: string; // YYYY-MM-DD
  signed_by: string | null;
  notes: string | null;
  created_at: string | null;
};

const iso = (d: Date) => d.toISOString().slice(0, 10);
const ISO_TODAY = () => iso(new Date());
const getDow1to7 = (d: string) => ((new Date(d).getDay() + 6) % 7) + 1;
const getDom = (d: string) => new Date(d).getDate();

const isDueOn = (t: Task, y: string) =>
  t.frequency === "daily"
    ? true
    : t.frequency === "weekly"
    ? t.weekday === getDow1to7(y)
    : t.month_day === getDom(y);

const niceShort = (d: string) =>
  new Date(d).toLocaleDateString(undefined, {
    weekday: "short",
    day: "2-digit",
    month: "short",
  });

const niceFull = (d: string) =>
  new Date(d).toLocaleDateString(undefined, {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

// Small helper for subtle haptics on supported devices
function bumpVibrate(ms = 10) {
  if (typeof window === "undefined") return;
  const nav = window.navigator as any;
  if (typeof nav.vibrate === "function") {
    nav.vibrate(ms);
  }
}

/* ================= SFBB Default Opening/Closing checks =================
   These come directly from the SFBB “Opening and closing checks” safe method.
*/
const SFBB_OPENING_CHECKS: Array<{ task: string; area?: string | null }> = [
  {
    task: "Fridges / chilled display equipment / freezers working properly",
    area: "Kitchen",
  },
  { task: "Other equipment working properly (e.g. oven)", area: "Kitchen" },
  { task: "Staff fit for work and wearing clean work clothes", area: "Kitchen" },
  {
    task: "Food prep areas clean and disinfected (surfaces, equipment, utensils)",
    area: "Kitchen",
  },
  { task: "No evidence of pest activity (all areas)", area: "Site" },
  {
    task: "Enough handwashing + cleaning materials (soap, paper towels, sanitiser)",
    area: "Kitchen",
  },
  { task: "Hot running water available at all sinks / basins", area: "Kitchen" },
  { task: "Probe thermometer working + probe wipes available", area: "Kitchen" },
  { task: "Allergen information accurate for all items on sale", area: "Kitchen" },
];

const SFBB_CLOSING_CHECKS: Array<{ task: string; area?: string | null }> = [
  {
    task: "All food covered, labelled and stored in fridge/freezer (where appropriate)",
    area: "Kitchen",
  },
  { task: "Food on its Use By date thrown away", area: "Kitchen" },
  { task: "Dirty cleaning equipment cleaned or thrown away", area: "Kitchen" },
  { task: "Waste removed and new bin bags put in", area: "Kitchen" },
  {
    task: "Food prep areas clean and disinfected (surfaces, equipment, utensils)",
    area: "Kitchen",
  },
  { task: "All washing up finished", area: "Kitchen" },
  { task: "Floors swept and clean", area: "Kitchen" },
  { task: "‘Prove it’ checks recorded (where required)", area: "Kitchen" },
];

function normKey(s: string) {
  return s.trim().toLowerCase();
}

async function ensureDefaultChecksExist(params: {
  orgId: string;
  locationId: string;
}) {
  const { orgId, locationId } = params;

  const { data, error } = await supabase
    .from("cleaning_tasks")
    .select("id, task, name, category, frequency, location_id")
    .eq("org_id", orgId)
    .eq("location_id", locationId);

  if (error) {
    console.warn("[cleaning] failed to check defaults", error.message);
    return;
  }

  const existing = new Set(
    (data ?? []).map((r: any) => {
      const task = r.task ?? r.name ?? "";
      const cat = r.category ?? "";
      const freq = String(r.frequency ?? "daily").toLowerCase();
      return `${normKey(cat)}|${normKey(task)}|${freq}`;
    })
  );

  const inserts: any[] = [];
  const openingCat = "Opening checks";
  const closingCat = "Closing checks";

  for (const t of SFBB_OPENING_CHECKS) {
    const k = `${normKey(openingCat)}|${normKey(t.task)}|daily`;
    if (!existing.has(k)) {
      inserts.push({
        org_id: orgId,
        location_id: locationId,
        task: t.task,
        area: t.area ?? null,
        category: openingCat,
        frequency: "daily",
        weekday: null,
        month_day: null,
      });
    }
  }

  for (const t of SFBB_CLOSING_CHECKS) {
    const k = `${normKey(closingCat)}|${normKey(t.task)}|daily`;
    if (!existing.has(k)) {
      inserts.push({
        org_id: orgId,
        location_id: locationId,
        task: t.task,
        area: t.area ?? null,
        category: closingCat,
        frequency: "daily",
        weekday: null,
        month_day: null,
      });
    }
  }

  if (!inserts.length) return;

  const { error: insErr } = await supabase.from("cleaning_tasks").insert(inserts);
  if (insErr) {
    console.warn("[cleaning] failed to insert SFBB default checks", insErr.message);
  }
}

/* ================= Daily Swipe Card (framer-motion) ================= */

type SwipeCardProps = {
  task: Task;
  done: boolean;
  run: Run | null;
  today: string;
  initials: string;
  onComplete: (taskId: string, initials: string) => void;
  onUndo: (taskId: string) => void;
};

function SwipeCard({
  task,
  done,
  run,
  today,
  initials,
  onComplete,
  onUndo,
}: SwipeCardProps) {
  const SWIPE_THRESHOLD = 80;

  return (
    <motion.div
      className="relative mb-2 rounded-xl border border-slate-100 bg-white/90 px-3 py-2 text-sm shadow-sm"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 8 }}
      layout
      drag="x"
      dragConstraints={{ left: 0, right: 0 }}
      dragElastic={0.2}
      dragSnapToOrigin
      onDragEnd={(_, info) => {
        const offsetX = info.offset.x;

        // Swipe LEFT -> complete
        if (offsetX < -SWIPE_THRESHOLD && !done && initials) {
          onComplete(task.id, initials);
          return;
        }

        // Swipe RIGHT -> undo
        if (offsetX > SWIPE_THRESHOLD && done) {
          onUndo(task.id);
          return;
        }
      }}
    >
      <div
        className={
          done ? "text-xs text-slate-500 line-through" : "text-xs text-slate-900"
        }
      >
        <div className="text-sm font-medium text-slate-900">{task.task}</div>
        <div className="text-[11px] text-slate-500">
          {task.area ?? "—"} •{" "}
          {task.frequency === "daily"
            ? "Daily"
            : task.frequency === "weekly"
            ? "Weekly"
            : "Monthly"}
        </div>
        {run?.done_by && (
          <div className="text-[10px] text-slate-400">
            Done by {run.done_by} on {niceShort(today)}
          </div>
        )}
      </div>

      <div className="mt-1 flex justify-end">
        {done ? (
          <button
            type="button"
            className="shrink-0 rounded-full bg-emerald-100 px-3 py-0.5 text-[11px] font-semibold text-emerald-800"
            onClick={() => onUndo(task.id)}
          >
            Undo
          </button>
        ) : (
          <button
            type="button"
            className="shrink-0 rounded-full bg-red-100 px-3 py-0.5 text-[11px] font-semibold text-red-700 disabled:opacity-50"
            disabled={!initials}
            onClick={() => initials && onComplete(task.id, initials)}
          >
            Tick
          </button>
        )}
      </div>
    </motion.div>
  );
}

/* ========== Weekly/Monthly Row with framer-motion swipe (VISIBLE) ========== */

type WeeklyMonthlyTaskRowProps = {
  task: Task;
  done: boolean;
  run: Run | null;
  today: string;
  initials: string;
  onComplete: (taskId: string, initials: string) => void;
  onUndo: (taskId: string) => void;
};

function WeeklyMonthlyTaskRow({
  task,
  done,
  run,
  today,
  initials,
  onComplete,
  onUndo,
}: WeeklyMonthlyTaskRowProps) {
  const SWIPE_THRESHOLD = 80;

  return (
    <motion.div
      className="flex items-start justify-between gap-2 rounded-2xl border border-gray-200/80 bg-white/80 px-3 py-2 text-sm shadow-sm touch-pan-y transition hover:-translate-y-0.5 hover:shadow-md"
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 6 }}
      layout
      drag="x"
      dragConstraints={{ left: 0, right: 0 }}
      dragElastic={0.2}
      dragSnapToOrigin
      onDragEnd={(_, info) => {
        const offsetX = info.offset.x;

        // Swipe LEFT -> complete
        if (offsetX < -SWIPE_THRESHOLD && !done && initials) {
          onComplete(task.id, initials);
          return;
        }

        // Swipe RIGHT -> undo
        if (offsetX > SWIPE_THRESHOLD && done) {
          onUndo(task.id);
          return;
        }
      }}
    >
      <div className={done ? "text-gray-500 line-through" : ""}>
        <div className="font-medium text-slate-900">{task.task}</div>
        <div className="text-xs text-gray-500">
          {task.category ?? task.area ?? "—"} •{" "}
          {task.frequency === "weekly" ? "Weekly" : "Monthly"}
        </div>
        {run?.done_by && (
          <div className="text-[11px] text-gray-400">
            Done by {run.done_by} on {niceShort(today)}
          </div>
        )}
      </div>
      {done ? (
        <button
          className="shrink-0 rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-800"
          type="button"
          onClick={() => onUndo(task.id)}
        >
          Undo
        </button>
      ) : (
        <button
          className="shrink-0 rounded-full bg-red-100 px-3 py-1 text-xs font-semibold text-red-700 disabled:opacity-50"
          type="button"
          disabled={!initials}
          onClick={() => {
            if (!initials) return;
            onComplete(task.id, initials);
          }}
        >
          Complete
        </button>
      )}
    </motion.div>
  );
}

/* ================= Main Component ================= */

export default function CleaningRota() {
  const today = ISO_TODAY();

  const [tasks, setTasks] = useState<Task[]>([]);
  const [runs, setRuns] = useState<Run[]>([]);
  const runsKey = useMemo(() => {
    const m = new Map<string, Run>();
    for (const r of runs) m.set(`${r.task_id}|${r.run_on}`, r);
    return m;
  }, [runs]);

  const [initialsList, setInitialsList] = useState<string[]>([]);
  const [ini, setIni] = useState<string>("");

  const [manageOpen, setManageOpen] = useState(false);

  // permissions: who can manage tasks?
  const [canManage, setCanManage] = useState(true);

  // which daily category is expanded to show swipe cards
  // NOTE: start collapsed, and specifically keep Opening checks collapsed until user opens it.
  const [openCategory, setOpenCategory] = useState<string | null>(null);

  // Incidents / corrective actions panel
  const [incOpen, setIncOpen] = useState(false);
  const [incidents, setIncidents] = useState<CleaningIncident[]>([]);
  const [incLoading, setIncLoading] = useState(false);
  const [incSaving, setIncSaving] = useState(false);
  const [incForm, setIncForm] = useState({
    type: "Cleaning missed",
    details: "",
    corrective_action: "",
    preventive_action: "",
  });

  // Day sign-off (uses your existing daily_signoffs table)
  const [signoff, setSignoff] = useState<DailySignoffRow | null>(null);
  const [signoffLoading, setSignoffLoading] = useState(false);
  const [signoffSaving, setSignoffSaving] = useState(false);
  const [showSignoffNudge, setShowSignoffNudge] = useState(false);

  const nudgeKeyRef = useRef<string>("");

  async function loadSignoff() {
    const orgId = await getActiveOrgIdClient();
    const locationId = await getActiveLocationIdClient();
    if (!orgId || !locationId) return;

    setSignoffLoading(true);
    try {
      const { data, error } = await supabase
        .from("daily_signoffs")
        .select("id,org_id,location_id,signoff_on,signed_by,notes,created_at")
        .eq("org_id", orgId)
        .eq("location_id", locationId)
        .eq("signoff_on", today)
        .maybeSingle();

      if (error) throw error;

      const row = data as any;
      setSignoff(
        row
          ? {
              id: String(row.id),
              org_id: String(row.org_id),
              location_id: String(row.location_id),
              signoff_on: String(row.signoff_on),
              signed_by: row.signed_by ? String(row.signed_by) : null,
              notes: row.notes ? String(row.notes) : null,
              created_at: row.created_at ? String(row.created_at) : null,
            }
          : null
      );
    } catch (e) {
      console.warn("[daily_signoffs] load failed", e);
      setSignoff(null);
    } finally {
      setSignoffLoading(false);
    }
  }

  async function quickSignoff() {
    const orgId = await getActiveOrgIdClient();
    const locationId = await getActiveLocationIdClient();
    if (!orgId || !locationId) {
      alert("Select a location first.");
      return;
    }
    if (!ini) {
      alert("Pick initials first.");
      return;
    }

    setSignoffSaving(true);
    try {
      const { error } = await supabase
        .from("daily_signoffs")
        .upsert(
          {
            org_id: orgId,
            location_id: locationId,
            signoff_on: today,
            signed_by: ini.toUpperCase(),
            notes: null,
          },
          { onConflict: "org_id,location_id,signoff_on" }
        );

      if (error) throw error;

      await loadSignoff();
      setShowSignoffNudge(false);
      try {
        if (nudgeKeyRef.current) localStorage.setItem(nudgeKeyRef.current, "1");
      } catch {}
      bumpVibrate(15);
    } catch (e: any) {
      alert(e?.message || "Failed to sign off.");
    } finally {
      setSignoffSaving(false);
    }
  }

  /** Load initials and put logged-in user first */
  useEffect(() => {
    (async () => {
      const orgId = await getActiveOrgIdClient();
      if (!orgId) return;

      const { data } = await supabase
        .from("team_members")
        .select("initials,email")
        .eq("org_id", orgId)
        .order("initials");

      let list: string[] = Array.from(
        new Set(
          (data ?? [])
            .map((r: any) => (r.initials ?? "").toString().toUpperCase().trim())
            .filter(Boolean)
        )
      );

      try {
        const { data: authData } = await supabase.auth.getUser();
        const email = authData.user?.email?.toLowerCase() ?? null;

        if (email && data && data.length) {
          const meRow = data.find(
            (r: any) => (r.email ?? "").toLowerCase() === email
          );
          const myIni = meRow?.initials?.toString().toUpperCase().trim();

          if (myIni && list.includes(myIni)) {
            list = [myIni, ...list.filter((x) => x !== myIni)];
          }
        }
      } catch {
        // ignore
      }

      setInitialsList(list);
      if (!ini && list.length) setIni(list[0]);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /** Load role (owner/manager/admin?) */
  useEffect(() => {
    (async () => {
      try {
        const orgId = await getActiveOrgIdClient();
        const { data: userRes } = await supabase.auth.getUser();
        const email = userRes.user?.email?.toLowerCase() ?? null;

        let manage = true;

        if (orgId && email) {
          const { data, error } = await supabase
            .from("team_members")
            .select("role,email")
            .eq("org_id", orgId)
            .eq("email", email)
            .limit(1);

          if (!error && data && data.length > 0) {
            const role = (data[0].role ?? "").toLowerCase();
            manage = role === "owner" || role === "manager" || role === "admin";
          }
        }

        setCanManage(manage);
      } catch {
        setCanManage(true);
      }
    })();
  }, []);

  /** Load incidents for today */
  async function loadIncidents() {
    const orgId = await getActiveOrgIdClient();
    const locationId = await getActiveLocationIdClient();
    if (!orgId || !locationId) return;

    setIncLoading(true);
    try {
      const { data, error } = await supabase
        .from("cleaning_incidents")
        .select(
          "id,happened_on,type,details,corrective_action,preventive_action,created_by,created_at"
        )
        .eq("org_id", orgId)
        .eq("location_id", locationId)
        .eq("happened_on", today)
        .order("created_at", { ascending: false });

      if (error) throw error;

      setIncidents(
        (data ?? []).map((r: any) => ({
          id: String(r.id),
          happened_on: String(r.happened_on),
          type: r.type ? String(r.type) : null,
          details: r.details ? String(r.details) : null,
          corrective_action: r.corrective_action
            ? String(r.corrective_action)
            : null,
          preventive_action: r.preventive_action
            ? String(r.preventive_action)
            : null,
          created_by: r.created_by ? String(r.created_by) : null,
          created_at: r.created_at ? String(r.created_at) : null,
        }))
      );
    } catch (e: any) {
      console.warn("[cleaning_incidents] load failed", e?.message);
      setIncidents([]);
    } finally {
      setIncLoading(false);
    }
  }

  async function saveIncident() {
    const orgId = await getActiveOrgIdClient();
    const locationId = await getActiveLocationIdClient();
    if (!orgId || !locationId) {
      alert("Select a location first.");
      return;
    }
    if (!ini) {
      alert("Pick initials first.");
      return;
    }
    if (!incForm.details.trim()) {
      alert("Add what happened.");
      return;
    }

    setIncSaving(true);
    try {
      const payload = {
        org_id: orgId,
        location_id: locationId,
        happened_on: today,
        type: incForm.type || null,
        details: incForm.details.trim(),
        corrective_action: incForm.corrective_action.trim() || null,
        preventive_action: incForm.preventive_action.trim() || null,
        created_by: ini.toUpperCase(),
      };

      const { error } = await supabase.from("cleaning_incidents").insert(payload);
      if (error) throw error;

      setIncForm({
        type: "Cleaning missed",
        details: "",
        corrective_action: "",
        preventive_action: "",
      });

      await loadIncidents();
      bumpVibrate(15);
    } catch (e: any) {
      alert(e?.message || "Failed to save incident.");
    } finally {
      setIncSaving(false);
    }
  }

  /** Load tasks + today's runs (org + location scoped) */
  async function loadAll() {
    const orgId = await getActiveOrgIdClient();
    const locationId = await getActiveLocationIdClient();

    if (!orgId) return;

    if (locationId) {
      await ensureDefaultChecksExist({ orgId, locationId });
    }

    let tQuery = supabase
      .from("cleaning_tasks")
      .select(
        "id, org_id, task, name, area, category, frequency, weekday, month_day, location_id"
      )
      .eq("org_id", orgId);

    if (locationId) {
      tQuery = tQuery.eq("location_id", locationId);
    }

    const { data: tData } = await tQuery;

    setTasks(
      (tData ?? []).map((r: any) => {
        const freq = String(r.frequency ?? "daily").toLowerCase() as Frequency;
        return {
          id: String(r.id),
          org_id: String(r.org_id),
          task: r.task ?? r.name ?? "",
          area: r.area ?? null,
          category: r.category ?? null,
          frequency: freq,
          weekday: r.weekday ? Number(r.weekday) : null,
          month_day: r.month_day ? Number(r.month_day) : null,
        };
      })
    );

    let query = supabase
      .from("cleaning_task_runs")
      .select("task_id, run_on, done_by")
      .eq("org_id", orgId)
      .eq("run_on", today);

    if (locationId) {
      query = query.eq("location_id", locationId);
    }

    const { data: rData } = await query;

    setRuns(
      (rData ?? []).map((r: any) => ({
        task_id: String(r.task_id),
        run_on: r.run_on as string,
        done_by: r.done_by ?? null,
      }))
    );

    await loadIncidents();
    await loadSignoff();

    // nudge key per day + location
    if (orgId && locationId) {
      nudgeKeyRef.current = `tt_cleaning_signoff_nudge_${orgId}_${locationId}_${today}`;
    }
  }

  useEffect(() => {
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [today]);

  /** Derived: what’s due today */
  const dueToday = useMemo(
    () => tasks.filter((t) => isDueOn(t, today)),
    [tasks, today]
  );
  const dailyToday = useMemo(
    () => dueToday.filter((t) => t.frequency === "daily"),
    [dueToday]
  );
  const nonDailyToday = useMemo(
    () => dueToday.filter((t) => t.frequency !== "daily"),
    [dueToday]
  );

  /** Daily summary by category */
  const dailyByCat = useMemo(() => {
    const map = new Map<string, Task[]>();

    const baseCats = [
      ...CLEANING_CATEGORIES,
      "Opening checks",
      "Closing checks",
    ];
    for (const c of baseCats) map.set(c, []);

    for (const t of dailyToday) {
      const key = t.category ?? "Opening checks";
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(t);
    }

    for (const [k, list] of map)
      map.set(k, list.slice().sort((a, b) => a.task.localeCompare(b.task)));

    return map;
  }, [dailyToday]);

  // Categories that actually have tasks today
  const categoriesWithTasks = useMemo(() => {
    const keys = Array.from(dailyByCat.keys());
    return keys.filter((cat) => (dailyByCat.get(cat) ?? []).length > 0);
  }, [dailyByCat]);

  const doneCount = useMemo(
    () => dueToday.filter((t) => runsKey.has(`${t.id}|${today}`)).length,
    [dueToday, runsKey, today]
  );

  const allDoneToday = dueToday.length > 0 && doneCount === dueToday.length;
  const isSignedOff = !!signoff?.id;

  // When everything is completed, prompt sign-off (once per day/location per device).
  useEffect(() => {
    if (!allDoneToday) return;
    if (isSignedOff) return;

    try {
      const k = nudgeKeyRef.current;
      if (k && localStorage.getItem(k) === "1") return;
    } catch {}

    setShowSignoffNudge(true);
  }, [allDoneToday, isSignedOff]);

  /** Upcoming 7 days (weekly/monthly only) */
  const days7 = useMemo(() => {
    const arr: string[] = [];
    const d = new Date(today);
    for (let i = 0; i < 7; i++) {
      arr.push(iso(d));
      d.setDate(d.getDate() + 1);
    }
    return arr;
  }, [today]);

  const upcoming = useMemo(
    () =>
      days7.map((d) => ({
        day: d,
        list: tasks.filter((t) => t.frequency !== "daily" && isDueOn(t, d)),
      })),
    [days7, tasks]
  );

  /** ===== Complete helpers (always include org_id + location_id) ===== */

  async function fireConfetti() {
    try {
      const confettiModule = await import("canvas-confetti");
      confettiModule.default();
    } catch {
      // ignore
    }
  }

  async function completeOne(id: string, initialsVal: string) {
    const orgId = await getActiveOrgIdClient();
    const locationId = await getActiveLocationIdClient();
    if (!orgId || !locationId) {
      alert("Select a location first.");
      return;
    }

    const payload = {
      org_id: orgId,
      location_id: locationId,
      task_id: id,
      run_on: today,
      done_by: initialsVal.toUpperCase(),
    };

    const { error } = await supabase.from("cleaning_task_runs").insert(payload);

    if (error) {
      alert(error.message);
      return;
    }

    setRuns((prev) => [
      ...prev,
      { task_id: id, run_on: today, done_by: payload.done_by },
    ]);

    fireConfetti();
    bumpVibrate();
  }

  async function uncompleteOne(id: string) {
    const orgId = await getActiveOrgIdClient();
    const locationId = await getActiveLocationIdClient();
    if (!orgId || !locationId) {
      alert("Select a location first.");
      return;
    }

    const { error } = await supabase
      .from("cleaning_task_runs")
      .delete()
      .eq("org_id", orgId)
      .eq("location_id", locationId)
      .eq("task_id", id)
      .eq("run_on", today);

    if (error) {
      alert(error.message);
      return;
    }

    setRuns((prev) =>
      prev.filter((r) => !(r.task_id === id && r.run_on === today))
    );
  }

  async function completeMany(ids: string[], initialsVal: string) {
    const orgId = await getActiveOrgIdClient();
    const locationId = await getActiveLocationIdClient();
    if (!orgId || !locationId || !ids.length) {
      if (!orgId || !locationId) alert("Select a location first.");
      return;
    }

    const payload = ids.map((id) => ({
      org_id: orgId,
      location_id: locationId,
      task_id: id,
      run_on: today,
      done_by: initialsVal.toUpperCase(),
    }));

    const { error } = await supabase.from("cleaning_task_runs").insert(payload);

    if (error) {
      alert(error.message);
      return;
    }

    setRuns((prev) => [
      ...prev,
      ...payload.map((p) => ({
        task_id: p.task_id,
        run_on: p.run_on,
        done_by: p.done_by,
      })),
    ]);

    fireConfetti();
    bumpVibrate(15);
  }

  const signoffStatusText = signoffLoading
    ? "Checking sign-off…"
    : isSignedOff
    ? `Signed off by ${signoff?.signed_by || "—"}`
    : "Not signed off yet";

  const signoffBadge = signoffLoading
    ? "bg-slate-100 text-slate-700 border-slate-200"
    : isSignedOff
    ? "bg-emerald-50 text-emerald-900 border-emerald-200"
    : "bg-red-50 text-red-900 border-red-200";

  /* ===== RENDER ===== */
  return (
    <div className={PAGE + " space-y-6 py-4 animate-fadeIn"}>
      {/* Centered date at the very top */}
      <div className="mb-2 text-center">
        <div className="text-[11px] uppercase tracking-[0.2em] text-slate-400">
          Today
        </div>
        <div className="text-lg font-semibold text-slate-800">{niceFull(today)}</div>
      </div>

      {/* ===== Header / Actions ===== */}
      <div className={CARD + " p-4"}>
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <h1 className="text-lg font-semibold leading-tight text-slate-900">
            Cleaning rota
          </h1>

          <div className="ml-auto flex flex-wrap items-center gap-2">
            {canManage && (
              <button
                type="button"
                className="shrink-0 rounded-xl bg-indigo-600/90 px-3 py-1.5 text-sm font-medium text-white shadow-sm transition hover:bg-indigo-500"
                onClick={() => setManageOpen(true)}
              >
                Manage tasks
              </button>
            )}

            <label className="shrink-0 text-xs text-gray-600">Initials</label>
            <select
              value={ini}
              onChange={(e) => setIni(e.target.value.toUpperCase())}
              className="h-8 rounded-xl border border-gray-300 bg-white/70 px-5 py-1.5 uppercase shadow-sm"
            >
              {initialsList.map((v) => (
                <option key={v} value={v}>
                  {v}
                </option>
              ))}
            </select>

            <div className="shrink-0 rounded-xl bg-slate-900/90 px-3 py-1.5 text-sm font-medium text-white shadow-sm">
              {doneCount}/{dueToday.length}
            </div>

            <button
              type="button"
              className="shrink-0 rounded-xl bg-emerald-600/90 px-3 py-1.5 text-sm font-medium text-white shadow-sm transition hover:bg-emerald-500 disabled:opacity-50"
              title="Complete everything due today"
              onClick={() => {
                const ids = dueToday
                  .filter((t) => !runsKey.has(`${t.id}|${today}`))
                  .map((t) => t.id);
                completeMany(ids, ini);
              }}
              disabled={!ini || dueToday.every((t) => runsKey.has(`${t.id}|${today}`))}
            >
              Complete all today
            </button>
          </div>
        </div>

        {/* ===== Prominent Day Sign-off Bar ===== */}
        <div className="mb-4 rounded-2xl border border-slate-200/80 bg-white/80 p-3 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="min-w-0">
              <div className="text-[11px] font-extrabold uppercase tracking-[0.22em] text-slate-700/90">
                Day sign-off
              </div>
              <div className="mt-1 flex items-center gap-2">
                <span
                  className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-extrabold ${signoffBadge}`}
                >
                  {signoffLoading ? "Loading…" : isSignedOff ? "Signed" : "Not signed"}
                </span>
                <span className="text-xs font-semibold text-slate-600">
                  {today}
                </span>
              </div>
              <div className="mt-2 text-sm font-semibold text-slate-900">
                {signoffStatusText}
              </div>
              {allDoneToday && !isSignedOff && (
                <div className="mt-1 text-[11px] font-semibold text-amber-700">
                  All tasks completed. Sign off the day to finish the record.
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={() => void quickSignoff()}
              disabled={signoffSaving || signoffLoading || !ini}
              className={`h-11 rounded-2xl px-4 text-sm font-extrabold text-white shadow-sm disabled:opacity-60 ${
                isSignedOff ? "bg-emerald-600 hover:bg-emerald-700" : "bg-slate-900 hover:bg-slate-800"
              }`}
            >
              {signoffSaving ? "Signing…" : isSignedOff ? "Signed off" : "Sign off day"}
            </button>
          </div>

          {/* ===== Auto prompt / nudge once completed ===== */}
          {showSignoffNudge && !isSignedOff && (
            <div className="mt-3 rounded-2xl border border-amber-200 bg-amber-50/90 p-3">
              <div className="text-sm font-semibold text-amber-900">
                Everything’s done. Sign off the day?
              </div>
              <div className="mt-1 text-[11px] text-amber-800">
                This matches the SFBB diary flow: tasks completed → manager signs.
              </div>
              <div className="mt-3 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowSignoffNudge(false);
                    try {
                      if (nudgeKeyRef.current) localStorage.setItem(nudgeKeyRef.current, "1");
                    } catch {}
                  }}
                  className="h-10 rounded-2xl border border-amber-200 bg-white/70 px-4 text-xs font-extrabold text-amber-900 hover:bg-white"
                >
                  Not now
                </button>
                <button
                  type="button"
                  onClick={() => void quickSignoff()}
                  disabled={signoffSaving || !ini}
                  className="h-10 rounded-2xl bg-amber-600 px-4 text-xs font-extrabold text-white shadow-sm hover:bg-amber-700 disabled:opacity-60"
                >
                  {signoffSaving ? "Signing…" : "Sign off now"}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* ===== Incidents / Corrective actions ===== */}
        <div className="mb-4 rounded-2xl border border-slate-200/80 bg-white/70 p-3">
          <div className="flex items-center justify-between gap-2">
            <div>
              <div className="text-sm font-semibold text-slate-900">
                Incidents & corrective actions
              </div>
              <div className="text-[11px] text-slate-600">
                Log anything missed or unusual, plus what you did about it.
              </div>
            </div>
            <button
              type="button"
              className="rounded-xl border border-slate-200 bg-white/70 px-3 py-1.5 text-xs font-semibold text-slate-800 hover:bg-white"
              onClick={() => {
                const next = !incOpen;
                setIncOpen(next);
                if (next) void loadIncidents();
              }}
            >
              {incOpen ? "Hide" : "Open"}
            </button>
          </div>

          {incOpen && (
            <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
              <div className="rounded-2xl border border-slate-200/80 bg-white/80 p-3">
                <div className="text-xs font-semibold text-slate-900">New report</div>

                <label className="mt-2 block text-[11px] font-semibold text-slate-600">
                  Type
                </label>
                <select
                  value={incForm.type}
                  onChange={(e) =>
                    setIncForm((p) => ({ ...p, type: e.target.value }))
                  }
                  className="mt-1 h-9 w-full rounded-xl border border-slate-200 bg-white/80 px-3 text-sm shadow-sm"
                >
                  <option>Cleaning missed</option>
                  <option>Equipment issue</option>
                  <option>Pest/maintenance</option>
                  <option>Staff hygiene</option>
                  <option>Other</option>
                </select>

                <label className="mt-3 block text-[11px] font-semibold text-slate-600">
                  What happened
                </label>
                <textarea
                  value={incForm.details}
                  onChange={(e) =>
                    setIncForm((p) => ({ ...p, details: e.target.value }))
                  }
                  className="mt-1 min-h-[70px] w-full rounded-xl border border-slate-200 bg-white/80 px-3 py-2 text-sm shadow-sm"
                  placeholder="Short and factual."
                />

                <label className="mt-3 block text-[11px] font-semibold text-slate-600">
                  Corrective action
                </label>
                <textarea
                  value={incForm.corrective_action}
                  onChange={(e) =>
                    setIncForm((p) => ({
                      ...p,
                      corrective_action: e.target.value,
                    }))
                  }
                  className="mt-1 min-h-[60px] w-full rounded-xl border border-slate-200 bg-white/80 px-3 py-2 text-sm shadow-sm"
                  placeholder="What did you do to fix it?"
                />

                <label className="mt-3 block text-[11px] font-semibold text-slate-600">
                  Preventive action
                </label>
                <textarea
                  value={incForm.preventive_action}
                  onChange={(e) =>
                    setIncForm((p) => ({
                      ...p,
                      preventive_action: e.target.value,
                    }))
                  }
                  className="mt-1 min-h-[60px] w-full rounded-xl border border-slate-200 bg-white/80 px-3 py-2 text-sm shadow-sm"
                  placeholder="How do you stop it happening again?"
                />

                <div className="mt-3 flex justify-end">
                  <button
                    type="button"
                    disabled={incSaving}
                    onClick={() => void saveIncident()}
                    className="rounded-xl bg-slate-900 px-4 py-2 text-xs font-extrabold text-white shadow-sm hover:bg-slate-800 disabled:opacity-60"
                  >
                    {incSaving ? "Saving…" : "Save report"}
                  </button>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200/80 bg-white/80 p-3">
                <div className="mb-2 flex items-center justify-between">
                  <div className="text-xs font-semibold text-slate-900">
                    Today’s reports
                  </div>
                  <button
                    type="button"
                    className="rounded-xl border border-slate-200 bg-white/70 px-3 py-1 text-xs font-semibold text-slate-800 hover:bg-white"
                    onClick={() => void loadIncidents()}
                    disabled={incLoading}
                  >
                    {incLoading ? "Loading…" : "Refresh"}
                  </button>
                </div>

                {incidents.length === 0 ? (
                  <div className="rounded-2xl border border-slate-200/80 bg-white/70 p-3 text-sm text-slate-600">
                    No incidents logged today.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {incidents.map((it) => (
                      <div
                        key={it.id}
                        className="rounded-2xl border border-slate-200/80 bg-white/70 p-3 text-sm"
                      >
                        <div className="flex items-center justify-between">
                          <div className="font-semibold text-slate-900">
                            {it.type || "Incident"}
                          </div>
                          <div className="text-[11px] text-slate-500">
                            {it.created_by ? `By ${it.created_by}` : ""}{" "}
                            {it.created_at ? `· ${niceShort(it.created_at)}` : ""}
                          </div>
                        </div>
                        {it.details && (
                          <div className="mt-1 text-[12px] text-slate-700">
                            {it.details}
                          </div>
                        )}
                        {(it.corrective_action || it.preventive_action) && (
                          <div className="mt-2 text-[11px] text-slate-600">
                            {it.corrective_action ? (
                              <div>
                                <span className="font-semibold">Fix:</span>{" "}
                                {it.corrective_action}
                              </div>
                            ) : null}
                            {it.preventive_action ? (
                              <div className="mt-1">
                                <span className="font-semibold">Prevent:</span>{" "}
                                {it.preventive_action}
                              </div>
                            ) : null}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* ===== Today’s Weekly / Monthly tasks (with visible swipe) ===== */}
        <div className="mt-2 space-y-2">
          <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-gray-500">
            Weekly / Monthly due today
          </div>
          {nonDailyToday.length === 0 ? (
            <div className="rounded-2xl border border-gray-200/80 bg-white/70 p-3 text-sm text-gray-500">
              No weekly or monthly tasks due today.
            </div>
          ) : (
            <div className="space-y-2">
              {nonDailyToday.map((t) => {
                const key = `${t.id}|${today}`;
                const done = runsKey.has(key);
                const run = runsKey.get(key) || null;

                return (
                  <WeeklyMonthlyTaskRow
                    key={t.id}
                    task={t}
                    done={done}
                    run={run}
                    today={today}
                    initials={ini}
                    onComplete={completeOne}
                    onUndo={uncompleteOne}
                  />
                );
              })}
            </div>
          )}
        </div>

        {/* ===== Today’s daily tasks – by category with collapsible cards ===== */}
        <div className="mt-4">
          <div className="mb-1 flex items-center justify-between">
            <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-gray-500">
              Daily tasks (checklist by category)
            </div>
          </div>
          <div className="mb-3 text-[11px] text-slate-600">
            Tip: on phones you can{" "}
            <span className="font-semibold">
              swipe a task card left to complete and right to undo
            </span>
            , or just use the Tick / Undo buttons.
          </div>

          {categoriesWithTasks.length === 0 ? (
            <div className="rounded-2xl border border-slate-200/80 bg-white/70 p-3 text-sm text-slate-500">
              No daily tasks due today.
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
              {categoriesWithTasks.map((cat) => {
                const list = dailyByCat.get(cat) ?? [];
                const total = list.length;
                const done = list.filter((t) => runsKey.has(`${t.id}|${today}`))
                  .length;
                const open = total - done;
                const expanded = openCategory === cat;

                // Opening checks specifically: collapsible and default collapsed (we already start with null openCategory)
                const caret = expanded ? "▾" : "▸";

                return (
                  <div
                    key={cat}
                    className="flex flex-col rounded-2xl border border-slate-200/80 bg-white/80 p-3 text-sm shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
                  >
                    <button
                      type="button"
                      className="mb-2 flex w-full items-start justify-between gap-2 text-left"
                      onClick={() => setOpenCategory(expanded ? null : cat)}
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-base leading-none text-slate-500">
                            {caret}
                          </span>
                          <div className="text-sm font-semibold text-slate-900">
                            {cat}
                          </div>
                        </div>
                        <div className="mt-1 text-[11px] text-slate-500">
                          {done}/{total} complete · {open} open
                        </div>
                      </div>

                      <button
                        type="button"
                        className="shrink-0 rounded-full bg-emerald-600/90 px-3 py-1 text-[11px] font-semibold text-white shadow-sm hover:bg-emerald-500 disabled:opacity-40"
                        disabled={open === 0 || !ini}
                        onClick={(e) => {
                          e.stopPropagation();
                          const ids = list
                            .filter((t) => !runsKey.has(`${t.id}|${today}`))
                            .map((t) => t.id);
                          completeMany(ids, ini);
                        }}
                      >
                        Complete all
                      </button>
                    </button>

                    {expanded && (
                      <div className="mt-1 space-y-2">
                        {list.map((t) => {
                          const key = `${t.id}|${today}`;
                          const isDone = runsKey.has(key);
                          const run = runsKey.get(key) || null;

                          return (
                            <SwipeCard
                              key={t.id}
                              task={t}
                              done={isDone}
                              run={run}
                              today={today}
                              initials={ini}
                              onComplete={completeOne}
                              onUndo={uncompleteOne}
                            />
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ===== Upcoming (next 7 days) — weekly/monthly only ===== */}
      <div className={CARD + " p-4"}>
        <div className="mb-2 text-base font-semibold text-slate-900">
          Upcoming (next 7 days)
        </div>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3 lg:grid-cols-4">
          {upcoming.map(({ day, list }) => (
            <div
              key={day}
              className="rounded-2xl border border-gray-200/80 bg-white/80 p-3 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
            >
              <div className="mb-1 flex items-center justify-between">
                <div className="font-medium text-slate-900">{niceShort(day)}</div>
                <div className="text-xs text-gray-500">{list.length} due</div>
              </div>
              {list.length === 0 ? (
                <div className="text-sm text-gray-500">No tasks</div>
              ) : (
                <ul className="space-y-2">
                  {list.map((t) => (
                    <li
                      key={t.id}
                      className="rounded-xl border border-gray-200/80 bg-white px-2 py-1.5 text-sm"
                    >
                      <div className="font-medium text-slate-900">{t.task}</div>
                      <div className="text-xs text-gray-500">
                        {t.category ?? t.area ?? "—"} •{" "}
                        {t.frequency === "weekly" ? "Weekly" : "Monthly"}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* ===== Manage Tasks Modal ===== */}
      <ManageCleaningTasksModal
        open={canManage && manageOpen}
        onClose={() => setManageOpen(false)}
        onSaved={async () => {
          await loadAll();
        }}
      />
    </div>
  );
}

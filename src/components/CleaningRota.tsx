"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { supabase } from "@/lib/supabaseBrowser";
import { getActiveOrgIdClient } from "@/lib/orgClient";
import { getActiveLocationIdClient } from "@/lib/locationClient";
import ManageCleaningTasksModal, {
  CLEANING_CATEGORIES,
} from "@/components/ManageCleaningTasksModal";

const PAGE = "w-full px-3 sm:px-4 md:mx-auto md:max-w-[1100px]";

const CARD =
  "rounded-3xl border border-white/40 bg-white/70 shadow-lg backdrop-blur-md";

type Frequency = "daily" | "weekly" | "monthly";

type Task = {
  id: string;
  org_id: string;
  task: string;
  area: string | null;
  category: string | null;
  frequency: Frequency;
  weekday: number | null; // 0-6 (Sun-Sat) or your convention
  month_day: number | null; // 1-31
};

type Run = {
  task_id: string;
  run_on: string; // yyyy-mm-dd
  done_by: string | null;
  done_at?: string | null;
};

type Deferral = {
  task_id: string;
  from_on: string; // yyyy-mm-dd
  to_on: string; // yyyy-mm-dd
};

const isoDate = (d: Date) => d.toISOString().slice(0, 10);

function startOfWeekMonday(d: Date) {
  const x = new Date(d);
  const day = x.getDay(); // 0=Sun..6=Sat
  const diff = (day === 0 ? -6 : 1) - day; // Monday start
  x.setDate(x.getDate() + diff);
  x.setHours(0, 0, 0, 0);
  return x;
}

function endOfWeekSunday(d: Date) {
  const s = startOfWeekMonday(d);
  const e = new Date(s);
  e.setDate(e.getDate() + 6);
  e.setHours(23, 59, 59, 999);
  return e;
}

function addDays(d: Date, days: number) {
  const x = new Date(d);
  x.setDate(x.getDate() + days);
  return x;
}

// Your existing “is task due on a date” rules.
function isDueOn(task: Task, date: Date) {
  if (task.frequency === "daily") return true;

  if (task.frequency === "weekly") {
    if (task.weekday === null || task.weekday === undefined) return false;
    // Assuming DB uses 0=Sun..6=Sat
    return date.getDay() === task.weekday;
  }

  if (task.frequency === "monthly") {
    if (!task.month_day) return false;
    return date.getDate() === task.month_day;
  }

  return false;
}

/** Tiny “confetti” overlay using framer-motion only (no deps). */
function MiniConfetti({ show }: { show: boolean }) {
  const pieces = useMemo(() => {
    // Deterministic-ish so it doesn’t re-randomize mid-animation
    const out = [];
    for (let i = 0; i < 22; i++) out.push(i);
    return out;
  }, []);

  if (!show) return null;

  return (
    <div className="pointer-events-none fixed inset-0 z-[9999] overflow-hidden">
      {pieces.map((i) => (
        <motion.div
          key={i}
          className="absolute top-[-20px] text-xl"
          initial={{
            opacity: 0,
            x: `${(i * 37) % 100}vw`,
            y: -20,
            rotate: 0,
            scale: 0.9,
          }}
          animate={{
            opacity: [0, 1, 1, 0],
            y: ["-20px", "110vh"],
            rotate: [0, 360 + i * 40],
          }}
          transition={{
            duration: 1.6,
            ease: "easeOut",
            delay: (i % 7) * 0.03,
          }}
        >
          {["✨", "🎉", "🟩", "🟨", "🟦"][i % 5]}
        </motion.div>
      ))}
    </div>
  );
}

export default function CleaningRotaPage() {
  const today = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  const todayIso = useMemo(() => isoDate(today), [today]);
  const tomorrowIso = useMemo(() => isoDate(addDays(today, 1)), [today]);

  const [orgId, setOrgId] = useState<string | null>(null);
  const [locationId, setLocationId] = useState<string | null>(null);

  const [tasks, setTasks] = useState<Task[]>([]);
  const [runs, setRuns] = useState<Run[]>([]);
  const [deferrals, setDeferrals] = useState<Deferral[]>([]);

  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const [manageOpen, setManageOpen] = useState(false);
  const [initials, setInitials] = useState<string>("");

  const [showConfetti, setShowConfetti] = useState(false);
  const prevAllDoneRef = useRef<boolean>(false);

  // --- deferral maps (fast lookups) ---
  const deferralsFromMap = useMemo(() => {
    const m = new Map<string, Set<string>>(); // dateIso -> set(taskId)
    for (const d of deferrals) {
      if (!m.has(d.from_on)) m.set(d.from_on, new Set());
      m.get(d.from_on)!.add(d.task_id);
    }
    return m;
  }, [deferrals]);

  const deferralsToMap = useMemo(() => {
    const m = new Map<string, Set<string>>(); // dateIso -> set(taskId)
    for (const d of deferrals) {
      if (!m.has(d.to_on)) m.set(d.to_on, new Set());
      m.get(d.to_on)!.add(d.task_id);
    }
    return m;
  }, [deferrals]);

  function isDueEffective(task: Task, date: Date) {
    const dIso = isoDate(date);
    const deferredFrom = deferralsFromMap.get(dIso)?.has(task.id) ?? false;
    const deferredTo = deferralsToMap.get(dIso)?.has(task.id) ?? false;

    if (deferredFrom) return false;
    if (deferredTo) return true;

    return isDueOn(task, date);
  }

  const runsByTask = useMemo(() => {
    const m = new Map<string, Run>();
    for (const r of runs) m.set(r.task_id, r);
    return m;
  }, [runs]);

  async function loadAll() {
    setLoading(true);
    setErr(null);

    try {
      const oid = await getActiveOrgIdClient();
      const lid = await getActiveLocationIdClient();
      setOrgId(oid);
      setLocationId(lid);

      if (!oid || !lid) {
        setTasks([]);
        setRuns([]);
        setDeferrals([]);
        setLoading(false);
        return;
      }

      // 1) tasks
      const { data: tData, error: tErr } = await supabase
        .from("cleaning_tasks")
        .select("id,org_id,task,area,category,frequency,weekday,month_day")
        .eq("org_id", oid)
        .order("category", { ascending: true })
        .order("task", { ascending: true });

      if (tErr) throw tErr;

      // 2) runs for today
      const { data: rData, error: rErr } = await supabase
        .from("cleaning_task_runs")
        .select("task_id,run_on,done_by,done_at")
        .eq("org_id", oid)
        .eq("location_id", lid)
        .eq("run_on", todayIso);

      if (rErr) throw rErr;

      // 3) deferrals (only current week window: Mon..Sun)
      const weekStart = isoDate(startOfWeekMonday(today));
      const weekEnd = isoDate(endOfWeekSunday(today));

      const { data: dData, error: dErr } = await supabase
        .from("cleaning_task_deferrals")
        .select("task_id,from_on,to_on")
        .eq("org_id", oid)
        .eq("location_id", lid)
        .gte("from_on", weekStart)
        .lte("to_on", weekEnd);

      if (dErr) {
        // eslint-disable-next-line no-console
        console.warn("[cleaning] deferrals fetch failed:", dErr.message);
      }

      setTasks((tData ?? []) as Task[]);
      setRuns((rData ?? []) as Run[]);
      setDeferrals(((dData ?? []) as Deferral[]) || []);
    } catch (e: any) {
      setErr(e?.message ?? "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // --- derived lists (today only) ---
  const dueToday = useMemo(() => {
    return tasks.filter((t) => isDueEffective(t, today));
  }, [tasks, today, deferralsFromMap, deferralsToMap]);

  const doneCount = useMemo(() => {
    let done = 0;
    for (const t of dueToday) {
      if (runsByTask.has(t.id)) done++;
    }
    return done;
  }, [dueToday, runsByTask]);

  // ✅ Confetti ONLY when transitioning into "all done"
  useEffect(() => {
    const allDone = dueToday.length > 0 && doneCount === dueToday.length;
    const wasAllDone = prevAllDoneRef.current;

    if (!wasAllDone && allDone) {
      setShowConfetti(true);
      window.setTimeout(() => setShowConfetti(false), 1700);
    }

    prevAllDoneRef.current = allDone;
  }, [doneCount, dueToday.length]);

  const groupedByCategory = useMemo(() => {
    const m = new Map<string, Task[]>();
    for (const t of dueToday) {
      const cat = t.category?.trim() || "Other";
      if (!m.has(cat)) m.set(cat, []);
      m.get(cat)!.push(t);
    }
    const ordered: Array<[string, Task[]]> = [];
    for (const c of CLEANING_CATEGORIES) {
      if (m.has(c)) ordered.push([c, m.get(c)!]);
    }
    for (const [k, v] of m.entries()) {
      if (!ordered.find(([ok]) => ok === k)) ordered.push([k, v]);
    }
    return ordered;
  }, [dueToday]);

  async function tickTask(taskId: string) {
    if (!orgId || !locationId) return;

    const payload = {
      org_id: orgId,
      location_id: locationId,
      task_id: taskId,
      run_on: todayIso,
      done_by: initials?.trim() || null,
    };

    const { data, error } = await supabase
      .from("cleaning_task_runs")
      .upsert(payload, { onConflict: "task_id,run_on" })
      .select("task_id,run_on,done_by,done_at")
      .maybeSingle();

    if (error) {
      alert(error.message);
      return;
    }

    const row: Run = (data as any) ?? {
      task_id: taskId,
      run_on: todayIso,
      done_by: payload.done_by,
      done_at: new Date().toISOString(),
    };

    // ✅ Local state update only (no full reload)
    setRuns((prev) => {
      const next = prev.filter((r) => r.task_id !== taskId);
      next.push(row);
      return next;
    });
  }

  async function undoTask(taskId: string) {
    if (!orgId || !locationId) return;

    const { error } = await supabase
      .from("cleaning_task_runs")
      .delete()
      .eq("org_id", orgId)
      .eq("location_id", locationId)
      .eq("task_id", taskId)
      .eq("run_on", todayIso);

    if (error) {
      alert(error.message);
      return;
    }

    // ✅ Local state update only
    setRuns((prev) => prev.filter((r) => r.task_id !== taskId));
  }

  // defer to tomorrow (this week only)
  async function deferToTomorrow(taskId: string) {
    if (!orgId || !locationId) return;

    if (runsByTask.has(taskId)) return;

    const weekEnd = endOfWeekSunday(today);
    const tomorrow = addDays(today, 1);
    if (tomorrow.getTime() > weekEnd.getTime()) return;

    const payload = {
      org_id: orgId,
      location_id: locationId,
      task_id: taskId,
      from_on: todayIso,
      to_on: tomorrowIso,
      // NOTE: your DB error earlier shows created_by may not exist.
      // We do not send it to avoid schema mismatch.
    };

    const { error } = await supabase
      .from("cleaning_task_deferrals")
      .upsert(payload, { onConflict: "org_id,location_id,task_id,from_on" });

    if (error) {
      alert(error.message);
      return;
    }

    // ✅ Local state update only
    setDeferrals((prev) => [
      ...prev.filter((d) => !(d.task_id === taskId && d.from_on === todayIso)),
      { task_id: taskId, from_on: todayIso, to_on: tomorrowIso },
    ]);
  }

  async function completeAllInCategory(taskIds: string[]) {
    if (!orgId || !locationId) return;

    const idsToDo = taskIds.filter((id) => !runsByTask.has(id));
    if (idsToDo.length === 0) return;

    const nowIso = new Date().toISOString();
    const doneBy = initials?.trim() || null;

    const payloads = idsToDo.map((task_id) => ({
      org_id: orgId,
      location_id: locationId,
      task_id,
      run_on: todayIso,
      done_by: doneBy,
      done_at: nowIso,
    }));

    const { data, error } = await supabase
      .from("cleaning_task_runs")
      .upsert(payloads, { onConflict: "task_id,run_on" })
      .select("task_id,run_on,done_by,done_at");

    if (error) {
      alert(error.message);
      return;
    }

    const returned = (data ?? []) as any[];
    const returnedRuns: Run[] =
      returned.length > 0
        ? returned.map((r) => ({
            task_id: r.task_id,
            run_on: r.run_on,
            done_by: r.done_by,
            done_at: r.done_at,
          }))
        : payloads.map((p) => ({
            task_id: p.task_id,
            run_on: p.run_on,
            done_by: p.done_by,
            done_at: p.done_at,
          }));

    // ✅ Single local state update instead of N reloads
    setRuns((prev) => {
      const keep = prev.filter((r) => !idsToDo.includes(r.task_id));
      return [...keep, ...returnedRuns];
    });
  }

  if (loading) {
    return (
      <div className={PAGE}>
        <div className={`${CARD} p-5`}>Loading…</div>
      </div>
    );
  }

  if (err) {
    return (
      <div className={PAGE}>
        <div className={`${CARD} p-5 text-red-700`}>{err}</div>
      </div>
    );
  }

  return (
    <div className={PAGE}>
      <MiniConfetti show={showConfetti} />

      <div className={`${CARD} p-4 sm:p-5`}>
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="text-lg font-semibold text-slate-900">
              Cleaning rota
            </div>
            <div className="text-xs text-slate-500">{todayIso}</div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setManageOpen(true)}
              className="rounded-full bg-indigo-600 px-3 py-2 text-xs font-semibold text-white hover:bg-indigo-700"
            >
              Manage tasks
            </button>

            <div className="hidden sm:flex items-center gap-2">
              <span className="text-xs text-slate-500">Initials</span>
              <input
                value={initials}
                onChange={(e) => setInitials(e.target.value.toUpperCase())}
                placeholder="WS"
                className="h-9 w-20 rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none"
              />
            </div>

            <div className="rounded-full bg-slate-900 px-3 py-2 text-xs font-semibold text-white">
              {doneCount}/{dueToday.length}
            </div>

            <button
              onClick={() => completeAllInCategory(dueToday.map((t) => t.id))}
              className="rounded-full bg-emerald-500 px-3 py-2 text-xs font-semibold text-white hover:bg-emerald-600"
            >
              Complete all today
            </button>
          </div>
        </div>

        <div className="mt-4 text-xs text-slate-500">
          Tip: On phones you can swipe a task card left to complete and right to
          undo, or just use the Tick / Undo buttons.
        </div>

        <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
          {groupedByCategory.map(([category, list]) => {
            const catDone = list.filter((t) => runsByTask.has(t.id)).length;
            const open = list.length - catDone;

            return (
              <div
                key={category}
                className="rounded-2xl border border-slate-200 bg-white p-3"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-sm font-semibold text-slate-900">
                      {category}
                    </div>
                    <div className="text-xs text-slate-500">
                      {catDone}/{list.length} complete · {open} open
                    </div>
                  </div>

                  <button
                    onClick={() => completeAllInCategory(list.map((t) => t.id))}
                    className="rounded-full bg-emerald-100 px-3 py-2 text-xs font-semibold text-emerald-800 hover:bg-emerald-200"
                  >
                    Complete all
                  </button>
                </div>

                <div className="mt-3 space-y-2">
                  {list.map((t) => {
                    const run = runsByTask.get(t.id);
                    const done = !!run;

                    const deferredFromToday =
                      deferralsFromMap.get(todayIso)?.has(t.id) ?? false;

                    return (
                      <motion.div
                        key={t.id}
                        className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm"
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.15 }}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <div className="text-sm font-semibold text-slate-900">
                              {t.task}
                            </div>
                            <div className="text-xs text-slate-500">
                              {t.area ?? "—"} · {t.frequency}
                            </div>

                            {deferredFromToday && !done && (
                              <div className="mt-1 inline-flex rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-700">
                                Deferred to tomorrow
                              </div>
                            )}

                            {done && (
                              <div className="mt-1 text-xs text-slate-500">
                                Done by {run?.done_by || "—"}
                              </div>
                            )}
                          </div>

                          <div className="flex items-center gap-2">
                            {!done && (
                              <button
                                onClick={() => deferToTomorrow(t.id)}
                                className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-200"
                                title="Move this task to tomorrow (this week only)"
                              >
                                Defer
                              </button>
                            )}

                            {!done ? (
                              <button
                                onClick={() => tickTask(t.id)}
                                className="rounded-full bg-rose-100 px-3 py-1.5 text-xs font-semibold text-rose-800 hover:bg-rose-200"
                              >
                                Tick
                              </button>
                            ) : (
                              <button
                                onClick={() => undoTask(t.id)}
                                className="rounded-full bg-emerald-100 px-3 py-1.5 text-xs font-semibold text-emerald-800 hover:bg-emerald-200"
                              >
                                Undo
                              </button>
                            )}
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
<ManageCleaningTasksModal
  open={manageOpen}
  onClose={() => setManageOpen(false)}
  onSaved={loadAll}
/>

    </div>
  );
}

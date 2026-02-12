"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { ChevronDown, ChevronRight } from "lucide-react";
import { supabase } from "@/lib/supabaseBrowser";
import { getActiveOrgIdClient } from "@/lib/orgClient";
import { getActiveLocationIdClient } from "@/lib/locationClient";
import ManageCleaningTasksModal, { CLEANING_CATEGORIES } from "@/components/ManageCleaningTasksModal";

const PAGE = "w-full px-3 sm:px-4 md:mx-auto md:max-w-[1100px]";

const CARD = "rounded-3xl border border-white/40 bg-white/70 shadow-lg backdrop-blur-md";

type Frequency = "daily" | "weekly" | "monthly";

type Task = {
  id: string;
   location_id: string; // ✅ add
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
  run_on: string; // yyyy-mm-dd
  done_by: string | null;
  done_at?: string | null;
};

type Deferral = {
  task_id: string;
  from_on: string;
  to_on: string;
};

type DaySignoff = {
  id: string;
  signoff_on: string;
  signed_by: string | null;
  notes: string | null;
  created_at: string | null;
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

function isDueOn(task: Task, date: Date) {
  if (task.frequency === "daily") return true;

  if (task.frequency === "weekly") {
    if (task.weekday === null || task.weekday === undefined) return false;
    return date.getDay() === task.weekday;
  }

  if (task.frequency === "monthly") {
    if (!task.month_day) return false;
    return date.getDate() === task.month_day;
  }

  return false;
}

/** Pick the most reliable initials value (userInitials wins). */
function bestInitials(userInitials: string, initials: string) {
  return (userInitials || initials).trim().toUpperCase();
}

/** Classic confetti overlay (no emojis) using framer-motion only. */
function ClassicConfetti({ show }: { show: boolean }) {
  const pieces = useMemo(() => Array.from({ length: 34 }, (_, i) => i), []);

  if (!show) return null;

  const colors = ["bg-emerald-400", "bg-amber-400", "bg-sky-400", "bg-rose-400", "bg-indigo-400", "bg-lime-400"];

  return (
    <div className="pointer-events-none fixed inset-0 z-[9999] overflow-hidden">
      {pieces.map((i) => {
        const leftVw = (i * 17) % 100;
        const size = 6 + ((i * 3) % 8);
        const isStrip = i % 3 === 0;

        return (
          <motion.div
            key={i}
            className={[
              "absolute top-[-20px]",
              colors[i % colors.length],
              "shadow-sm",
              isStrip ? "rounded-sm" : "rounded-full",
            ].join(" ")}
            style={{
              left: `${leftVw}vw`,
              width: isStrip ? size + 6 : size,
              height: isStrip ? size - 2 : size,
            }}
            initial={{ opacity: 0, y: -20, rotate: 0 }}
            animate={{
              opacity: [0, 1, 1, 0],
              y: ["-20px", "110vh"],
              rotate: [0, 520 + i * 25],
            }}
            transition={{
              duration: 1.55,
              ease: "easeOut",
              delay: (i % 10) * 0.02,
            }}
          />
        );
      })}
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

  // Header initials box (staff can still override)
  const [initials, setInitials] = useState<string>("");

  // ✅ Logged-in user's initials (authoritative default)
  const [userInitials, setUserInitials] = useState<string>("");

  const [showConfetti, setShowConfetti] = useState(false);

  // Collapsible categories (default expanded)
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  // Prevent confetti on first load, and only allow it after a user action
  const initializedRef = useRef(false);
  const userActionRef = useRef(false);
  const prevAllDoneRef = useRef<boolean>(false);

  // ===== Day sign-off (daily_signoffs) =====
  const [signoff, setSignoff] = useState<DaySignoff | null>(null);
  const [signoffOpen, setSignoffOpen] = useState(false);
  const [signoffInitials, setSignoffInitials] = useState("");
  const [signoffNotes, setSignoffNotes] = useState("");
  const [signoffSaving, setSignoffSaving] = useState(false);

  const deferralsFromMap = useMemo(() => {
    const m = new Map<string, Set<string>>();
    for (const d of deferrals) {
      if (!m.has(d.from_on)) m.set(d.from_on, new Set());
      m.get(d.from_on)!.add(d.task_id);
    }
    return m;
  }, [deferrals]);

  const deferralsToMap = useMemo(() => {
    const m = new Map<string, Set<string>>();
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

  async function loadSignoff(oid: string, lid: string) {
    const { data, error } = await supabase
      .from("daily_signoffs")
      .select("id, signoff_on, signed_by, notes, created_at")
      .eq("org_id", oid)
      .eq("location_id", lid)
      .eq("signoff_on", todayIso)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      console.warn("[cleaning] signoff fetch failed:", error.message);
      setSignoff(null);
      return;
    }

    if (!data) {
      setSignoff(null);
      return;
    }

    setSignoff({
      id: String((data as any).id),
      signoff_on: String((data as any).signoff_on),
      signed_by: (data as any).signed_by ? String((data as any).signed_by) : null,
      notes: (data as any).notes ? String((data as any).notes) : null,
      created_at: (data as any).created_at ? String((data as any).created_at) : null,
    });
  }

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
        setSignoff(null);
        setLoading(false);
        return;
      }

      // ✅ Load current user's initials from team_members (reliable default)
      try {
        const { data: userRes } = await supabase.auth.getUser();
        const userId = userRes.user?.id;
        if (userId) {
          const { data: tm, error: tmErr } = await supabase
            .from("team_members")
            .select("initials")
            .eq("org_id", oid)
            .eq("user_id", userId)
            .maybeSingle();

          if (!tmErr && tm && (tm as any).initials) {
            const ini = String((tm as any).initials).trim().toUpperCase();
            if (ini) {
              setUserInitials(ini);
              // only set the header initials if the user hasn't already typed something
              setInitials((prev) => (prev.trim() ? prev : ini));
            }
          }
        }
      } catch (e) {
        // non-fatal; user can still type initials manually
        console.warn("[cleaning] unable to auto-load initials", e);
      }

      const { data: tData, error: tErr } = await supabase
        .from("cleaning_tasks")
        .select("id,org_id,task,area,category,frequency,weekday,month_day")
        .eq("org_id", oid)
        .eq("location_id", lid) // ✅ key fix
        .order("category", { ascending: true })
        .order("task", { ascending: true });

      if (tErr) throw tErr;

      const { data: rData, error: rErr } = await supabase
        .from("cleaning_task_runs")
        .select("task_id,run_on,done_by,done_at")
        .eq("org_id", oid)
        .eq("location_id", lid)
        .eq("run_on", todayIso);

      if (rErr) throw rErr;

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
        console.warn("[cleaning] deferrals fetch failed:", dErr.message);
      }

      setTasks((tData ?? []) as Task[]);
      setRuns((rData ?? []) as Run[]);
      setDeferrals(((dData ?? []) as Deferral[]) || []);

      // load signoff for today
      await loadSignoff(oid, lid);
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

  // ✅ If we later discover userInitials, ensure header initials is defaulted (unless user already typed)
  useEffect(() => {
    const ini = userInitials.trim().toUpperCase();
    if (!ini) return;
    setInitials((prev) => (prev.trim() ? prev : ini));
  }, [userInitials]);

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

  const allDone = useMemo(() => {
    return dueToday.length > 0 && doneCount === dueToday.length;
  }, [dueToday.length, doneCount]);

  useEffect(() => {
    if (!initializedRef.current) {
      initializedRef.current = true;
      prevAllDoneRef.current = allDone;
      return;
    }

    const wasAllDone = prevAllDoneRef.current;

    // confetti on transition to all done (user action only)
    if (!wasAllDone && allDone && userActionRef.current) {
      setShowConfetti(true);
      window.setTimeout(() => setShowConfetti(false), 1600);

      // auto-open signoff prompt if not already signed off
      if (!signoff) {
        const best = bestInitials(userInitials, initials);
        setSignoffInitials((prev) => (prev.trim() ? prev : best));
        setSignoffNotes("");
        setSignoffOpen(true);
      }

      userActionRef.current = false;
    }

    prevAllDoneRef.current = allDone;
  }, [allDone, initials, userInitials, signoff]);

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

  // Ensure we have an explicit collapsed state for new categories (default expanded)
  useEffect(() => {
    setCollapsed((prev) => {
      const next = { ...prev };
      for (const [category] of groupedByCategory) {
        if (typeof next[category] !== "boolean") next[category] = false;
      }
      return next;
    });
  }, [groupedByCategory]);

  function toggleCategory(category: string) {
    setCollapsed((prev) => ({ ...prev, [category]: !prev[category] }));
  }

  async function tickTask(taskId: string) {
    if (!orgId || !locationId) return;

    userActionRef.current = true;

    const doneBy = bestInitials(userInitials, initials) || null;

    const payload = {
      org_id: orgId,
      location_id: locationId,
      task_id: taskId,
      run_on: todayIso,
      done_by: doneBy,
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

    setRuns((prev) => {
      const next = prev.filter((r) => r.task_id !== taskId);
      next.push(row);
      return next;
    });
  }

  async function undoTask(taskId: string) {
    if (!orgId || !locationId) return;

    userActionRef.current = true;

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

    setRuns((prev) => prev.filter((r) => r.task_id !== taskId));
  }

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
    };

    const { error } = await supabase
      .from("cleaning_task_deferrals")
      .upsert(payload, { onConflict: "org_id,location_id,task_id,from_on" });

    if (error) {
      alert(error.message);
      return;
    }

    setDeferrals((prev) => [
      ...prev.filter((d) => !(d.task_id === taskId && d.from_on === todayIso)),
      { task_id: taskId, from_on: todayIso, to_on: tomorrowIso },
    ]);
  }

  async function completeAllInCategory(taskIds: string[]) {
    if (!orgId || !locationId) return;

    const idsToDo = taskIds.filter((id) => !runsByTask.has(id));
    if (idsToDo.length === 0) return;

    userActionRef.current = true;

    const nowIso = new Date().toISOString();
    const doneBy = bestInitials(userInitials, initials) || null;

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

    setRuns((prev) => {
      const keep = prev.filter((r) => !idsToDo.includes(r.task_id));
      return [...keep, ...returnedRuns];
    });
  }

  async function createSignoff() {
    if (!orgId || !locationId) return;

    if (!allDone) {
      alert("Complete all cleaning tasks due today before signing off.");
      return;
    }
    if (signoff) return;

    const ini = signoffInitials.trim().toUpperCase();
    if (!ini) {
      alert("Enter initials to sign off.");
      return;
    }

    setSignoffSaving(true);
    try {
      const payload = {
        org_id: orgId,
        location_id: locationId,
        signoff_on: todayIso,
        signed_by: ini,
        notes: signoffNotes.trim() || null,
      };

      const { data, error } = await supabase
        .from("daily_signoffs")
        .insert(payload)
        .select("id, signoff_on, signed_by, notes, created_at")
        .single();

      if (error) throw error;

      setSignoff({
        id: String((data as any).id),
        signoff_on: String((data as any).signoff_on),
        signed_by: (data as any).signed_by ? String((data as any).signed_by) : null,
        notes: (data as any).notes ? String((data as any).notes) : null,
        created_at: (data as any).created_at ? String((data as any).created_at) : null,
      });

      setSignoffOpen(false);
      setSignoffNotes("");
      // keep initials in state for convenience
    } catch (e: any) {
      console.error(e);
      alert(e?.message ?? "Failed to sign off the day.");
    } finally {
      setSignoffSaving(false);
    }
  }

  // ✅ When the sign-off modal opens, auto-fill initials from the logged-in user if blank
  useEffect(() => {
    if (!signoffOpen) return;
    if (signoffInitials.trim()) return;

    const best = bestInitials(userInitials, initials);
    if (!best) return;

    setSignoffInitials(best);
  }, [signoffOpen, signoffInitials, userInitials, initials]);

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

  const doneCountDisplay = `${runsByTask.size}/${dueToday.length}`;

  return (
    <div className={PAGE}>
      <ClassicConfetti show={showConfetti} />

      <div className={`${CARD} p-4 sm:p-5`}>
        {/* Header: mobile-safe wrapping */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="text-lg font-semibold text-slate-900">Cleaning rota</div>
            <div className="text-xs text-slate-500">{todayIso}</div>
          </div>

          <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto sm:justify-end">
            <button
              onClick={() => setManageOpen(true)}
              className="h-9 whitespace-nowrap rounded-full bg-indigo-600 px-3 text-xs font-semibold leading-none text-white hover:bg-indigo-700"
            >
              Manage tasks
            </button>

            {/* ✅ Sign off button */}
            <button
              onClick={() => {
                const best = bestInitials(userInitials, initials);
                setSignoffInitials((prev) => (prev.trim() ? prev : best));
                setSignoffNotes("");
                setSignoffOpen(true);
              }}
              disabled={!allDone || !!signoff}
              className={[
                "h-9 whitespace-nowrap rounded-full px-3 text-xs font-semibold leading-none",
                signoff
                  ? "bg-slate-200 text-slate-700"
                  : !allDone
                  ? "bg-slate-200 text-slate-700 opacity-70"
                  : "bg-emerald-600 text-white hover:bg-emerald-700",
              ].join(" ")}
              title={signoff ? "Day signed off" : allDone ? "Sign off the day" : "Complete all tasks first"}
            >
              {signoff ? "Day signed off" : "Sign off day"}
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

            <div className="flex h-9 items-center whitespace-nowrap rounded-full bg-slate-900 px-3 text-xs font-semibold leading-none text-white">
              {doneCountDisplay}
            </div>

            <button
              onClick={() => completeAllInCategory(dueToday.map((t) => t.id))}
              className="h-9 whitespace-nowrap rounded-full bg-emerald-500 px-3 text-xs font-semibold leading-none text-white hover:bg-emerald-600"
            >
              Complete all today
            </button>
          </div>
        </div>

        <div className="mt-4 text-xs text-slate-500">
          Tip: On phones you can swipe a task card left to complete and right to undo, or just use the Tick / Undo buttons.
        </div>

        {/* Optional hint banner when all done but not signed off */}
        {allDone && !signoff && (
          <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-900">
            All cleaning tasks are complete. Sign off the day to lock it in.
          </div>
        )}

        <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
          {groupedByCategory.map(([category, list]) => {
            const catDone = list.filter((t) => runsByTask.has(t.id)).length;
            const open = list.length - catDone;
            const isCollapsed = collapsed[category] ?? false;

            return (
              <div key={category} className="rounded-2xl border border-slate-200 bg-white p-3">
                {/* Collapsible header */}
                <div className="flex items-start justify-between gap-3">
                  <button
                    type="button"
                    onClick={() => toggleCategory(category)}
                    className="flex w-full items-start gap-2 text-left"
                    aria-expanded={!isCollapsed}
                  >
                    <span className="mt-0.5 text-slate-500">
                      {isCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    </span>

                    <div className="flex-1">
                      <div className="text-sm font-semibold text-slate-900">{category}</div>
                      <div className="text-xs text-slate-500">
                        {catDone}/{list.length} complete · {open} open
                      </div>
                    </div>
                  </button>

                  <button
                    onClick={() => completeAllInCategory(list.map((t) => t.id))}
                    className="shrink-0 rounded-full bg-emerald-100 px-3 py-2 text-xs font-semibold text-emerald-800 hover:bg-emerald-200"
                  >
                    Complete all
                  </button>
                </div>

                {!isCollapsed && (
                  <div className="mt-3 space-y-2">
                    {list.map((t) => {
                      const run = runsByTask.get(t.id);
                      const done = !!run;

                      const deferredFromToday = deferralsFromMap.get(todayIso)?.has(t.id) ?? false;

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
                              <div className="text-sm font-semibold text-slate-900">{t.task}</div>
                              <div className="text-xs text-slate-500">
                                {t.area ?? "—"} · {t.frequency}
                              </div>

                              {deferredFromToday && !done && (
                                <div className="mt-1 inline-flex rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-700">
                                  Deferred to tomorrow
                                </div>
                              )}

                              {done && (
                                <div className="mt-1 text-xs text-slate-500">Done by {run?.done_by || "—"}</div>
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
                )}
              </div>
            );
          })}
        </div>
      </div>

      <ManageCleaningTasksModal open={manageOpen} onClose={() => setManageOpen(false)} onSaved={loadAll} />

      {/* ✅ Sign-off modal */}
      {signoffOpen && (
        <div className="fixed inset-0 z-50 bg-black/30" onClick={() => setSignoffOpen(false)}>
          <div
            className="mx-auto mt-10 w-full max-w-xl rounded-2xl border border-slate-200 bg-white/90 p-4 text-slate-900 shadow-lg backdrop-blur"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-3 flex items-center justify-between">
              <div>
                <div className="text-base font-semibold">Sign off day</div>
                <div className="mt-0.5 text-xs text-slate-500">{todayIso}</div>
              </div>
              <button
                onClick={() => setSignoffOpen(false)}
                className="rounded-md p-2 text-slate-500 hover:bg-slate-100"
                aria-label="Close"
              >
                ✕
              </button>
            </div>

            {signoff && (
              <div className="mb-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
                This day is already signed off.
              </div>
            )}

            {!allDone && !signoff && (
              <div className="mb-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
                You can’t sign off until all cleaning tasks due today are completed.
              </div>
            )}

            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs text-slate-500">Initials</label>
                <input
                  value={signoffInitials}
                  onChange={(e) => setSignoffInitials(e.target.value.toUpperCase())}
                  placeholder="WS"
                  className="h-10 w-full rounded-xl border border-slate-300 bg-white/80 px-3 text-sm"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs text-slate-500">Notes (optional)</label>
                <input
                  value={signoffNotes}
                  onChange={(e) => setSignoffNotes(e.target.value)}
                  placeholder="Any corrective actions / comments…"
                  className="h-10 w-full rounded-xl border border-slate-300 bg-white/80 px-3 text-sm"
                />
              </div>
            </div>

            <div className="mt-4 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setSignoffOpen(false)}
                className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={createSignoff}
                disabled={!allDone || !!signoff || signoffSaving}
                className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700 disabled:opacity-60"
              >
                {signoffSaving ? "Signing…" : "Sign off"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

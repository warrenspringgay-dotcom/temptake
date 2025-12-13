"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/lib/supabaseBrowser";
import { getActiveOrgIdClient } from "@/lib/orgClient";
import { getActiveLocationIdClient } from "@/lib/locationClient";
import ManageCleaningTasksModal from "@/components/ManageCleaningTasksModal";

const PAGE = "max-w-[1100px] mx-auto px-3 sm:px-4";
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
  weekday: number | null;
  month_day: number | null;
};

type Run = {
  task_id: string;
  run_on: string;
  done_by: string | null;
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

const niceFull = (d: string) =>
  new Date(d).toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

const cls = (...p: Array<string | false | null | undefined>) =>
  p.filter(Boolean).join(" ");

function bumpVibrate(ms = 10) {
  if (typeof window === "undefined") return;
  const nav = window.navigator as any;
  if (typeof nav.vibrate === "function") nav.vibrate(ms);
}

async function fireConfetti() {
  try {
    const confettiModule = await import("canvas-confetti");
    confettiModule.default();
  } catch {}
}

const WEEKDAY_LABEL: Record<number, string> = {
  1: "Mon",
  2: "Tue",
  3: "Wed",
  4: "Thu",
  5: "Fri",
  6: "Sat",
  7: "Sun",
};

/* ================= Details Modal ================= */

function CleaningTaskDetailsModal({
  open,
  onClose,
  task,
  today,
  done,
  run,
}: {
  open: boolean;
  onClose: () => void;
  task: Task | null;
  today: string;
  done: boolean;
  run: Run | null;
}) {
  if (!open || !task) return null;

  const freq =
    task.frequency === "daily"
      ? "Daily"
      : task.frequency === "weekly"
      ? "Weekly"
      : "Monthly";

  const schedule =
    task.frequency === "weekly"
      ? `Every ${task.weekday ? WEEKDAY_LABEL[task.weekday] : "—"}`
      : task.frequency === "monthly"
      ? `Day ${task.month_day ?? "—"}`
      : "Every day";

  return (
    <div
      className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <motion.div
        onClick={(e) => e.stopPropagation()}
        initial={{ opacity: 0, y: 12, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 12, scale: 0.98 }}
        transition={{ type: "spring", stiffness: 300, damping: 26 }}
        className="mx-auto mt-6 w-[min(560px,92vw)] overflow-hidden rounded-3xl border border-white/40 bg-white/90 shadow-xl shadow-slate-900/25 backdrop-blur sm:mt-20"
      >
        <div className="flex items-center justify-between border-b border-slate-200/70 px-4 py-3">
          <div className="min-w-0">
            <div className="text-[11px] uppercase tracking-[0.2em] text-slate-400">
              Cleaning task
            </div>
            <div className="truncate text-base font-semibold text-slate-900">
              {task.task}
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-xl px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-100"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <div className="space-y-3 px-4 py-4">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={cls(
                "rounded-full px-2 py-0.5 text-[11px] font-semibold",
                done
                  ? "bg-emerald-100 text-emerald-800"
                  : "bg-amber-100 text-amber-800"
              )}
            >
              {done ? "Done" : "To do"}
            </span>

            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-700">
              {freq}
            </span>

            {task.category ? (
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-700">
                {task.category}
              </span>
            ) : null}

            {task.area ? (
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-700">
                {task.area}
              </span>
            ) : null}
          </div>

          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <div className="rounded-2xl border border-slate-200 bg-white/80 p-3">
              <div className="text-[11px] font-semibold uppercase text-slate-400">
                Schedule
              </div>
              <div className="mt-1 text-sm font-semibold text-slate-900">
                {schedule}
              </div>
              <div className="mt-1 text-[11px] text-slate-500">
                Due: {niceFull(today)}
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white/80 p-3">
              <div className="text-[11px] font-semibold uppercase text-slate-400">
                Completion
              </div>
              <div className="mt-1 text-sm font-semibold text-slate-900">
                {done ? "Completed" : "Not completed"}
              </div>
              <div className="mt-1 text-[11px] text-slate-500">
                {run?.done_by ? `By ${run.done_by}` : "—"}
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-3 text-[11px] text-slate-600">
            Tip: Swipe left to mark done, swipe right to undo. Or, because we’re
            civilized, tap the button.
          </div>
        </div>
      </motion.div>
    </div>
  );
}

/* ================= Swipe Row (minimal + clickable) ================= */

type SwipeRowProps = {
  task: Task;
  done: boolean;
  run: Run | null;
  today: string;
  initials: string;
  onComplete: (taskId: string, initials: string) => void;
  onUndo: (taskId: string) => void;
  onOpenDetails: (taskId: string) => void;
};

function SwipeRow({
  task,
  done,
  run,
  today,
  initials,
  onComplete,
  onUndo,
  onOpenDetails,
}: SwipeRowProps) {
  const SWIPE_THRESHOLD = 80;

  // prevent "click" after dragging
  const draggedRef = useRef(false);

  const meta =
    task.frequency === "daily"
      ? null
      : task.frequency === "weekly"
      ? "Weekly"
      : "Monthly";

  return (
    <motion.div
      role="button"
      tabIndex={0}
      aria-label={`View details for ${task.task}`}
      className={cls(
        "relative rounded-2xl border bg-white/90 px-3 py-2 shadow-sm",
        "cursor-pointer select-none",
        done ? "border-emerald-200/70" : "border-slate-200/70"
      )}
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 6 }}
      layout
      drag="x"
      dragConstraints={{ left: 0, right: 0 }}
      dragElastic={0.2}
      dragSnapToOrigin
      onDragStart={() => {
        draggedRef.current = true;
      }}
      onDragEnd={(_, info) => {
        const offsetX = info.offset.x;

        if (offsetX < -SWIPE_THRESHOLD && !done && initials) {
          onComplete(task.id, initials);
          // allow click again after this tick
          setTimeout(() => (draggedRef.current = false), 0);
          return;
        }
        if (offsetX > SWIPE_THRESHOLD && done) {
          onUndo(task.id);
          setTimeout(() => (draggedRef.current = false), 0);
          return;
        }

        // if it was a tiny drag, still treat as click-able after the tick
        setTimeout(() => (draggedRef.current = false), 0);
      }}
      onClick={() => {
        if (draggedRef.current) return;
        onOpenDetails(task.id);
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          if (draggedRef.current) return;
          onOpenDetails(task.id);
        }
      }}
    >
      <div className="flex items-center gap-3">
        <div
          className={cls(
            "shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold",
            done
              ? "bg-emerald-100 text-emerald-800"
              : "bg-amber-100 text-amber-800"
          )}
        >
          {done ? "Done" : "To do"}
        </div>

        <div className="min-w-0 flex-1">
          <div
            className={cls(
              "truncate text-sm font-semibold",
              done ? "text-slate-500 line-through" : "text-slate-900"
            )}
          >
            {task.task}
          </div>

          <div className="mt-0.5 text-[11px] text-slate-500">
            {meta ? meta : ""}
            {run?.done_by ? (meta ? ` • ${run.done_by}` : run.done_by) : ""}
          </div>
        </div>

        {done ? (
          <button
            type="button"
            className="shrink-0 rounded-full bg-slate-100 px-3 py-1 text-[11px] font-semibold text-slate-700 hover:bg-slate-200"
            onClick={(e) => {
              e.stopPropagation();
              onUndo(task.id);
            }}
          >
            Undo
          </button>
        ) : (
          <button
            type="button"
            className="shrink-0 rounded-full bg-emerald-600 px-3 py-1 text-[11px] font-semibold text-white hover:bg-emerald-500 disabled:opacity-50"
            disabled={!initials}
            onClick={(e) => {
              e.stopPropagation();
              if (initials) onComplete(task.id, initials);
            }}
          >
            Done
          </button>
        )}
      </div>
    </motion.div>
  );
}

/* ================= Main ================= */

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
  const [canManage, setCanManage] = useState(true);

  // details modal state
  const [detailId, setDetailId] = useState<string | null>(null);
  const detailTask = useMemo(
    () => (detailId ? tasks.find((t) => t.id === detailId) ?? null : null),
    [detailId, tasks]
  );
  const detailKey = detailId ? `${detailId}|${today}` : "";
  const detailDone = detailId ? runsKey.has(detailKey) : false;
  const detailRun = detailId ? runsKey.get(detailKey) ?? null : null;

  /* ===== Load initials (logged-in first) ===== */
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
          if (myIni && list.includes(myIni))
            list = [myIni, ...list.filter((x) => x !== myIni)];
        }
      } catch {}

      setInitialsList(list);
      setIni((prev) => prev || list[0] || "");
    })();
  }, []);

  /* ===== Load role ===== */
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

  /* ===== Load tasks + today's runs ===== */
  async function loadAll() {
    const orgId = await getActiveOrgIdClient();
    const locationId = await getActiveLocationIdClient();
    if (!orgId) return;

    let tQuery = supabase
      .from("cleaning_tasks")
      .select(
        "id, org_id, task, name, area, category, frequency, weekday, month_day, location_id"
      )
      .eq("org_id", orgId);

    if (locationId) tQuery = tQuery.eq("location_id", locationId);

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

    let rQuery = supabase
      .from("cleaning_task_runs")
      .select("task_id, run_on, done_by")
      .eq("org_id", orgId)
      .eq("run_on", today);

    if (locationId) rQuery = rQuery.eq("location_id", locationId);

    const { data: rData } = await rQuery;

    setRuns(
      (rData ?? []).map((r: any) => ({
        task_id: String(r.task_id),
        run_on: r.run_on as string,
        done_by: r.done_by ?? null,
      }))
    );
  }

  useEffect(() => {
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [today]);

  /* ===== Derived: due today + sorted ===== */
  const dueToday = useMemo(
    () => tasks.filter((t) => isDueOn(t, today)),
    [tasks, today]
  );

  const doneCount = useMemo(
    () => dueToday.filter((t) => runsKey.has(`${t.id}|${today}`)).length,
    [dueToday, runsKey, today]
  );

  const openCount = Math.max(0, dueToday.length - doneCount);
  const progressPct = dueToday.length
    ? Math.round((doneCount / dueToday.length) * 100)
    : 0;

  const sortedToday = useMemo(() => {
    const freqOrder: Record<Frequency, number> = {
      daily: 0,
      weekly: 1,
      monthly: 2,
    };

    return dueToday.slice().sort((a, b) => {
      const aDone = runsKey.has(`${a.id}|${today}`);
      const bDone = runsKey.has(`${b.id}|${today}`);
      if (aDone !== bDone) return aDone ? 1 : -1;

      const fa = freqOrder[a.frequency];
      const fb = freqOrder[b.frequency];
      if (fa !== fb) return fa - fb;

      return a.task.localeCompare(b.task);
    });
  }, [dueToday, runsKey, today]);

  /* ===== Complete helpers ===== */
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

    setRuns((prev) => prev.filter((r) => !(r.task_id === id && r.run_on === today)));
  }

  async function completeMany(ids: string[], initialsVal: string) {
    const orgId = await getActiveOrgIdClient();
    const locationId = await getActiveLocationIdClient();
    if (!orgId || !locationId) {
      alert("Select a location first.");
      return;
    }
    if (!ids.length) return;

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

  return (
    <div className={PAGE + " space-y-4 py-4"}>
      {/* Date */}
      <div className="text-center">
        <div className="text-[11px] uppercase tracking-[0.2em] text-slate-400">
          Today
        </div>
        <div className="text-lg font-semibold text-slate-800">
          {niceFull(today)}
        </div>
      </div>

      {/* Sticky control bar */}
      <div className={cls(CARD, "sticky top-[64px] z-30 p-3")}>
        <div className="flex flex-wrap items-center gap-2">
          <div className="min-w-[220px]">
            <div className="text-xs text-slate-600">Progress</div>
            <div className="mt-0.5 flex items-center gap-2">
              <div className="text-sm font-semibold text-slate-900">
                {doneCount}/{dueToday.length} done
              </div>
              <div className="text-xs text-slate-500">({progressPct}%)</div>
              <div className="ml-auto h-2 w-28 overflow-hidden rounded-full bg-slate-200">
                <div
                  className="h-full bg-emerald-600"
                  style={{ width: `${progressPct}%` }}
                />
              </div>
            </div>
          </div>

          <div className="ml-auto flex flex-wrap items-center gap-2">
            {canManage && (
              <button
                type="button"
                className="rounded-xl bg-indigo-600/90 px-3 py-1.5 text-sm font-medium text-white shadow-sm transition hover:bg-indigo-500"
                onClick={() => setManageOpen(true)}
              >
                Manage
              </button>
            )}

            <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white/80 px-2 py-1.5">
              <span className="text-xs text-slate-600">Initials</span>
              <select
                value={ini}
                onChange={(e) => setIni(e.target.value.toUpperCase())}
                className="h-8 rounded-lg border border-slate-200 bg-white px-2 uppercase text-sm"
              >
                {initialsList.map((v) => (
                  <option key={v} value={v}>
                    {v}
                  </option>
                ))}
              </select>
            </div>

            <button
              type="button"
              className="rounded-xl bg-emerald-600/90 px-3 py-1.5 text-sm font-medium text-white shadow-sm transition hover:bg-emerald-500 disabled:opacity-50"
              onClick={() => {
                const ids = dueToday
                  .filter((t) => !runsKey.has(`${t.id}|${today}`))
                  .map((t) => t.id);
                completeMany(ids, ini);
              }}
              disabled={!ini || openCount === 0}
              title="Complete everything currently open today"
            >
              Complete open ({openCount})
            </button>
          </div>
        </div>
      </div>

      {/* Today list */}
      <div className={cls(CARD, "p-4")}>
        {sortedToday.length === 0 ? (
          <div className="rounded-2xl border border-slate-200 bg-white/70 p-4 text-sm text-slate-600">
            Nothing due today.
          </div>
        ) : (
          <div className="space-y-2">
            <AnimatePresence initial={false}>
              {sortedToday.map((t) => {
                const key = `${t.id}|${today}`;
                const done = runsKey.has(key);
                const run = runsKey.get(key) || null;

                return (
                  <SwipeRow
                    key={t.id}
                    task={t}
                    done={done}
                    run={run}
                    today={today}
                    initials={ini}
                    onComplete={completeOne}
                    onUndo={uncompleteOne}
                    onOpenDetails={(id) => setDetailId(id)}
                  />
                );
              })}
            </AnimatePresence>
          </div>
        )}
      </div>

      <ManageCleaningTasksModal
        open={canManage && manageOpen}
        onClose={() => setManageOpen(false)}
        onSaved={async () => {
          await loadAll();
        }}
      />

      {/* Details modal */}
      <AnimatePresence>
        {detailId && (
          <CleaningTaskDetailsModal
            open={!!detailId}
            onClose={() => setDetailId(null)}
            task={detailTask}
            today={today}
            done={detailDone}
            run={detailRun}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

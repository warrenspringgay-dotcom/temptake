"use client";

import React, { useEffect, useMemo, useState } from "react";
import dayjs from "dayjs";
import { supabase } from "@/lib/supabaseBrowser";
import { getActiveOrgIdClient } from "@/lib/orgClient";

/* ========= Types ========= */
type Frequency = "daily" | "weekly" | "monthly";
type Category = "Opening" | "Middle" | "Clean-down" | "Closing" | "Other";

type Task = {
  id: string; // numeric string expected (BIGINT). We guard below.
  area: string | null;
  name: string;      // mirror of task
  task: string;
  frequency: Frequency;
  weekday: number | null;
  month_day: number | null;
  category: Category | null;
  active?: boolean | null;
};
type Run = { task_id: string; run_on: string; done_by: string | null };

type Draft = {
  frequency: Frequency;
  weekday: number | null;
  month_day: number | null;
  area: string;
  task: string;
  category: Category;
};

const CATEGORIES: Category[] = ["Opening", "Middle", "Clean-down", "Closing", "Other"];

/* ========= Date helpers ========= */
const iso = (d: Date) => d.toISOString().slice(0, 10);
function startOfWeek(d = new Date()) {
  const day = d.getDay(); // 0..6
  const diff = day === 0 ? -6 : 1 - day;
  const res = new Date(d);
  res.setHours(0, 0, 0, 0);
  res.setDate(d.getDate() + diff);
  return res;
}
function endOfWeek(d = new Date()) {
  const s = startOfWeek(d);
  const res = new Date(s);
  res.setDate(s.getDate() + 6);
  return res;
}
const nice = (yyyy_mm_dd: string) =>
  new Date(yyyy_mm_dd).toLocaleDateString(undefined, {
    weekday: "short",
    day: "2-digit",
    month: "short",
  });

const cls = (...p: Array<string | false | null | undefined>) =>
  p.filter(Boolean).join(" ");

/* ========= Component ========= */
export default function CleaningRotaClient() {
  const weekStart = useMemo(() => startOfWeek(new Date()), []);
  const weekEnd = useMemo(() => endOfWeek(new Date()), []);
  const daysThisWeek = useMemo(() => {
    const out: string[] = [];
    const d = new Date(weekStart);
    for (let i = 0; i < 7; i++) {
      out.push(iso(d));
      d.setDate(d.getDate() + 1);
    }
    return out;
  }, [weekStart]);

  const [loading, setLoading] = useState(true);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [runs, setRuns] = useState<Run[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [initialsList, setInitialsList] = useState<string[]>([]);

  // Add Task
  const [openForm, setOpenForm] = useState(false);
  const [draft, setDraft] = useState<Draft>({
    frequency: "daily",
    weekday: 1,
    month_day: 1,
    area: "",
    task: "",
    category: "Other",
  });

  // Today sheet
  const [showToday, setShowToday] = useState(false);
  const todayISO = useMemo(() => iso(new Date()), []);

  // Confirm one
  const [confirm, setConfirm] = useState<{ task: Task; run_on: string } | null>(null);
  const [ini, setIni] = useState("");

  // Map for quick lookup
  const runsKey = useMemo(() => {
    const map = new Map<string, Run>();
    for (const r of runs) map.set(`${r.task_id}|${r.run_on}`, r);
    return map;
  }, [runs]);

  async function load() {
    setLoading(true);
    setErr(null);
    try {
      const orgId = await getActiveOrgIdClient();
      if (!orgId) return;

      // team initials
      const { data: tm } = await supabase
        .from("team_members")
        .select("initials, active")
        .eq("org_id", orgId)
        .eq("active", true)
        .order("initials");
      setInitialsList(
        (tm ?? [])
          .map((t: any) => (t.initials || "").toUpperCase())
          .filter(Boolean)
      );

      // tasks
      const { data: tData } = await supabase
        .from("cleaning_tasks")
        .select("id, area, name, task, frequency, weekday, month_day, category, active")
        .eq("org_id", orgId)
        .eq("active", true)
        .order("area");

      setTasks(
        (tData ?? []).map((r: any) => ({
          id: String(r.id),
          area: r.area ?? null,
          name: r.name ?? r.task ?? "",
          task: r.task ?? r.name ?? "",
          frequency: (r.frequency ?? "daily") as Frequency,
          weekday: r.weekday ? Number(r.weekday) : null,
          month_day: r.month_day ? Number(r.month_day) : null,
          category: (r.category ?? "Other") as Category,
          active: r.active ?? true,
        }))
      );

      // runs of this week
      const { data: rData } = await supabase
        .from("cleaning_task_runs")
        .select("task_id, run_on, done_by")
        .eq("org_id", orgId)
        .gte("run_on", iso(weekStart))
        .lte("run_on", iso(weekEnd));

      setRuns(
        (rData ?? []).map((r: any) => ({
          task_id: String(r.task_id),
          run_on: r.run_on as string,
          done_by: r.done_by ?? null,
        }))
      );
    } catch (e: any) {
      setErr(e?.message || "Failed to load rota.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  function isDueOn(t: Task, ymd: string) {
    const date = new Date(ymd);
    const dow = ((date.getDay() + 6) % 7) + 1;
    const dom = date.getDate();
    if (t.frequency === "daily") return true;
    if (t.frequency === "weekly") return t.weekday === dow;
    if (t.frequency === "monthly") return t.month_day === dom;
    return false;
  }

  function dueFilter(list: Task[], ymd: string) {
    return list.filter((t) => isDueOn(t, ymd));
  }

  /* ------- weekly page: only weekly+monthly -------- */
  const showInGrid = (t: Task, ymd: string) =>
    t.frequency === "weekly" || t.frequency === "monthly"
      ? isDueOn(t, ymd)
      : false;

  /* ------- complete helpers -------- */
  function coerceNumericId(id: string): number | null {
    const n = Number(id);
    return Number.isFinite(n) ? n : null;
  }

  async function complete(task: Task, run_on: string, initials: string) {
    const org_id = await getActiveOrgIdClient();
    if (!org_id) return;

    const taskId = coerceNumericId(task.id);
    if (taskId == null) {
      alert("Task id is not numeric. Please ensure cleaning_tasks.id is BIGINT.");
      return;
    }

    const payload = { org_id, task_id: taskId, run_on, done_by: initials.toUpperCase() };
    const { error } = await supabase.from("cleaning_task_runs").insert(payload);
    if (error) return alert(error.message);

    setRuns((p) => [...p, { task_id: String(taskId), run_on, done_by: payload.done_by }]);
  }

  async function uncomplete(task: Task, run_on: string) {
    const org_id = await getActiveOrgIdClient();
    if (!org_id) return;
    const taskId = coerceNumericId(task.id);
    if (taskId == null) return;

    const { error } = await supabase
      .from("cleaning_task_runs")
      .delete()
      .eq("org_id", org_id)
      .eq("task_id", taskId)
      .eq("run_on", run_on);

    if (error) return alert(error.message);
    setRuns((p) => p.filter((r) => !(r.task_id === String(taskId) && r.run_on === run_on)));
  }

  /* ------- bulk complete by category (today sheet) -------- */
  async function completeCategory(cat: Category, initials: string) {
    const list = dueFilter(tasks, todayISO).filter((t) => (t.category || "Other") === cat);
    for (const t of list) {
      const key = `${t.id}|${todayISO}`;
      if (runsKey.has(key)) continue;
      // eslint-disable-next-line no-await-in-loop
      await complete(t, todayISO, initials);
    }
  }

  /* ------- add task -------- */
  async function addTask(e: React.FormEvent) {
    e.preventDefault();
    if (!draft.task.trim()) return;

    const org_id = await getActiveOrgIdClient();
    if (!org_id) return alert("No organisation found.");

    const payload = {
      org_id,
      area: draft.area || null,
      task: draft.task.trim(),
      name: draft.task.trim(), // keep DB happy if it has NOT NULL "name"
      frequency: draft.frequency,
      weekday: draft.frequency === "weekly" ? draft.weekday : null,
      month_day: draft.frequency === "monthly" ? draft.month_day : null,
      category: draft.category,
      active: true,
    };

    const { data, error } = await supabase
      .from("cleaning_tasks")
      .insert(payload)
      .select("id, area, name, task, frequency, weekday, month_day, category, active")
      .maybeSingle();

    if (error) return alert(error.message);

    if (data) {
      setTasks((p) => [
        ...p,
        {
          id: String(data.id),
          area: data.area ?? null,
          name: data.name ?? data.task ?? "",
          task: data.task ?? data.name ?? "",
          frequency: data.frequency as Frequency,
          weekday: data.weekday ? Number(data.weekday) : null,
          month_day: data.month_day ? Number(data.month_day) : null,
          category: (data.category ?? "Other") as Category,
          active: data.active ?? true,
        },
      ]);
    }

    setOpenForm(false);
    setDraft({ frequency: "daily", weekday: 1, month_day: 1, area: "", task: "", category: "Other" });
  }

  /* ------- render -------- */
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <h1 className="text-xl font-semibold">Cleaning Rota (This Week)</h1>
        <div className="ml-auto flex gap-2">
          <button
            className="rounded-xl border px-3 py-1.5 text-sm hover:bg-gray-50"
            onClick={() => setShowToday(true)}
          >
            Today&apos;s tasks
          </button>
          <button
            className="rounded-xl bg-black px-3 py-1.5 text-sm font-medium text-white hover:bg-gray-900"
            onClick={() => setOpenForm(true)}
          >
            + Add task
          </button>
        </div>
      </div>

      {err && (
        <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
          {err}
        </div>
      )}

      <div className="rounded-2xl border bg-white p-3">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-4">
          {daysThisWeek.map((d) => {
            const due = tasks.filter((t) => showInGrid(t, d));
            const pending = due.filter((t) => !runsKey.has(`${t.id}|${d}`)).length;

            return (
              <div key={d} className="rounded-xl border p-3">
                <div className="mb-2 flex items-center justify-between">
                  <div className="font-medium">{nice(d)}</div>
                  <span className="text-xs text-gray-500">{pending} due</span>
                </div>

                <ul className="space-y-2">
                  {due.length === 0 && (
                    <li className="text-sm text-gray-500">No tasks</li>
                  )}
                  {due.map((t) => {
                    const done = runsKey.has(`${t.id}|${d}`);
                    const run = runsKey.get(`${t.id}|${d}`) || null;
                    return (
                      <li
                        key={`${t.id}|${d}`}
                        className="flex items-start justify-between gap-2 rounded border px-2 py-1.5 text-sm"
                      >
                        <div className={done ? "text-gray-500 line-through" : ""}>
                          <div className="font-medium">{t.task}</div>
                          <div className="text-xs text-gray-500">
                            {t.area || "—"} • {(t.category as string) || "Other"}
                          </div>
                          {run?.done_by && (
                            <div className="mt-1 text-xs text-gray-400">By {run.done_by}</div>
                          )}
                        </div>

                        {done ? (
                          <button
                            onClick={() => uncomplete(t, d)}
                            className="shrink-0 rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-800"
                          >
                            Done
                          </button>
                        ) : (
                          <button
                            onClick={() => setConfirm({ task: t, run_on: d })}
                            className="shrink-0 rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-800"
                          >
                            Complete
                          </button>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </div>
            );
          })}
        </div>

        {loading && (
          <div className="mt-4 text-center text-sm text-gray-500">Loading…</div>
        )}
      </div>

      {/* Add task modal */}
      {openForm && (
        <div className="fixed inset-0 z-50 bg-black/30" onClick={() => setOpenForm(false)}>
          <form
            onSubmit={addTask}
            onClick={(e) => e.stopPropagation()}
            className="mx-auto mt-6 flex h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-t-2xl border bg-white shadow sm:mt-16 sm:h-auto sm:rounded-2xl"
          >
            <div className="sticky top-0 z-10 border-b bg-white px-4 py-3 text-base font-semibold">
              Add cleaning task
            </div>

            <div className="max-h-[70vh] grow overflow-y-auto px-4 py-3 space-y-3">
              <label className="block text-sm">
                <div className="mb-1 text-gray-600">Frequency</div>
                <select
                  className="w-full rounded-xl border px-2 py-1.5"
                  value={draft.frequency}
                  onChange={(e) =>
                    setDraft((d) => ({ ...d, frequency: e.target.value as Frequency }))
                  }
                >
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                </select>
              </label>

              {draft.frequency === "weekly" && (
                <label className="block text-sm">
                  <div className="mb-1 text-gray-600">Day of week</div>
                  <select
                    className="w-full rounded-xl border px-2 py-1.5"
                    value={draft.weekday ?? 1}
                    onChange={(e) => setDraft((d) => ({ ...d, weekday: Number(e.target.value) }))}
                  >
                    <option value={1}>Monday</option><option value={2}>Tuesday</option>
                    <option value={3}>Wednesday</option><option value={4}>Thursday</option>
                    <option value={5}>Friday</option><option value={6}>Saturday</option>
                    <option value={7}>Sunday</option>
                  </select>
                </label>
              )}

              {draft.frequency === "monthly" && (
                <label className="block text-sm">
                  <div className="mb-1 text-gray-600">Day of month</div>
                  <input
                    type="number" min={1} max={31}
                    className="w-full rounded-xl border px-2 py-1.5"
                    value={draft.month_day ?? 1}
                    onChange={(e) =>
                      setDraft((d) => ({ ...d, month_day: Number(e.target.value || "1") }))
                    }
                  />
                </label>
              )}

              <label className="block text-sm">
                <div className="mb-1 text-gray-600">Category</div>
                <select
                  className="w-full rounded-xl border px-2 py-1.5"
                  value={draft.category}
                  onChange={(e) => setDraft((d) => ({ ...d, category: e.target.value as Category }))}
                >
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </label>

              <label className="block text-sm">
                <div className="mb-1 text-gray-600">Area</div>
                <input
                  className="w-full rounded-xl border px-2 py-1.5"
                  value={draft.area}
                  onChange={(e) => setDraft((d) => ({ ...d, area: e.target.value }))}
                  placeholder="e.g., Kitchen"
                />
              </label>

              <label className="block text-sm">
                <div className="mb-1 text-gray-600">Task</div>
                <input
                  className="w-full rounded-xl border px-2 py-1.5"
                  value={draft.task}
                  onChange={(e) => setDraft((d) => ({ ...d, task: e.target.value }))}
                  placeholder="e.g., Sanitise preparation surfaces"
                  required
                />
              </label>
            </div>

            <div className="sticky bottom-0 z-10 flex items-center justify-end gap-2 border-t bg-white px-4 py-3">
              <button
                type="button"
                className="rounded-md px-3 py-1.5 text-sm hover:bg-gray-50"
                onClick={() => setOpenForm(false)}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="rounded-xl bg-black px-3 py-1.5 text-sm font-medium text-white hover:bg-gray-900"
              >
                Save task
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Confirm initials (single) – topmost z-index */}
      {confirm && (
        <div className="fixed inset-0 z-[60] bg-black/30" onClick={() => setConfirm(null)}>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!ini.trim()) return;
              complete(confirm.task, confirm.run_on, ini.trim());
              setConfirm(null);
            }}
            onClick={(e) => e.stopPropagation()}
            className="mx-auto mt-10 w-full max-w-sm overflow-hidden rounded-2xl border bg-white shadow"
          >
            <div className="sticky top-0 z-10 border-b bg-white px-4 py-3 text-base font-semibold">
              Confirm completion
            </div>
            <div className="px-4 py-3 space-y-3">
              <div className="rounded border bg-gray-50 p-2 text-sm">
                <div className="font-medium">{confirm.task.task}</div>
                {confirm.task.area && (
                  <div className="text-xs text-gray-600">{confirm.task.area}</div>
                )}
                <div className="mt-1 text-xs text-gray-500">
                  For <strong>{nice(confirm.run_on)}</strong>
                </div>
              </div>
              <label className="block text-sm">
                <div className="mb-1 text-gray-600">Initials</div>
                <select
                  className="w-full rounded-xl border px-2 py-1.5 uppercase"
                  value={ini}
                  onChange={(e) => setIni(e.target.value)}
                  required
                >
                  <option value="" disabled>Select initials</option>
                  {initialsList.map((i) => (
                    <option key={i} value={i}>{i}</option>
                  ))}
                </select>
              </label>
            </div>
            <div className="sticky bottom-0 flex justify-end gap-2 border-t bg-white px-4 py-3">
              <button type="button" className="rounded-md px-3 py-1.5 text-sm hover:bg-gray-50" onClick={() => setConfirm(null)}>Cancel</button>
              <button type="submit" className="rounded-xl bg-black px-3 py-1.5 text-sm font-medium text-white hover:bg-gray-900">Confirm done</button>
            </div>
          </form>
        </div>
      )}

      {/* Today’s grouped sheet (z-index below confirm) */}
      {showToday && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/30">
          <div className="mx-auto w-full max-w-lg overflow-hidden rounded-t-2xl border bg-white shadow sm:rounded-2xl">
            <div className="sticky top-0 z-10 flex items-center justify-between border-b bg-white px-4 py-3">
              <div className="text-base font-semibold">Today’s Cleaning Tasks</div>
              <button className="rounded px-2 py-1 text-sm hover:bg-gray-100" onClick={() => setShowToday(false)}>Close</button>
            </div>

            <div className="max-h-[70vh] overflow-y-auto px-4 py-3 space-y-4">
              {CATEGORIES.map((cat) => {
                const list = dueFilter(tasks, todayISO).filter((t) => (t.category || "Other") === cat);
                if (!list.length) return null;
                const doneCount = list.filter((t) => runsKey.has(`${t.id}|${todayISO}`)).length;
                const allDone = doneCount === list.length;

                return (
                  <div key={cat} className="rounded-xl border">
                    <div className="flex items-center justify-between border-b px-3 py-2">
                      <div className="font-medium">
                        {cat} <span className="text-xs text-gray-500">({doneCount}/{list.length})</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <select
                          className="h-8 rounded-lg border px-2 text-sm uppercase"
                          value={ini}
                          onChange={(e) => setIni(e.target.value)}
                        >
                          <option value="">Initials…</option>
                          {initialsList.map((i) => (
                            <option key={i} value={i}>{i}</option>
                          ))}
                        </select>
                        <button
                          disabled={!ini || allDone}
                          onClick={() => completeCategory(cat, ini)}
                          className={cls(
                            "rounded-lg px-3 py-1.5 text-sm font-medium",
                            !ini || allDone ? "bg-gray-300 text-white" : "bg-black text-white hover:bg-gray-900"
                          )}
                        >
                          Complete all
                        </button>
                      </div>
                    </div>

                    <ul className="p-2 space-y-1">
                      {list.map((t) => {
                        const key = `${t.id}|${todayISO}`;
                        const done = runsKey.has(key);
                        const run = runsKey.get(key) || null;
                        return (
                          <li key={key} className="flex items-start justify-between gap-2 rounded px-2 py-1.5 text-sm">
                            <div className={done ? "text-gray-500 line-through" : ""}>
                              <div className="font-medium">{t.task}</div>
                              {t.area && <div className="text-xs text-gray-500">{t.area}</div>}
                              {run?.done_by && (
                                <div className="mt-1 text-xs text-gray-400">By {run.done_by}</div>
                              )}
                            </div>
                            {done ? (
                              <button
                                onClick={() => uncomplete(t, todayISO)}
                                className="shrink-0 rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-800"
                              >
                                Done
                              </button>
                            ) : (
                              <button
                                onClick={() => setConfirm({ task: t, run_on: todayISO })}
                                className="shrink-0 rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-800"
                              >
                                Complete
                              </button>
                            )}
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                );
              })}
            </div>

            <div className="sticky bottom-0 z-10 flex items-center justify-end gap-2 border-t bg-white px-4 py-3">
              <button className="rounded-md px-3 py-1.5 text-sm hover:bg-gray-50" onClick={() => setShowToday(false)}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

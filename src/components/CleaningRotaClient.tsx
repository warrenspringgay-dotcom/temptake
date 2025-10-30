"use client";

import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseBrowser";
import { getActiveOrgIdClient } from "@/lib/orgClient";

/* ========= Types ========= */
type Frequency = "daily" | "weekly" | "monthly";

type Task = {
  id: string;
  area: string | null;
  task: string;
  frequency: Frequency;
  weekday: number | null;    // 1..7 (Mon..Sun)
  month_day: number | null;  // 1..31
};

type Run = {
  task_id: string;
  run_on: string;  // yyyy-mm-dd
  done_by: string | null;
};

type Draft = {
  frequency: Frequency;
  weekday: number | null;
  month_day: number | null;
  area: string;
  task: string;
};

/* ========= Date helpers ========= */
const iso = (d: Date) => d.toISOString().slice(0, 10);

function startOfWeek(d = new Date()) {
  const day = d.getDay(); // 0 Sun … 6 Sat
  const diff = day === 0 ? -6 : 1 - day; // Monday first
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

/* ========= UI helpers ========= */
const cls = (...p: Array<string | false | null | undefined>) =>
  p.filter(Boolean).join(" ");

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

  // “Today” modal
  const [showToday, setShowToday] = useState(false);

  // Add task modal
  const [openForm, setOpenForm] = useState(false);
  const [draft, setDraft] = useState<Draft>({
    frequency: "daily",
    weekday: 1,
    month_day: 1,
    area: "",
    task: "",
  });

  // Complete modal
  const [confirm, setConfirm] = useState<{ task: Task; run_on: string } | null>(null);
  const [initials, setInitials] = useState("");

  const runsKey = useMemo(() => {
    const map = new Map<string, Run>();
    for (const r of runs) map.set(`${r.task_id}|${r.run_on}`, r);
    return map;
  }, [runs]);

  async function loadData() {
    setLoading(true);
    setErr(null);
    try {
      const orgId = await getActiveOrgIdClient();
      if (!orgId) {
        setTasks([]);
        setRuns([]);
        setLoading(false);
        return;
      }

      // Tasks
      const { data: tData, error: tErr } = await supabase
        .from("cleaning_tasks")
        .select("id,area,task,frequency,weekday,month_day")
        .eq("org_id", orgId)
        .order("area", { ascending: true });

      if (tErr) throw tErr;

      const tRows: Task[] = (tData ?? []).map((r: any) => ({
        id: String(r.id),
        area: r.area ?? null,
        task: r.task,
        frequency: (r.frequency ?? "daily") as Frequency,
        weekday: r.weekday ? Number(r.weekday) : null,
        month_day: r.month_day ? Number(r.month_day) : null,
      }));
      setTasks(tRows);

      // Runs only for this week window
      const { data: rData, error: rErr } = await supabase
        .from("cleaning_task_runs")
        .select("task_id,run_on,done_by")
        .gte("run_on", iso(weekStart))
        .lte("run_on", iso(weekEnd))
        .eq("org_id", orgId);

      if (rErr) throw rErr;

      const rRows: Run[] =
        (rData ?? []).map((r: any) => ({
          task_id: String(r.task_id),
          run_on: r.run_on as string,
          done_by: r.done_by ?? null,
        })) || [];

      setRuns(rRows);

      // Auto-open Today if anything due & incomplete
      const today = iso(new Date());
      const dueToday = dueFilter(tRows, today);
      const incomplete = dueToday.some(
        (t) => !runsKey.has(`${t.id}|${today}`)
      );
      if (incomplete) setShowToday(true);
    } catch (e: any) {
      setErr(e?.message || "Failed to load rota.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ----- Recurrence logic ----- */
  function isDueOn(t: Task, ymd: string): boolean {
    const date = new Date(ymd);
    const dow = ((date.getDay() + 6) % 7) + 1; // Mon=1 .. Sun=7
    const dom = date.getDate();

    switch (t.frequency) {
      case "daily":
        return true;
      case "weekly":
        return t.weekday === dow;
      case "monthly":
        return t.month_day === dom;
      default:
        return true;
    }
  }

  function dueFilter(list: Task[], ymd: string) {
    return list.filter((t) => isDueOn(t, ymd));
  }

  /* ----- Complete / un-complete ----- */
  async function complete(task: Task, run_on: string, ini: string) {
    try {
      const org_id = await getActiveOrgIdClient();
      if (!org_id) return;

      const payload = {
        org_id,
        task_id: Number(task.id),
        run_on,
        done_by: ini.toUpperCase(),
      };

      const { error } = await supabase.from("cleaning_task_runs").insert(payload);
      if (error) throw error;

      setRuns((prev) => [...prev, { task_id: task.id, run_on, done_by: payload.done_by }]);
    } catch (e: any) {
      alert(e?.message || "Failed to save completion.");
    } finally {
      setConfirm(null);
    }
  }

  async function uncomplete(task: Task, run_on: string) {
    try {
      const org_id = await getActiveOrgIdClient();
      if (!org_id) return;

      const { error } = await supabase
        .from("cleaning_task_runs")
        .delete()
        .eq("org_id", org_id)
        .eq("task_id", Number(task.id))
        .eq("run_on", run_on);

      if (error) throw error;

      setRuns((prev) => prev.filter((r) => !(r.task_id === task.id && r.run_on === run_on)));
    } catch (e: any) {
      alert(e?.message || "Failed to undo completion.");
    }
  }

  /* ----- Add task ----- */
  async function addTask(e: React.FormEvent) {
    e.preventDefault();
    if (!draft.task.trim()) return;

    try {
      const org_id = await getActiveOrgIdClient();
      if (!org_id) {
        alert("No organisation found.");
        return;
      }

      const payload = {
        org_id,
        area: draft.area || null,
        task: draft.task.trim(),
        frequency: draft.frequency,
        weekday: draft.frequency === "weekly" ? draft.weekday : null,
        month_day: draft.frequency === "monthly" ? draft.month_day : null,
      };

      const { data, error } = await supabase
        .from("cleaning_tasks")
        .insert(payload)
        .select("id,area,task,frequency,weekday,month_day")
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setTasks((prev) => [
          ...prev,
          {
            id: String(data.id),
            area: data.area ?? null,
            task: data.task,
            frequency: data.frequency as Frequency,
            weekday: data.weekday ? Number(data.weekday) : null,
            month_day: data.month_day ? Number(data.month_day) : null,
          },
        ]);
      }

      setOpenForm(false);
      setDraft({ frequency: "daily", weekday: 1, month_day: 1, area: "", task: "" });
    } catch (e: any) {
      alert(e?.message || "Failed to add task.");
    }
  }

  /* ----- Render ----- */
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
            const due = dueFilter(tasks, d);
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
                          {t.area && (
                            <div className="text-xs text-gray-500">{t.area}</div>
                          )}
                          {run?.done_by && (
                            <div className="mt-1 text-xs text-gray-400">
                              Done by {run.done_by}
                            </div>
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
                    setDraft((d) => ({
                      ...d,
                      frequency: e.target.value as Frequency,
                    }))
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
                    onChange={(e) =>
                      setDraft((d) => ({ ...d, weekday: Number(e.target.value) }))
                    }
                  >
                    <option value={1}>Monday</option>
                    <option value={2}>Tuesday</option>
                    <option value={3}>Wednesday</option>
                    <option value={4}>Thursday</option>
                    <option value={5}>Friday</option>
                    <option value={6}>Saturday</option>
                    <option value={7}>Sunday</option>
                  </select>
                </label>
              )}

              {draft.frequency === "monthly" && (
                <label className="block text-sm">
                  <div className="mb-1 text-gray-600">Day of month</div>
                  <input
                    type="number"
                    min={1}
                    max={31}
                    className="w-full rounded-xl border px-2 py-1.5"
                    value={draft.month_day ?? 1}
                    onChange={(e) =>
                      setDraft((d) => ({ ...d, month_day: Number(e.target.value || "1") }))
                    }
                  />
                </label>
              )}

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

      {/* Confirm initials modal */}
      {confirm && (
        <div className="fixed inset-0 z-50 bg-black/30" onClick={() => setConfirm(null)}>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!initials.trim()) return;
              complete(confirm.task, confirm.run_on, initials.trim());
            }}
            onClick={(e) => e.stopPropagation()}
            className="mx-auto mt-6 flex h-[70vh] w-full max-w-sm flex-col overflow-hidden rounded-t-2xl border bg-white shadow sm:mt-24 sm:h-auto sm:rounded-2xl"
          >
            <div className="sticky top-0 z-10 border-b bg-white px-4 py-3 text-base font-semibold">
              Confirm completion
            </div>

            <div className="grow overflow-y-auto px-4 py-3 space-y-3">
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
                <input
                  className="w-full rounded-xl border px-2 py-1.5 uppercase"
                  value={initials}
                  onChange={(e) => setInitials(e.target.value.toUpperCase())}
                  maxLength={4}
                  autoFocus
                  required
                />
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
                Confirm done
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Today’s quick modal */}
      {showToday && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/30">
          <div className="mx-auto w-full max-w-lg overflow-hidden rounded-t-2xl border bg-white shadow sm:rounded-2xl">
            <div className="sticky top-0 z-10 flex items-center justify-between border-b bg-white px-4 py-3">
              <div className="text-base font-semibold">Today’s Cleaning Tasks</div>
              <button
                className="rounded-md px-2 py-1 text-sm hover:bg-gray-100"
                onClick={() => setShowToday(false)}
              >
                Close
              </button>
            </div>

            <div className="max-h-[70vh] overflow-y-auto px-4 py-3">
              {(() => {
                const today = iso(new Date());
                const list = dueFilter(tasks, today);
                if (list.length === 0)
                  return <p className="text-sm text-gray-600">No tasks today.</p>;
                return (
                  <ul className="space-y-2">
                    {list.map((t) => {
                      const key = `${t.id}|${today}`;
                      const done = runsKey.has(key);
                      const run = runsKey.get(key) || null;
                      return (
                        <li
                          key={key}
                          className="flex items-start justify-between gap-2 rounded border px-2 py-1.5 text-sm"
                        >
                          <div className={done ? "text-gray-500 line-through" : ""}>
                            <div className="font-medium">{t.task}</div>
                            {t.area && (
                              <div className="text-xs text-gray-500">{t.area}</div>
                            )}
                            {run?.done_by && (
                              <div className="mt-1 text-xs text-gray-400">
                                Done by {run.done_by}
                              </div>
                            )}
                          </div>
                          {done ? (
                            <button
                              onClick={() => uncomplete(t, today)}
                              className="shrink-0 rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-800"
                            >
                              Done
                            </button>
                          ) : (
                            <button
                              onClick={() => setConfirm({ task: t, run_on: today })}
                              className="shrink-0 rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-800"
                            >
                              Complete
                            </button>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                );
              })()}
            </div>

            <div className="sticky bottom-0 z-10 flex items-center justify-end gap-2 border-t bg-white px-4 py-3">
              <button
                className="rounded-md px-3 py-1.5 text-sm hover:bg-gray-50"
                onClick={() => setShowToday(false)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

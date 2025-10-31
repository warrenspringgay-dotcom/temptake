"use client";

import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseBrowser";
import { getActiveOrgIdClient } from "@/lib/orgClient";

/* ========= Types ========= */
type Frequency = "daily" | "weekly" | "monthly";

type Task = {
  id: string;                 // uuid
  area: string | null;
  task: string;
  frequency: Frequency;
  weekday: number | null;     // 1..7 Mon..Sun
  month_day: number | null;   // 1..31
};

type Run = {
  task_id: string;            // uuid
  run_on: string;             // yyyy-mm-dd
  done_by: string | null;
};

type Draft = {
  frequency: Frequency;
  weekday: number | null;
  month_day: number | null;
  area: string;
  task: string;
};
type EditDraft = Draft & { id: string };

/* ========= Dates ========= */
const iso = (d: Date) => d.toISOString().slice(0, 10);

function startOfWeek(d = new Date()) {
  const day = d.getDay(); // 0=Sun..6=Sat
  const diff = day === 0 ? -6 : 1 - day; // Monday start
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
const nice = (ymd: string) =>
  new Date(ymd).toLocaleDateString(undefined, { weekday: "short", day: "2-digit", month: "short" });

/* ========= Small helpers ========= */
const cls = (...p: Array<string | false | null | undefined>) => p.filter(Boolean).join(" ");

/* ========= Reusable Add/Edit modal (sticky header/footer, scroll middle) ========= */
function TaskModal({
  open,
  title,
  initial,
  onClose,
  onSave,
}: {
  open: boolean;
  title: string;
  initial: Draft | EditDraft;
  onClose: () => void;
  onSave: (d: Draft | EditDraft) => void | Promise<void>;
}) {
  const [draft, setDraft] = useState(initial);
  useEffect(() => setDraft(initial), [initial]);
  if (!open) return null;

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!draft.task.trim()) return alert("Task is required.");
    if (draft.frequency === "weekly" && (draft.weekday ?? 0) < 1) return alert("Pick a weekday.");
    if (draft.frequency === "monthly" && ((draft.month_day ?? 0) < 1 || (draft.month_day ?? 0) > 31))
      return alert("Day of month must be 1–31.");
    onSave(draft);
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/30" onClick={onClose}>
      <form
        onSubmit={submit}
        onClick={(e) => e.stopPropagation()}
        className="mx-auto mt-6 flex h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-t-2xl border bg-white shadow sm:mt-16 sm:h-auto sm:rounded-2xl"
      >
        <div className="sticky top-0 z-10 border-b bg-white px-4 py-3 text-base font-semibold">
          {title}
        </div>

        <div className="max-h-[70vh] grow overflow-y-auto px-4 py-3 space-y-3">
          <label className="block text-sm">
            <div className="mb-1 text-gray-600">Frequency</div>
            <select
              className="w-full rounded-xl border px-2 py-1.5"
              value={(draft as Draft).frequency}
              onChange={(e) =>
                setDraft((d: any) => ({ ...d, frequency: e.target.value as Frequency }))
              }
            >
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
            </select>
          </label>

          {(draft as Draft).frequency === "weekly" && (
            <label className="block text-sm">
              <div className="mb-1 text-gray-600">Day of week</div>
              <select
                className="w-full rounded-xl border px-2 py-1.5"
                value={(draft as Draft).weekday ?? 1}
                onChange={(e) =>
                  setDraft((d: any) => ({ ...d, weekday: Number(e.target.value) }))
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

          {(draft as Draft).frequency === "monthly" && (
            <label className="block text-sm">
              <div className="mb-1 text-gray-600">Day of month</div>
              <input
                type="number"
                min={1}
                max={31}
                className="w-full rounded-xl border px-2 py-1.5"
                value={(draft as Draft).month_day ?? 1}
                onChange={(e) =>
                  setDraft((d: any) => ({ ...d, month_day: Number(e.target.value || "1") }))
                }
              />
            </label>
          )}

          <label className="block text-sm">
            <div className="mb-1 text-gray-600">Area</div>
            <input
              className="w-full rounded-xl border px-2 py-1.5"
              value={(draft as Draft).area}
              onChange={(e) => setDraft((d: any) => ({ ...d, area: e.target.value }))}
              placeholder="e.g., Kitchen"
            />
          </label>

          <label className="block text-sm">
            <div className="mb-1 text-gray-600">Task</div>
            <input
              className="w-full rounded-xl border px-2 py-1.5"
              value={(draft as Draft).task}
              onChange={(e) => setDraft((d: any) => ({ ...d, task: e.target.value }))}
              placeholder="e.g., Sanitise preparation surfaces"
              required
            />
          </label>
        </div>

        <div className="sticky bottom-0 z-10 flex items-center justify-end gap-2 border-t bg-white px-4 py-3">
          <button type="button" className="rounded-md px-3 py-1.5 text-sm hover:bg-gray-50" onClick={onClose}>
            Cancel
          </button>
          <button className="rounded-xl bg-black px-3 py-1.5 text-sm font-medium text-white hover:bg-gray-900">
            Save
          </button>
        </div>
      </form>
    </div>
  );
}

/* ========= Main component ========= */
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

  const [showToday, setShowToday] = useState(false);

  const [openAdd, setOpenAdd] = useState(false);
  const [addDraft, setAddDraft] = useState<Draft>({
    frequency: "daily",
    weekday: 1,
    month_day: 1,
    area: "",
    task: "",
  });

  const [openEdit, setOpenEdit] = useState(false);
  const [editDraft, setEditDraft] = useState<EditDraft | null>(null);

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

      // open Today if anything due & incomplete
      const today = iso(new Date());
      const dueToday = tRows.filter((t) => isDueOn(t, today));
      if (dueToday.some((t) => !runsKey.has(`${t.id}|${today}`))) setShowToday(true);
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

  /* ----- recurrence ----- */
  function isDueOn(t: Task, ymd: string): boolean {
    const d = new Date(ymd);
    const dow = ((d.getDay() + 6) % 7) + 1; // Mon=1..Sun=7
    const dom = d.getDate();
    if (t.frequency === "daily") return true;
    if (t.frequency === "weekly") return t.weekday === dow;
    if (t.frequency === "monthly") return t.month_day === dom;
    return true;
  }
  const dueFilter = (list: Task[], ymd: string) => list.filter((t) => isDueOn(t, ymd));

  /* ----- complete / undo ----- */
  async function complete(task: Task, run_on: string, ini: string) {
    try {
      const org_id = await getActiveOrgIdClient();
      if (!org_id) return;
      const payload = { org_id, task_id: task.id, run_on, done_by: ini.toUpperCase() };
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
        .eq("task_id", task.id)
        .eq("run_on", run_on);
      if (error) throw error;
      setRuns((prev) => prev.filter((r) => !(r.task_id === task.id && r.run_on === run_on)));
    } catch (e: any) {
      alert(e?.message || "Failed to undo completion.");
    }
  }

  /* ----- add / edit ----- */
  async function saveAdd(d: Draft) {
    try {
      const org_id = await getActiveOrgIdClient();
      if (!org_id) return alert("No organisation found.");
      const payload = {
        org_id,
        area: d.area || null,
        task: d.task.trim(),
        frequency: d.frequency,
        weekday: d.frequency === "weekly" ? d.weekday : null,
        month_day: d.frequency === "monthly" ? d.month_day : null,
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
      setOpenAdd(false);
      setAddDraft({ frequency: "daily", weekday: 1, month_day: 1, area: "", task: "" });
    } catch (e: any) {
      alert(e?.message || "Failed to add task.");
    }
  }

  function openEditFor(t: Task) {
    setEditDraft({
      id: t.id,
      frequency: t.frequency,
      weekday: t.weekday ?? 1,
      month_day: t.month_day ?? 1,
      area: t.area ?? "",
      task: t.task,
    });
    setOpenEdit(true);
  }
  async function saveEdit(d: EditDraft) {
    try {
      const payload = {
        area: d.area || null,
        task: d.task.trim(),
        frequency: d.frequency,
        weekday: d.frequency === "weekly" ? d.weekday : null,
        month_day: d.frequency === "monthly" ? d.month_day : null,
      };
      const { error } = await supabase.from("cleaning_tasks").update(payload).eq("id", d.id);
      if (error) throw error;
      setTasks((prev) =>
        prev.map((t) =>
          t.id === d.id
            ? {
                ...t,
                area: payload.area,
                task: payload.task,
                frequency: payload.frequency as Frequency,
                weekday: payload.weekday,
                month_day: payload.month_day,
              }
            : t
        )
      );
      setOpenEdit(false);
      setEditDraft(null);
    } catch (e: any) {
      alert(e?.message || "Failed to update task.");
    }
  }

  /* ----- mark ALL daily for today ----- */
  async function completeAllDaily(today: string, ini: string) {
    const toDo = tasks.filter((t) => t.frequency === "daily" && !runsKey.has(`${t.id}|${today}`));
    if (toDo.length === 0) return;
    const org_id = await getActiveOrgIdClient();
    if (!org_id) return;
    const rows = toDo.map((t) => ({
      org_id,
      task_id: t.id,
      run_on: today,
      done_by: ini.toUpperCase(),
    }));
    const { error } = await supabase.from("cleaning_task_runs").insert(rows);
    if (error) return alert(error.message);
    setRuns((prev) => [
      ...prev,
      ...rows.map((r) => ({ task_id: r.task_id, run_on: r.run_on, done_by: r.done_by })),
    ]);
  }

  /* ----- render ----- */
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <h1 className="text-xl font-semibold">Cleaning Rota (This Week)</h1>
        <div className="ml-auto flex gap-2">
          <button className="rounded-xl border px-3 py-1.5 text-sm hover:bg-gray-50" onClick={() => setShowToday(true)}>
            Today&apos;s tasks
          </button>
          <button
            className="rounded-xl bg-black px-3 py-1.5 text-sm font-medium text-white hover:bg-gray-900"
            onClick={() => setOpenAdd(true)}
          >
            + Add task
          </button>
        </div>
      </div>

      {err && <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">{err}</div>}

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
                  {due.length === 0 && <li className="text-sm text-gray-500">No tasks</li>}
                  {due.map((t) => {
                    const key = `${t.id}|${d}`;
                    const done = runsKey.has(key);
                    const run = runsKey.get(key) || null;
                    return (
                      <li key={key} className="flex items-start justify-between gap-2 rounded border px-2 py-1.5 text-sm">
                        <div className={done ? "text-gray-500 line-through" : ""}>
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              title="Edit task"
                              className="rounded border px-1.5 py-0.5 text-[11px] hover:bg-gray-50"
                              onClick={() => openEditFor(t)}
                            >
                              ✎ Edit
                            </button>
                            <span className="font-medium">{t.task}</span>
                          </div>
                          {t.area && <div className="text-xs text-gray-500">{t.area}</div>}
                          {run?.done_by && <div className="mt-1 text-xs text-gray-400">Done by {run.done_by}</div>}
                        </div>

                        {done ? (
                          <button onClick={() => uncomplete(t, d)} className="shrink-0 rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-800">
                            Done
                          </button>
                        ) : (
                          <button onClick={() => setConfirm({ task: t, run_on: d })} className="shrink-0 rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-800">
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
        {loading && <div className="mt-4 text-center text-sm text-gray-500">Loading…</div>}
      </div>

      {/* Add */}
      <TaskModal open={openAdd} title="Add cleaning task" initial={addDraft} onClose={() => setOpenAdd(false)} onSave={(d) => saveAdd(d as Draft)} />

      {/* Edit */}
      {editDraft && (
        <TaskModal
          open={openEdit}
          title="Edit cleaning task"
          initial={editDraft}
          onClose={() => {
            setOpenEdit(false);
            setEditDraft(null);
          }}
          onSave={(d) => saveEdit(d as EditDraft)}
        />
      )}

      {/* Confirm initials */}
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
            <div className="sticky top-0 z-10 border-b bg-white px-4 py-3 text-base font-semibold">Confirm completion</div>
            <div className="grow overflow-y-auto px-4 py-3 space-y-3">
              <div className="rounded border bg-gray-50 p-2 text-sm">
                <div className="font-medium">{confirm.task.task}</div>
                {confirm.task.area && <div className="text-xs text-gray-600">{confirm.task.area}</div>}
                <div className="mt-1 text-xs text-gray-500">For <strong>{nice(confirm.run_on)}</strong></div>
              </div>
              <label className="block text-sm">
                <div className="mb-1 text-gray-600">Initials</div>
                <input className="w-full rounded-xl border px-2 py-1.5 uppercase" value={initials} onChange={(e) => setInitials(e.target.value.toUpperCase())} maxLength={4} autoFocus required />
              </label>
            </div>
            <div className="sticky bottom-0 z-10 flex items-center justify-end gap-2 border-t bg-white px-4 py-3">
              <button type="button" className="rounded-md px-3 py-1.5 text-sm hover:bg-gray-50" onClick={() => setConfirm(null)}>Cancel</button>
              <button className="rounded-xl bg-black px-3 py-1.5 text-sm font-medium text-white hover:bg-gray-900">Confirm done</button>
            </div>
          </form>
        </div>
      )}

      {/* Today: show weekly/monthly individually, daily grouped */}
      {showToday && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/30">
          <div className="mx-auto w-full max-w-lg overflow-hidden rounded-t-2xl border bg-white shadow sm:rounded-2xl">
            <div className="sticky top-0 z-10 flex items-center justify-between border-b bg-white px-4 py-3">
              <div className="text-base font-semibold">Today’s Cleaning Tasks</div>
              <button className="rounded-md px-2 py-1 text-sm hover:bg-gray-100" onClick={() => setShowToday(false)}>Close</button>
            </div>

            <div className="max-h-[70vh] overflow-y-auto px-4 py-3 space-y-5">
              {(() => {
                const today = iso(new Date());
                const all = dueFilter(tasks, today);
                const daily = all.filter((t) => t.frequency === "daily");
                const others = all.filter((t) => t.frequency !== "daily");

                /* DAILY GROUP */
                const dailyIncomplete = daily.filter((t) => !runsKey.has(`${t.id}|${today}`));

                return (
                  <>
                    <section>
                      <div className="mb-2 flex items-center justify-between">
                        <h3 className="text-sm font-semibold">Daily</h3>
                        <button
                          disabled={dailyIncomplete.length === 0}
                          onClick={async () => {
                            const ini = prompt("Initials to mark all daily tasks done:")?.trim() || "";
                            if (!ini) return;
                            await completeAllDaily(today, ini);
                          }}
                          className={cls(
                            "rounded-full px-2 py-1 text-xs",
                            dailyIncomplete.length
                              ? "bg-black text-white hover:bg-gray-900"
                              : "bg-gray-200 text-gray-500 cursor-not-allowed"
                          )}
                        >
                          Complete all
                        </button>
                      </div>
                      {daily.length === 0 ? (
                        <p className="text-sm text-gray-600">No daily tasks today.</p>
                      ) : (
                        <ul className="space-y-1">
                          {daily.map((t) => {
                            const key = `${t.id}|${today}`;
                            const done = runsKey.has(key);
                            return (
                              <li key={key} className="flex items-center justify-between rounded border px-2 py-1 text-sm">
                                <span className={done ? "text-gray-500 line-through" : ""}>{t.task}{t.area ? ` — ${t.area}` : ""}</span>
                                {done ? (
                                  <button className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-800" onClick={() => uncomplete(t, today)}>Done</button>
                                ) : (
                                  <button className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-800" onClick={() => setConfirm({ task: t, run_on: today })}>Complete</button>
                                )}
                              </li>
                            );
                          })}
                        </ul>
                      )}
                    </section>

                    <section>
                      <h3 className="mb-2 text-sm font-semibold">Weekly & Monthly</h3>
                      {others.length === 0 ? (
                        <p className="text-sm text-gray-600">No weekly/monthly tasks today.</p>
                      ) : (
                        <ul className="space-y-2">
                          {others.map((t) => {
                            const key = `${t.id}|${today}`;
                            const done = runsKey.has(key);
                            return (
                              <li key={key} className="flex items-start justify-between gap-2 rounded border px-2 py-1.5 text-sm">
                                <div className={done ? "text-gray-500 line-through" : ""}>
                                  <div className="font-medium">{t.task}</div>
                                  {t.area && <div className="text-xs text-gray-500">{t.area}</div>}
                                </div>
                                {done ? (
                                  <button className="shrink-0 rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-800" onClick={() => uncomplete(t, today)}>Done</button>
                                ) : (
                                  <button className="shrink-0 rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-800" onClick={() => setConfirm({ task: t, run_on: today })}>Complete</button>
                                )}
                              </li>
                            );
                          })}
                        </ul>
                      )}
                    </section>
                  </>
                );
              })()}
            </div>

            <div className="sticky bottom-0 z-10 flex items-center justify-end gap-2 border-t bg-white px-4 py-3">
              <button className="rounded-md px-3 py-1.5 text-sm hover:bg-gray-50" onClick={() => setShowToday(false)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

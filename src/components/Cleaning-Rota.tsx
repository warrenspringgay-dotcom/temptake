// src/components/CleaningRota.tsx
"use client";

import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseBrowser";
import { getActiveOrgIdClient } from "@/lib/orgClient";

type Task = {
  id: string;
  name: string;
  area?: string | null;
  freq: "daily" | "weekly" | "monthly";
};

type Log = {
  id: string;
  org_id: string;
  task_id: string;
  date: string; // YYYY-MM-DD
  done_by: string | null;
  done: boolean;
};

const WEEKDAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function cls(...p: Array<string | false | undefined>) {
  return p.filter(Boolean).join(" ");
}

function ymd(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export default function CleaningRota() {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth()); // 0..11
  const [mode, setMode] = useState<"digital" | "print">("digital");
  const [weekIndex, setWeekIndex] = useState<number>(1); // 1..6 (some months show 6 partial weeks)

  const [tasks, setTasks] = useState<Task[]>([]);
  const [logs, setLogs] = useState<Log[]>([]);
  const [loading, setLoading] = useState(false);

  const [newTask, setNewTask] = useState({
    name: "",
    area: "",
    freq: "daily" as Task["freq"],
  });

  const daysInMonth = useMemo(
    () => new Date(year, month + 1, 0).getDate(),
    [year, month]
  );
  const monthLabel = useMemo(
    () =>
      new Date(year, month).toLocaleString(undefined, {
        month: "long",
        year: "numeric",
      }),
    [year, month]
  );

  /** Build a matrix of weeks × 7 (Mon–Sun) with Date | null for outside days */
  const weeks: (Date | null)[][] = useMemo(() => {
    const first = new Date(year, month, 1);
    const last = new Date(year, month, daysInMonth);

    // shift to Monday=0..Sunday=6
    const firstDow = (first.getDay() + 6) % 7; // 0=Mon
    const grid: (Date | null)[][] = [];
    let cursor = new Date(first);
    cursor.setDate(first.getDate() - firstDow);

    // build 6 rows × 7 columns (covers all months)
    for (let r = 0; r < 6; r++) {
      const row: (Date | null)[] = [];
      for (let c = 0; c < 7; c++) {
        const inMonth =
          cursor >= new Date(year, month, 1) &&
          cursor <= new Date(year, month, daysInMonth);
        row.push(inMonth ? new Date(cursor) : null);
        cursor.setDate(cursor.getDate() + 1);
      }
      grid.push(row);
    }
    return grid;
  }, [year, month, daysInMonth]);

  const activeWeekDays = weeks[weekIndex - 1] ?? [];

  /* ------------------ Data I/O ------------------ */
  async function loadData() {
    setLoading(true);
    const orgId = await getActiveOrgIdClient();
    if (!orgId) {
      setTasks([]);
      setLogs([]);
      setLoading(false);
      return;
    }

    const { data: t, error: tErr } = await supabase
      .from("cleaning_tasks")
      .select("id,name,area,freq")
      .eq("org_id", orgId)
      .order("name", { ascending: true });

    if (!tErr) setTasks((t ?? []) as Task[]);

    // Pull logs for the whole month
    const start = `${year}-${String(month + 1).padStart(2, "0")}-01`;
    const end = `${year}-${String(month + 1).padStart(2, "0")}-${String(
      daysInMonth
    ).padStart(2, "0")}`;

    const { data: l, error: lErr } = await supabase
      .from("cleaning_logs")
      .select("id,org_id,task_id,date,done_by,done")
      .eq("org_id", orgId)
      .gte("date", start)
      .lte("date", end);

    if (!lErr) setLogs((l ?? []) as Log[]);
    setLoading(false);
  }

  useEffect(() => {
    loadData();
  }, [year, month]);

  async function addTask() {
    const orgId = await getActiveOrgIdClient();
    if (!orgId || !newTask.name.trim()) return;
    const { error } = await supabase.from("cleaning_tasks").insert({
      org_id: orgId,
      name: newTask.name.trim(),
      area: newTask.area || null,
      freq: newTask.freq,
    });
    if (error) {
      alert(error.message);
      return;
    }
    setNewTask({ name: "", area: "", freq: "daily" });
    await loadData();
  }

  const isDone = (taskId: string, d: Date | null) => {
    if (!d) return false;
    const key = ymd(d);
    return logs.some((l) => l.task_id === taskId && l.date === key);
  };

  async function toggleDone(task: Task, d: Date | null) {
    if (!d) return;
    const orgId = await getActiveOrgIdClient();
    const key = ymd(d);

    const existing = logs.find(
      (l) => l.task_id === task.id && l.date === key
    );

    if (existing) {
      // delete tick
      const { error } = await supabase
        .from("cleaning_logs")
        .delete()
        .eq("org_id", orgId)
        .eq("task_id", task.id)
        .eq("date", key);
      if (error) return alert(error.message);
    } else {
      // add tick
      const { error } = await supabase.from("cleaning_logs").insert({
        org_id: orgId,
        task_id: task.id,
        date: key,
        done: true,
        done_by: null, // or capture initials field if you add one
      });
      if (error) return alert(error.message);
    }
    await loadData();
  }

  /* ------------------ UI ------------------ */
  return (
    <div className="space-y-4 rounded-2xl border bg-white p-4 shadow-sm">
      {/* Header / Controls */}
      <div className="flex flex-wrap items-center gap-2">
        <h1 className="text-lg font-semibold">Cleaning Rota</h1>

        <div className="ml-auto flex flex-wrap items-center gap-2">
          <span className="text-sm text-gray-600">{monthLabel}</span>

          <select
            className="h-9 rounded-xl border px-3 text-sm"
            value={month}
            onChange={(e) => setMonth(Number(e.target.value))}
          >
            {Array.from({ length: 12 }).map((_, i) => (
              <option key={i} value={i}>
                {new Date(2000, i, 1).toLocaleString(undefined, {
                  month: "long",
                })}
              </option>
            ))}
          </select>

          <input
            type="number"
            className="h-9 w-24 rounded-xl border px-3 text-sm"
            value={year}
            onChange={(e) => setYear(Number(e.target.value))}
          />

          <select
            className="h-9 rounded-xl border px-3 text-sm"
            value={weekIndex}
            onChange={(e) => setWeekIndex(Number(e.target.value))}
            title="Pick week of month (Mon–Sun rows)"
          >
            {weeks.map((_, i) => (
              <option key={i} value={i + 1}>
                Week {i + 1}
              </option>
            ))}
          </select>

          <button
            onClick={() =>
              setMode((m) => (m === "digital" ? "print" : "digital"))
            }
            className="rounded-xl border px-3 py-1.5 text-sm hover:bg-gray-50"
          >
            {mode === "digital" ? "Printable view" : "Digital view"}
          </button>

          <button
            onClick={() => window.print()}
            className="rounded-xl border px-3 py-1.5 text-sm hover:bg-gray-50"
          >
            Print
          </button>
        </div>
      </div>

      {/* Quick add */}
      {mode === "digital" && (
        <div className="grid gap-3 sm:grid-cols-5">
          <input
            className="rounded-lg border px-3 py-2 sm:col-span-2"
            placeholder="Task name"
            value={newTask.name}
            onChange={(e) =>
              setNewTask((t) => ({ ...t, name: e.target.value }))
            }
          />
          <input
            className="rounded-lg border px-3 py-2"
            placeholder="Area (optional)"
            value={newTask.area}
            onChange={(e) =>
              setNewTask((t) => ({ ...t, area: e.target.value }))
            }
          />
          <select
            className="rounded-lg border px-3 py-2"
            value={newTask.freq}
            onChange={(e) =>
              setNewTask((t) => ({
                ...t,
                freq: e.target.value as Task["freq"],
              }))
            }
          >
            <option value="daily">Daily</option>
            <option value="weekly">Weekly</option>
            <option value="monthly">Monthly</option>
          </select>
          <button
            onClick={addTask}
            className="rounded-lg bg-black px-3 py-2 text-white hover:bg-gray-900"
          >
            Add
          </button>
        </div>
      )}

      {/* Week table: columns = Mon..Sun */}
      <div className="overflow-x-auto print:overflow-visible">
        <table className="min-w-full border text-sm">
          <thead>
            <tr className="bg-gray-50 text-left text-gray-600">
              <th className="border-b px-2 py-2 w-56">Task</th>
              <th className="border-b px-2 py-2 w-40">Area</th>
              {WEEKDAY_LABELS.map((lbl) => (
                <th key={lbl} className="border-b px-2 py-2 text-center">
                  {lbl}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {tasks.length === 0 ? (
              <tr>
                <td colSpan={2 + 7} className="py-6 text-center text-gray-500">
                  No tasks added yet.
                </td>
              </tr>
            ) : (
              tasks.map((t) => (
                <tr key={t.id} className="align-top">
                  <td className="border-t px-2 py-2 font-medium">{t.name}</td>
                  <td className="border-t px-2 py-2">{t.area || "—"}</td>

                  {activeWeekDays.map((d, idx) => (
                    <td key={idx} className="border-t px-2 py-2 text-center">
                      {d ? (
                        mode === "digital" ? (
                          <button
                            onClick={() => toggleDone(t, d)}
                            className={cls(
                              "h-7 w-7 rounded-md border text-xs",
                              isDone(t.id, d)
                                ? "bg-emerald-500 text-white"
                                : "hover:bg-gray-100"
                            )}
                            title={ymd(d)}
                          >
                            {isDone(t.id, d) ? "✓" : ""}
                          </button>
                        ) : (
                          <div className="h-7 w-10 border rounded text-xs flex items-center justify-center print:h-6">
                            &nbsp;
                          </div>
                        )
                      ) : (
                        <div className="h-7 w-10 opacity-40" />
                      )}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Print styles */}
      <style jsx global>{`
        @media print {
          body {
            background: #fff;
          }
          .print\\:overflow-visible {
            overflow: visible !important;
          }
          @page {
            size: A4 landscape;
            margin: 10mm;
          }
          button {
            display: none !important;
          }
        }
      `}</style>
    </div>
  );
}

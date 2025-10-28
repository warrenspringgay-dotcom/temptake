"use client";

import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseBrowser";
import { getActiveOrgIdClient } from "@/lib/orgClient";
import ActionMenu from "@/components/ActionMenu";

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
  done: boolean | null;
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
function weekdayMon1Sun7(d: Date) {
  // JS: 0=Sun..6=Sat -> 1=Mon..7=Sun
  const js = d.getDay(); // 0..6
  return js === 0 ? 7 : js; // Sun -> 7
}

export default function CleaningRota() {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth()); // 0..11
  const [mode, setMode] = useState<"digital" | "print">("digital");

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

  /** Build Mon..Sun grid */
  const weeks: (Date | null)[][] = useMemo(() => {
    const first = new Date(year, month, 1);
    const days = new Date(year, month + 1, 0).getDate();
    const grid: (Date | null)[][] = [];
    const firstDow = (first.getDay() + 6) % 7; // shift so Monday=0
    let cursor = new Date(first);
    cursor.setDate(1 - firstDow);
    for (let r = 0; r < 6; r++) {
      const row: (Date | null)[] = [];
      for (let c = 0; c < 7; c++) {
        const inMonth = cursor.getMonth() === month;
        row.push(inMonth ? new Date(cursor) : null);
        cursor.setDate(cursor.getDate() + 1);
      }
      grid.push(row);
    }
    return grid;
  }, [year, month]);

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

    // Tasks
    const { data: t, error: tErr } = await supabase
      .from("cleaning_tasks")
      .select("id,name,area,freq")
      .eq("org_id", orgId)
      .order("name", { ascending: true });

    if (!tErr) setTasks((t ?? []) as Task[]);

    // Logs for the entire month
    const start = `${year}-${String(month + 1).padStart(2, "0")}-01`;
    const end = `${year}-${String(month + 1).padStart(2, "0")}-${String(
      new Date(year, month + 1, 0).getDate()
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

  function initialsFor(taskId: string, d: Date | null) {
    if (!d) return "";
    const key = ymd(d);
    const hit = logs.find((l) => l.task_id === taskId && l.date === key);
    return hit?.done_by ?? "";
  }

  async function saveInitials(task: Task, d: Date, value: string) {
    const orgId = await getActiveOrgIdClient();
    if (!orgId) return;
    const dateStr = ymd(d);
    const inits = value.trim().toUpperCase();

    // If empty => delete
    if (!inits) {
      const { error } = await supabase
        .from("cleaning_logs")
        .delete()
        .eq("org_id", orgId)
        .eq("task_id", task.id)
        .eq("date", dateStr);
      if (error) alert(error.message);
      await loadData();
      return;
    }

    const payload = {
      org_id: orgId as string,
      task_id: task.id,
      date: dateStr,
      year: d.getFullYear(),
      month: d.getMonth() + 1,
      weekday: weekdayMon1Sun7(d),
      done_by: inits,
      done: true,
    };

    const { error } = await supabase
      .from("cleaning_logs")
      // @ts-ignore: PostgREST option is supported by supabase-js
      .upsert(payload, { onConflict: "org_id,task_id,date" });

    if (error) {
      if (String(error.message || "").toLowerCase().includes("on conflict")) {
        await supabase.from("cleaning_logs").delete().match({
          org_id: orgId,
          task_id: task.id,
          date: dateStr,
        });
        const { error: e2 } = await supabase.from("cleaning_logs").insert(payload);
        if (e2) alert(e2.message);
      } else {
        alert(error.message);
      }
    }
    await loadData();
  }

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
                {new Date(2000, i, 1).toLocaleString(undefined, { month: "long" })}
              </option>
            ))}
          </select>

          <input
            type="number"
            className="h-9 w-24 rounded-xl border px-3 text-sm"
            value={year}
            onChange={(e) => setYear(Number(e.target.value))}
          />

          <button
            onClick={() => setMode((m) => (m === "digital" ? "print" : "digital"))}
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
        <div className="grid gap-3 sm:grid-cols-[1fr_1fr_auto_auto]">
          <input
            className="rounded-lg border px-3 py-2"
            placeholder="Task name"
            value={newTask.name}
            onChange={(e) => setNewTask((t) => ({ ...t, name: e.target.value }))}
          />
          <input
            className="rounded-lg border px-3 py-2"
            placeholder="Area (optional)"
            value={newTask.area}
            onChange={(e) => setNewTask((t) => ({ ...t, area: e.target.value }))}
          />
          <select
            className="rounded-lg border px-3 py-2"
            value={newTask.freq}
            onChange={(e) => setNewTask((t) => ({ ...t, freq: e.target.value as Task["freq"] }))}
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

      {/* Grid */}
      <div className="overflow-x-auto print:overflow-visible">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="bg-gray-50 text-left text-gray-600">
              <th className="border-b px-2 py-2 w-56">Task</th>
              <th className="border-b px-2 py-2 w-40">Area</th>
              {WEEKDAY_LABELS.map((lbl) => (
                <th key={lbl} className="border-b px-2 py-2 text-center">
                  {lbl}
                </th>
              ))}
              <th className="border-b px-2 py-2 text-right w-36">Actions</th>
            </tr>
          </thead>
          <tbody>
            {tasks.length === 0 ? (
              <tr>
                <td colSpan={2 + 7 + 1} className="py-6 text-center text-gray-500 border-t">
                  No tasks added yet.
                </td>
              </tr>
            ) : (
              tasks.map((t) => (
                <tr key={t.id} className="border-t align-top">
                  <td className="px-2 py-2 font-medium">{t.name}</td>
                  <td className="px-2 py-2">{t.area || "—"}</td>

                  {WEEKDAY_LABELS.map((_, col) => {
                    return (
                      <td key={col} className="px-2 py-2">
                        <div className="flex flex-col gap-2">
                          {weeks.map((row, rIdx) => {
                            const d = row[col];
                            if (!d) return <div key={rIdx} className="h-7" />;
                            const val = initialsFor(t.id, d);
                            return mode === "digital" ? (
                              <input
                                key={rIdx + "-" + ymd(d)}
                                defaultValue={val}
                                maxLength={3}
                                className="h-7 w-12 rounded border px-1 text-xs text-center uppercase"
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") (e.target as HTMLInputElement).blur();
                                }}
                                onBlur={(e) => {
                                  const v = e.currentTarget.value;
                                  void saveInitials(t, d, v);
                                }}
                                title={ymd(d)}
                              />
                            ) : (
                              <div
                                key={rIdx + "-" + ymd(d)}
                                className="h-7 w-12 rounded border text-xs flex items-center justify-center print:h-6"
                              >
                                {val}
                              </div>
                            );
                          })}
                        </div>
                      </td>
                    );
                  })}

                  <td className="px-2 py-2 text-right">
                    <ActionMenu
                      items={[
                        {
                          label: "Edit name",
                          onClick: async () => {
                            const name = prompt("Rename task", t.name);
                            if (!name || name.trim() === t.name) return;
                            const org_id = await getActiveOrgIdClient();
                            await supabase
                              .from("cleaning_tasks")
                              .update({ name: name.trim() })
                              .eq("org_id", org_id)
                              .eq("id", t.id);
                            await loadData();
                          },
                        },
                        {
                          label: "Delete",
                          onClick: async () => {
                            if (!confirm("Delete this task?")) return;
                            const org_id = await getActiveOrgIdClient();
                            await supabase.from("cleaning_logs").delete().eq("org_id", org_id).eq("task_id", t.id);
                            await supabase.from("cleaning_tasks").delete().eq("org_id", org_id).eq("id", t.id);
                            await loadData();
                          },
                          variant: "danger",
                        },
                      ]}
                    />
                  </td>
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
          input {
            border: 1px solid #ccc !important;
          }
        }
      `}</style>
    </div>
  );
}

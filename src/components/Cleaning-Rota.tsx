"use client";

import React, { useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseBrowser";
import { getActiveOrgIdClient } from "@/lib/orgClient";
type Task = { id: string; name: string; area?: string | null; freq: "daily" | "weekly" | "monthly"; };
type Cell = { day: number; doneBy?: string; done?: boolean };

function cls(...p: Array<string | false | undefined>) { return p.filter(Boolean).join(" "); }

export default function CleaningRota() {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth()); // 0-11
  const [title, setTitle] = useState("Cleaning Rota");
  const [tasks, setTasks] = useState<Task[]>([
    { id: crypto.randomUUID(), name: "Prep surfaces", area: "Kitchen", freq: "daily" },
    { id: crypto.randomUUID(), name: "Fridge clean", area: "Kitchen", freq: "weekly" },
    { id: crypto.randomUUID(), name: "Floor mopping", area: "Back", freq: "daily" },
  ]);
  const [newTask, setNewTask] = useState({ name: "", area: "", freq: "daily" as Task["freq"] });

  const daysInMonth = useMemo(() => new Date(year, month + 1, 0).getDate(), [year, month]);
  const monthLabel = useMemo(
    () => new Date(year, month).toLocaleString(undefined, { month: "long", year: "numeric" }),
    [year, month]
  );

  function addTask() {
    if (!newTask.name.trim()) return;
    setTasks((t) => [...t, { id: crypto.randomUUID(), name: newTask.name.trim(), area: newTask.area || null, freq: newTask.freq }]);
    setNewTask({ name: "", area: "", freq: "daily" });
  }
  function removeTask(id: string) {
    setTasks((t) => t.filter((x) => x.id !== id));
  }

  return (
    <div className="space-y-4 rounded-2xl border bg-white p-4 shadow-sm">
      <div className="flex items-center gap-2">
        <h1 className="text-lg font-semibold">{title}</h1>
        <div className="ml-auto flex items-center gap-2">
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
            onClick={() => window.print()}
            className="rounded-xl border px-3 py-1.5 text-sm hover:bg-gray-50"
          >
            Print
          </button>
        </div>
      </div>

      {/* Quick add task */}
      <div className="grid gap-3 sm:grid-cols-5">
        <input
          className="rounded-lg border px-3 py-2 sm:col-span-2"
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
        <button onClick={addTask} className="rounded-lg bg-black px-3 py-2 text-white hover:bg-gray-900">
          Add
        </button>
      </div>

      {/* Rota table */}
      <div className="overflow-x-auto print:overflow-visible">
        <table className="min-w-full text-sm border">
          <thead>
            <tr className="text-left text-gray-600">
              <th className="border-b px-2 py-2 w-56">Task</th>
              <th className="border-b px-2 py-2 w-32">Area</th>
              {Array.from({ length: daysInMonth }).map((_, d) => (
                <th key={d} className="border-b px-1 py-1 text-center">{d + 1}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {tasks.length === 0 ? (
              <tr>
                <td colSpan={2 + daysInMonth} className="py-6 text-center text-gray-500">
                  Add tasks to build your rota.
                </td>
              </tr>
            ) : (
              tasks.map((t) => (
                <tr key={t.id} className="align-top">
                  <td className="border-t px-2 py-2">
                    <div className="font-medium">{t.name}</div>
                    <div className="mt-1 flex gap-2 print:hidden">
                      <span className="rounded border px-1 text-[11px]">{t.freq}</span>
                      <button
                        onClick={() => removeTask(t.id)}
                        className="rounded border px-1 text-[11px] hover:bg-gray-50"
                      >
                        Remove
                      </button>
                    </div>
                  </td>
                  <td className="border-t px-2 py-2">{t.area || "—"}</td>
                  {Array.from({ length: daysInMonth }).map((_, d) => (
                    <td key={d} className="border-t px-1 py-1">
                      {/* Initials box */}
                      <div className="h-7 w-12 border rounded text-xs flex items-center justify-center print:h-6 print:w-10">
                        {/* keep empty for handwriting; editable if you want: */}
                        &nbsp;
                      </div>
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <style jsx global>{`
        @media print {
          body { background: #fff; }
          .print\\:overflow-visible { overflow: visible !important; }
          @page { size: A4 landscape; margin: 10mm; }
        }
      `}</style>
    </div>
  );
}

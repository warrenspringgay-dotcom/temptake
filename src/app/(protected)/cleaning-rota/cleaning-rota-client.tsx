// src/app/cleaning-rota/cleaning-rota-client.tsx
"use client";

import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseBrowser";
import { getActiveOrgIdClient } from "@/lib/orgClient";
import { getActiveLocationIdClient } from "@/lib/locationClient";

type Task = {
  id: string;
  name: string;
  area?: string | null;
  frequency?: string | null;
  weekday?: number | null;
  month_day?: number | null;
  active: boolean;
  position: number;
  notes?: string | null;
  // important: may be null for org-wide
  location_id?: string | null;
};

type Run = {
  id: string;
  task_id: string;
  done_date: string; // YYYY-MM-DD
  done_by_initials: string | null;
  // location scope
  location_id?: string | null;
};

function todayISO() {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function cls(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(" ");
}

export default function CleaningRotaClient() {
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const [orgId, setOrgId] = useState<string | null>(null);
  const [locationId, setLocationId] = useState<string | null>(null);

  const [tasks, setTasks] = useState<Task[]>([]);
  const [runs, setRuns] = useState<Run[]>([]);
  const [date, setDate] = useState<string>(todayISO());

  const [saving, setSaving] = useState(false);

  // quick add (you may already have UI for this)
  const [newName, setNewName] = useState("");
  const [newArea, setNewArea] = useState("");
  const [newFreq, setNewFreq] = useState("daily");

  const runsByTask = useMemo(() => {
    const map = new Map<string, Run>();
    for (const r of runs) {
      map.set(r.task_id, r);
    }
    return map;
  }, [runs]);

  async function loadAll() {
    setLoading(true);
    setErr(null);

    try {
      const oid = await getActiveOrgIdClient();
      if (!oid) {
        setOrgId(null);
        setLocationId(null);
        setTasks([]);
        setRuns([]);
        setErr("No organisation found for this user.");
        return;
      }
      setOrgId(oid);

      const locId = await getActiveLocationIdClient();
      if (!locId) {
        // Multi-site org must choose location; single-site should auto-set via helper.
        setLocationId(null);
        setTasks([]);
        setRuns([]);
        setErr("Please select a location first.");
        return;
      }
      setLocationId(locId);

      // 1) Tasks for this org:
      // - include org-wide tasks (location_id IS NULL)
      // - include site-specific tasks (location_id == active)
      //
      // NOTE: Supabase .or syntax: "col.is.null,col.eq.value"
      const { data: taskData, error: taskErr } = await supabase
        .from("cleaning_tasks")
        .select("id,name,area,frequency,weekday,month_day,active,position,notes,location_id")
        .eq("org_id", oid)
        .eq("active", true)
        .or(`location_id.is.null,location_id.eq.${locId}`)
        .order("position", { ascending: true });

      if (taskErr) throw taskErr;

      const taskRows: Task[] =
        (taskData ?? []).map((t: any) => ({
          id: String(t.id),
          name: String(t.name ?? ""),
          area: t.area ?? null,
          frequency: t.frequency ?? t.freq ?? null,
          weekday: t.weekday ?? null,
          month_day: t.month_day ?? null,
          active: !!t.active,
          position: Number(t.position ?? 0),
          notes: t.notes ?? null,
          location_id: t.location_id ?? null,
        })) ?? [];

      setTasks(taskRows);

      // 2) Runs for selected day AND selected location only
      const { data: runData, error: runErr } = await supabase
        .from("cleaning_task_runs")
        .select("id,task_id,done_date,done_by_initials,location_id")
        .eq("org_id", oid)
        .eq("done_date", date)
        .eq("location_id", locId);

      if (runErr) throw runErr;

      const runRows: Run[] =
        (runData ?? []).map((r: any) => ({
          id: String(r.id),
          task_id: String(r.task_id),
          done_date: String(r.done_date),
          done_by_initials: r.done_by_initials ?? null,
          location_id: r.location_id ?? null,
        })) ?? [];

      setRuns(runRows);
    } catch (e: any) {
      console.error(e);
      setErr(e?.message || "Failed to load cleaning rota.");
      setTasks([]);
      setRuns([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // reload runs when date changes (keeping tasks stable)
  useEffect(() => {
    (async () => {
      if (!orgId || !locationId) return;

      try {
        const { data: runData, error: runErr } = await supabase
          .from("cleaning_task_runs")
          .select("id,task_id,done_date,done_by_initials,location_id")
          .eq("org_id", orgId)
          .eq("done_date", date)
          .eq("location_id", locationId);

        if (runErr) throw runErr;

        const runRows: Run[] =
          (runData ?? []).map((r: any) => ({
            id: String(r.id),
            task_id: String(r.task_id),
            done_date: String(r.done_date),
            done_by_initials: r.done_by_initials ?? null,
            location_id: r.location_id ?? null,
          })) ?? [];

        setRuns(runRows);
      } catch (e: any) {
        console.error(e);
        setErr(e?.message || "Failed to load completion status.");
      }
    })();
  }, [date, orgId, locationId]);

  async function toggleDone(task: Task) {
    if (!orgId || !locationId) {
      alert("Please select a location first.");
      return;
    }

    const existing = runsByTask.get(task.id);

    setSaving(true);
    try {
      if (existing) {
        // delete run (uncheck) for this location+date
        const { error } = await supabase
          .from("cleaning_task_runs")
          .delete()
          .eq("id", existing.id)
          .eq("org_id", orgId)
          .eq("location_id", locationId);

        if (error) throw error;
      } else {
        // insert run for this location+date
        const initials = prompt("Staff initials (optional)")?.trim()?.toUpperCase() ?? null;

        const { error } = await supabase.from("cleaning_task_runs").insert({
          org_id: orgId,
          location_id: locationId, // ✅ the whole point
          task_id: task.id,
          done_date: date,
          done_by_initials: initials,
        });

        if (error) throw error;
      }

      // refresh runs only (cheap)
      const { data: runData } = await supabase
        .from("cleaning_task_runs")
        .select("id,task_id,done_date,done_by_initials,location_id")
        .eq("org_id", orgId)
        .eq("done_date", date)
        .eq("location_id", locationId);

      const runRows: Run[] =
        (runData ?? []).map((r: any) => ({
          id: String(r.id),
          task_id: String(r.task_id),
          done_date: String(r.done_date),
          done_by_initials: r.done_by_initials ?? null,
          location_id: r.location_id ?? null,
        })) ?? [];

      setRuns(runRows);
    } catch (e: any) {
      console.error(e);
      alert(e?.message || "Failed to update task.");
    } finally {
      setSaving(false);
    }
  }

  async function addTask(e: React.FormEvent) {
    e.preventDefault();
    if (!orgId || !locationId) {
      alert("Please select a location first.");
      return;
    }

    const name = newName.trim();
    if (!name) return;

    setSaving(true);
    try {
      const { error } = await supabase.from("cleaning_tasks").insert({
        org_id: orgId,
        location_id: locationId, // ✅ new tasks are site-specific by default
        name,
        area: newArea.trim() || null,
        frequency: newFreq,
        active: true,
        position: tasks.length,
      });

      if (error) throw error;

      setNewName("");
      setNewArea("");
      setNewFreq("daily");

      await loadAll();
    } catch (e: any) {
      console.error(e);
      alert(e?.message || "Failed to add task.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-white/40 bg-white/80 p-4 text-sm text-slate-700 shadow-sm backdrop-blur">
        <div className="flex flex-wrap items-center gap-2">
          <div className="font-semibold text-slate-900">Cleaning rota</div>

          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600">
            Date: {date}
          </span>

          {locationId ? (
            <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-800">
              Site scoped
            </span>
          ) : (
            <span className="rounded-full bg-amber-50 px-2 py-0.5 text-xs font-semibold text-amber-900">
              No site selected
            </span>
          )}
        </div>

        <div className="mt-3">
          <label className="text-xs font-medium text-slate-600">Date</label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="mt-1 h-10 w-full max-w-[220px] rounded-xl border border-slate-200 bg-white/90 px-3 text-sm shadow-inner"
          />
        </div>

        <p className="mt-2 text-xs text-slate-500">
          Tasks and completion ticks are saved to the currently selected location.
        </p>
      </div>

      <div className="rounded-2xl border border-white/40 bg-white/80 p-4 shadow-sm backdrop-blur">
        <form onSubmit={addTask} className="flex flex-col gap-2 sm:flex-row sm:items-end">
          <div className="flex-1">
            <label className="mb-1 block text-xs font-medium text-slate-600">Task</label>
            <input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              className="h-10 w-full rounded-xl border border-slate-200 bg-white/90 px-3 text-sm shadow-inner"
              placeholder="e.g. Sanitise prep surfaces"
              disabled={!locationId || saving}
            />
          </div>

          <div className="flex-1">
            <label className="mb-1 block text-xs font-medium text-slate-600">Area</label>
            <input
              value={newArea}
              onChange={(e) => setNewArea(e.target.value)}
              className="h-10 w-full rounded-xl border border-slate-200 bg-white/90 px-3 text-sm shadow-inner"
              placeholder="e.g. Kitchen"
              disabled={!locationId || saving}
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">Frequency</label>
            <select
              value={newFreq}
              onChange={(e) => setNewFreq(e.target.value)}
              className="h-10 rounded-xl border border-slate-200 bg-white/90 px-3 text-sm shadow-inner"
              disabled={!locationId || saving}
            >
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
            </select>
          </div>

          <button
            type="submit"
            disabled={!newName.trim() || saving || !locationId}
            className={cls(
              "h-10 rounded-2xl px-4 text-sm font-medium text-white shadow-sm",
              newName.trim() && !saving && locationId
                ? "bg-emerald-600 hover:bg-emerald-500"
                : "bg-slate-400 cursor-not-allowed"
            )}
          >
            {saving ? "Saving…" : "Add task"}
          </button>
        </form>
      </div>

      <div className="rounded-2xl border border-white/40 bg-white/80 p-4 shadow-sm backdrop-blur">
        {loading ? (
          <div className="py-4 text-center text-sm text-slate-500">Loading…</div>
        ) : err ? (
          <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
            {err}
          </div>
        ) : tasks.length === 0 ? (
          <div className="rounded-md border border-dashed border-slate-200 bg-slate-50/80 px-3 py-4 text-sm text-slate-500">
            No tasks yet.
          </div>
        ) : (
          <div className="space-y-2">
            {tasks.map((t) => {
              const done = !!runsByTask.get(t.id);
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => toggleDone(t)}
                  disabled={saving}
                  className={cls(
                    "w-full rounded-xl border px-3 py-3 text-left text-sm shadow-sm transition",
                    done
                      ? "border-emerald-200 bg-emerald-50"
                      : "border-slate-200 bg-white hover:bg-slate-50"
                  )}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="font-semibold text-slate-900 truncate">{t.name}</div>
                      <div className="text-xs text-slate-500 truncate">
                        {t.area ? `${t.area} • ` : ""}
                        {t.location_id ? "Site task" : "Org-wide"} • {t.frequency ?? "—"}
                      </div>
                    </div>

                    <span
                      className={cls(
                        "shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold",
                        done
                          ? "bg-emerald-600 text-white"
                          : "bg-slate-100 text-slate-700"
                      )}
                    >
                      {done ? "Done" : "Not done"}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

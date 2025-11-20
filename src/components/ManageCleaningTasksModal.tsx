"use client";

import React, { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseBrowser";
import { getActiveOrgIdClient } from "@/lib/orgClient";
import { getActiveLocationIdClient } from "@/lib/locationClient";

/**
 * Shared categories – used by CleaningRota and FoodTempLogger.
 */
export const CLEANING_CATEGORIES: string[] = [
  "Opening checks",
  "Service checks",
  "Close-down",
  "Fridges / Freezers",
  "Equipment",
  "Floors & Walls",
  "Toilets / Washrooms",
  "Other",
];

/* ---------- Types ---------- */

type Frequency = "daily" | "weekly" | "monthly";

type CleaningTask = {
  id: string;
  org_id: string;
  location_id: string | null;
  area: string | null;
  task: string;
  category: string | null;
  frequency: Frequency;
  weekday: number | null; // 1–7 (Mon–Sun) for weekly
  month_day: number | null; // 1–31 for monthly
};

type Props = {
  open: boolean;
  onClose: () => void;
  onSaved: () => Promise<void> | void;
};

const WEEKDAY_OPTIONS = [
  { value: 1, label: "Monday" },
  { value: 2, label: "Tuesday" },
  { value: 3, label: "Wednesday" },
  { value: 4, label: "Thursday" },
  { value: 5, label: "Friday" },
  { value: 6, label: "Saturday" },
  { value: 7, label: "Sunday" },
];

const FREQUENCY_OPTIONS: { value: Frequency; label: string }[] = [
  { value: "daily", label: "Daily" },
  { value: "weekly", label: "Weekly" },
  { value: "monthly", label: "Monthly" },
];

const emptyDraft: Omit<CleaningTask, "id" | "org_id" | "location_id"> = {
  area: "",
  task: "",
  category: CLEANING_CATEGORIES[0] ?? "Opening checks",
  frequency: "daily",
  weekday: 1,
  month_day: 1,
};

export default function ManageCleaningTasksModal({
  open,
  onClose,
  onSaved,
}: Props) {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [tasks, setTasks] = useState<CleaningTask[]>([]);
  const [error, setError] = useState<string | null>(null);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<typeof emptyDraft>(emptyDraft);

  // Reset when closed
  useEffect(() => {
    if (!open) {
      setTasks([]);
      setError(null);
      setEditingId(null);
      setDraft(emptyDraft);
    }
  }, [open]);

  // Load tasks when opened
  useEffect(() => {
    if (!open) return;

    (async () => {
      setLoading(true);
      setError(null);
      try {
        const org_id = await getActiveOrgIdClient();
        const location_id = await getActiveLocationIdClient();

        if (!org_id) {
          setError("No organisation found.");
          return;
        }

        let query = supabase
          .from("cleaning_tasks")
          .select(
            "id, org_id, location_id, area, task, category, frequency, weekday, month_day"
          )
          .eq("org_id", org_id)
          .order("task", { ascending: true });

        if (location_id) {
          query = query.eq("location_id", location_id);
        }

        const { data, error } = await query;
        if (error) throw error;

        const rows: CleaningTask[] =
          (data ?? []).map((r: any) => ({
            id: String(r.id),
            org_id: String(r.org_id),
            location_id: r.location_id ? String(r.location_id) : null,
            area: r.area ?? null,
            task: r.task ?? "",
            category: r.category ?? null,
            frequency: (r.frequency ?? "daily") as Frequency,
            weekday: r.weekday != null ? Number(r.weekday) : null,
            month_day: r.month_day != null ? Number(r.month_day) : null,
          })) ?? [];

        setTasks(rows);
      } catch (e: any) {
        console.error(e);
        setError(e?.message ?? "Failed to load cleaning tasks.");
      } finally {
        setLoading(false);
      }
    })();
  }, [open]);

  function startNew() {
    setEditingId(null);
    setDraft(emptyDraft);
  }

  function startEdit(task: CleaningTask) {
    setEditingId(task.id);
    setDraft({
      area: task.area ?? "",
      task: task.task,
      category: task.category ?? CLEANING_CATEGORIES[0] ?? "Opening checks",
      frequency: task.frequency,
      weekday: task.weekday ?? 1,
      month_day: task.month_day ?? 1,
    });
  }

  async function handleDelete(id: string) {
    if (!window.confirm("Delete this task?")) return;

    try {
      setSaving(true);
      const org_id = await getActiveOrgIdClient();
      const location_id = await getActiveLocationIdClient();
      if (!org_id) {
        alert("No organisation found.");
        return;
      }

      const query = supabase
        .from("cleaning_tasks")
        .delete()
        .eq("org_id", org_id)
        .eq("id", id);

      // keep location scoped if available
      const { error } = location_id
        ? await query.eq("location_id", location_id)
        : await query;

      if (error) throw error;

      setTasks((prev) => prev.filter((t) => t.id !== id));
      await onSaved();
    } catch (e: any) {
      console.error(e);
      alert(e?.message ?? "Failed to delete task.");
    } finally {
      setSaving(false);
    }
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!draft.task.trim()) {
      alert("Task name is required.");
      return;
    }

    try {
      setSaving(true);
      const org_id = await getActiveOrgIdClient();
      const location_id = await getActiveLocationIdClient();

      if (!org_id) {
        alert("No organisation found.");
        return;
      }

      const payload = {
        org_id,
        location_id: location_id ?? null,
        area: draft.area?.trim() || null,
        task: draft.task.trim(),
        category: draft.category?.trim() || null,
        frequency: draft.frequency,
        weekday:
          draft.frequency === "weekly" ? Number(draft.weekday ?? 1) : null,
        month_day:
          draft.frequency === "monthly" ? Number(draft.month_day ?? 1) : null,
      };

      if (editingId) {
        // update
        const { error, data } = await supabase
          .from("cleaning_tasks")
          .update(payload)
          .eq("org_id", org_id)
          .eq("id", editingId)
          .select(
            "id, org_id, location_id, area, task, category, frequency, weekday, month_day"
          )
          .maybeSingle();

        if (error) throw error;
        if (data) {
          const updated: CleaningTask = {
            id: String(data.id),
            org_id: String(data.org_id),
            location_id: data.location_id ? String(data.location_id) : null,
            area: data.area ?? null,
            task: data.task ?? "",
            category: data.category ?? null,
            frequency: (data.frequency ?? "daily") as Frequency,
            weekday: data.weekday != null ? Number(data.weekday) : null,
            month_day: data.month_day != null ? Number(data.month_day) : null,
          };
          setTasks((prev) =>
            prev.map((t) => (t.id === editingId ? updated : t))
          );
        }
      } else {
        // insert
        const { error, data } = await supabase
          .from("cleaning_tasks")
          .insert(payload)
          .select(
            "id, org_id, location_id, area, task, category, frequency, weekday, month_day"
          );

        if (error) throw error;

        const rows: CleaningTask[] =
          (data ?? []).map((r: any) => ({
            id: String(r.id),
            org_id: String(r.org_id),
            location_id: r.location_id ? String(r.location_id) : null,
            area: r.area ?? null,
            task: r.task ?? "",
            category: r.category ?? null,
            frequency: (r.frequency ?? "daily") as Frequency,
            weekday: r.weekday != null ? Number(r.weekday) : null,
            month_day: r.month_day != null ? Number(r.month_day) : null,
          })) ?? [];

        setTasks((prev) => [...prev, ...rows]);
      }

      setEditingId(null);
      setDraft(emptyDraft);
      await onSaved();
    } catch (e: any) {
      console.error(e);
      alert(e?.message ?? "Failed to save task.");
    } finally {
      setSaving(false);
    }
  }

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center px-3 py-6"
      onClick={onClose}
    >
      <div
        className="w-full max-w-4xl max-h-[90vh] rounded-2xl bg-white shadow-2xl flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 bg-slate-900 px-4 py-3 text-white">
          <div>
            <div className="text-[11px] uppercase tracking-[0.2em] text-slate-300">
              Cleaning Tasks
            </div>
            <div className="text-base font-semibold">
              Manage cleaning checklist
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md bg-slate-800 px-3 py-1.5 text-sm hover:bg-slate-700"
          >
            Close
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 min-h-0 overflow-y-auto px-4 py-4 space-y-4">
          {error && (
            <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
              {error}
            </div>
          )}

          {/* Existing tasks list */}
          <div>
            <div className="mb-2 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-slate-900">
                Existing tasks
              </h2>
              <button
                type="button"
                onClick={startNew}
                className="rounded-xl border border-emerald-600 px-3 py-1.5 text-xs font-medium text-emerald-700 hover:bg-emerald-50"
              >
                + Add new task
              </button>
            </div>

            <div className="rounded-xl border border-slate-200 bg-slate-50/60 overflow-hidden">
              {loading ? (
                <div className="px-3 py-4 text-sm text-slate-500">
                  Loading…
                </div>
              ) : tasks.length === 0 ? (
                <div className="px-3 py-4 text-sm text-slate-500">
                  No cleaning tasks yet. Use &quot;Add new task&quot; to create
                  your checklist.
                </div>
              ) : (
                <table className="w-full text-xs">
                  <thead className="bg-slate-100 text-slate-600">
                    <tr className="text-left">
                      <th className="px-2 py-1">Area</th>
                      <th className="px-2 py-1">Task</th>
                      <th className="px-2 py-1">Category</th>
                      <th className="px-2 py-1">Frequency</th>
                      <th className="px-2 py-1 w-28">When</th>
                      <th className="px-2 py-1 w-24 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tasks.map((t) => (
                      <tr
                        key={t.id}
                        className="border-t border-slate-100 bg-white"
                      >
                        <td className="px-2 py-1 text-xs">
                          {t.area || "—"}
                        </td>
                        <td className="px-2 py-1 text-xs">{t.task}</td>
                        <td className="px-2 py-1 text-xs">
                          {t.category || "—"}
                        </td>
                        <td className="px-2 py-1 text-xs capitalize">
                          {t.frequency}
                        </td>
                        <td className="px-2 py-1 text-xs">
                          {t.frequency === "weekly" && t.weekday
                            ? WEEKDAY_OPTIONS.find(
                                (w) => w.value === t.weekday
                              )?.label ?? "Weekly"
                            : t.frequency === "monthly" && t.month_day
                            ? `Day ${t.month_day}`
                            : t.frequency === "daily"
                            ? "Every day"
                            : "—"}
                        </td>
                        <td className="px-2 py-1 text-right text-xs">
                          <button
                            type="button"
                            onClick={() => startEdit(t)}
                            className="mr-2 rounded-lg border border-slate-200 px-2 py-0.5 hover:bg-slate-50"
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(t.id)}
                            className="rounded-lg border border-red-200 px-2 py-0.5 text-red-700 hover:bg-red-50"
                          >
                            Del
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>

          {/* Edit / create form */}
          <form
            onSubmit={handleSave}
            className="rounded-xl border border-slate-200 bg-white px-3 py-3 space-y-3"
          >
            <div className="flex items-center justify-between">
              <div className="text-sm font-semibold text-slate-900">
                {editingId ? "Edit task" : "Add new task"}
              </div>
              {editingId && (
                <button
                  type="button"
                  onClick={startNew}
                  className="text-xs text-slate-500 hover:underline"
                >
                  Clear form
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <label className="text-xs font-medium text-slate-700">
                Area (optional)
                <input
                  className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-sm shadow-sm"
                  value={draft.area ?? ""}
                  onChange={(e) =>
                    setDraft((d) => ({ ...d, area: e.target.value }))
                  }
                  placeholder="e.g. Kitchen, Bar"
                />
              </label>

              <label className="text-xs font-medium text-slate-700 sm:col-span-1">
                Task
                <input
                  className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-sm shadow-sm"
                  value={draft.task}
                  onChange={(e) =>
                    setDraft((d) => ({ ...d, task: e.target.value }))
                  }
                  placeholder="e.g. Clean grill, Mop floor"
                  required
                />
              </label>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <label className="text-xs font-medium text-slate-700">
                Category
                <select
                  className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-sm shadow-sm"
                  value={draft.category ?? ""}
                  onChange={(e) =>
                    setDraft((d) => ({ ...d, category: e.target.value }))
                  }
                >
                  {CLEANING_CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </label>

              <label className="text-xs font-medium text-slate-700">
                Frequency
                <select
                  className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-sm shadow-sm"
                  value={draft.frequency}
                  onChange={(e) =>
                    setDraft((d) => ({
                      ...d,
                      frequency: e.target.value as Frequency,
                    }))
                  }
                >
                  {FREQUENCY_OPTIONS.map((f) => (
                    <option key={f.value} value={f.value}>
                      {f.label}
                    </option>
                  ))}
                </select>
              </label>

              {/* When (weekly/monthly) */}
              {draft.frequency === "weekly" && (
                <label className="text-xs font-medium text-slate-700">
                  Day of week
                  <select
                    className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-sm shadow-sm"
                    value={draft.weekday ?? 1}
                    onChange={(e) =>
                      setDraft((d) => ({
                        ...d,
                        weekday: Number(e.target.value) || 1,
                      }))
                    }
                  >
                    {WEEKDAY_OPTIONS.map((w) => (
                      <option key={w.value} value={w.value}>
                        {w.label}
                      </option>
                    ))}
                  </select>
                </label>
              )}

              {draft.frequency === "monthly" && (
                <label className="text-xs font-medium text-slate-700">
                  Day of month
                  <input
                    type="number"
                    min={1}
                    max={31}
                    className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-sm shadow-sm"
                    value={draft.month_day ?? 1}
                    onChange={(e) =>
                      setDraft((d) => ({
                        ...d,
                        month_day: Number(e.target.value) || 1,
                      }))
                    }
                  />
                </label>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg px-3 py-1.5 text-xs text-slate-700 hover:bg-slate-100"
              >
                Close
              </button>
              <button
                type="submit"
                disabled={saving}
                className="rounded-xl bg-emerald-600 px-4 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-emerald-500 disabled:opacity-50"
              >
                {saving ? "Saving…" : editingId ? "Save changes" : "Add task"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

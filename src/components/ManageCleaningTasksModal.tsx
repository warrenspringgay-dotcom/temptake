// src/components/ManageCleaningTasksModal.tsx
"use client";

import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseBrowser";
import { getActiveOrgIdClient } from "@/lib/orgClient";

/* ------------ Types ------------ */
type Frequency = "daily" | "weekly" | "monthly";

export type CleaningTaskRow = {
  id: string; // uuid
  org_id: string; // uuid
  task: string;
  area: string | null;
  category: string | null;
  frequency: Frequency;
  weekday: number | null; // 1..7
  month_day: number | null; // 1..31
};

type Draft = {
  id?: string;
  task: string;
  area: string;
  category: string;
  frequency: Frequency;
  weekday: number | null;
  month_day: number | null;
};

/* ------------ Constants ------------ */
export const CLEANING_CATEGORIES = [
  "Opening checks",
  "Preparation",
  "Mid shift",
  "Cleaning down",
  "Closing down",
  "Admin",
] as const;

const WEEKDAY_OPTIONS = [
  [1, "Monday"],
  [2, "Tuesday"],
  [3, "Wednesday"],
  [4, "Thursday"],
  [5, "Friday"],
  [6, "Saturday"],
  [7, "Sunday"],
] as const;

/* ------------ UI helpers ------------ */
const cls = (...p: Array<string | false | null | undefined>) =>
  p.filter(Boolean).join(" ");

const CARD = "rounded-2xl border border-gray-200 bg-white shadow-sm";

/* ====================================================== */
export default function ManageCleaningTasksModal({
  open,
  onClose,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  onSaved?: () => Promise<void> | void;
}) {
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [tasks, setTasks] = useState<CleaningTaskRow[]>([]);
  const [q, setQ] = useState("");

  const [draft, setDraft] = useState<Draft | null>(null);

  async function loadTasks() {
    setLoading(true);
    setErr(null);
    try {
      const { data, error } = await supabase
        .from("cleaning_tasks")
        .select(
          "id, org_id, task, area, category, frequency, weekday, month_day"
        )
        .order("category", { ascending: true })
        .order("task", { ascending: true });

      if (error) throw error;

      setTasks(
        (data ?? []).map((r: any) => ({
          id: String(r.id),
          org_id: String(r.org_id),
          task: r.task ?? r.name ?? "",
          area: r.area ?? null,
          category: r.category ?? null,
          frequency: (r.frequency ?? "daily") as Frequency,
          weekday: r.weekday ? Number(r.weekday) : null,
          month_day: r.month_day ? Number(r.month_day) : null,
        }))
      );
    } catch (e: any) {
      setErr(e?.message || "Failed to load tasks.");
    } finally {
      setLoading(false);
    }
  }

  // open => load
  useEffect(() => {
    if (open) {
      setDraft(null);
      loadTasks();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return tasks;
    return tasks.filter(
      (t) =>
        t.task.toLowerCase().includes(s) ||
        (t.area ?? "").toLowerCase().includes(s) ||
        (t.category ?? "").toLowerCase().includes(s)
    );
  }, [q, tasks]);

  const grouped = useMemo(() => {
    const map = new Map<string, CleaningTaskRow[]>();
    for (const t of filtered) {
      const key = t.category ?? "Uncategorised";
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(t);
    }
    return Array.from(map.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([cat, list]) => ({
        cat,
        list: list.sort((a, b) => a.task.localeCompare(b.task)),
      }));
  }, [filtered]);

  function openNew() {
    setDraft({
      task: "",
      area: "",
      category: CLEANING_CATEGORIES[0],
      frequency: "daily",
      weekday: 1,
      month_day: 1,
    });
  }

  function openEdit(row: CleaningTaskRow) {
    setDraft({
      id: row.id,
      task: row.task || "",
      area: row.area || "",
      category: row.category || "",
      frequency: row.frequency,
      weekday: row.weekday,
      month_day: row.month_day,
    });
  }

  async function saveDraft(e: React.FormEvent) {
    e.preventDefault();
    if (!draft) return;
    if (!draft.task.trim()) {
      alert("Task name is required.");
      return;
    }

    try {
      if (draft.id) {
        // UPDATE
        const payload = {
          task: draft.task.trim(),
          area: draft.area.trim() || null,
          category: draft.category.trim() || null,
          frequency: draft.frequency,
          weekday: draft.frequency === "weekly" ? draft.weekday : null,
          month_day: draft.frequency === "monthly" ? draft.month_day : null,
        };

        const { error } = await supabase
          .from("cleaning_tasks")
          .update(payload)
          .eq("id", draft.id);

        if (error) throw error;
      } else {
        // INSERT (org_id from helper)
        const org_id = await getActiveOrgIdClient();
        if (!org_id) throw new Error("No organisation found.");

        const payload = {
          org_id,
          task: draft.task.trim(),
          area: draft.area.trim() || null,
          category: draft.category.trim() || null,
          frequency: draft.frequency,
          weekday: draft.frequency === "weekly" ? draft.weekday : null,
          month_day: draft.frequency === "monthly" ? draft.month_day : null,
        };

        const { error } = await supabase
          .from("cleaning_tasks")
          .insert(payload);
        if (error) throw error;
      }

      setDraft(null);
      await loadTasks();
      await onSaved?.();
    } catch (e: any) {
      alert(e?.message || "Failed to save task.");
    }
  }

  async function deleteTask(id: string) {
    if (!confirm("Delete this task? This cannot be undone.")) return;
    try {
      const { error } = await supabase
        .from("cleaning_tasks")
        .delete()
        .eq("id", id);
      if (error) throw error;
      await loadTasks();
      await onSaved?.();
    } catch (e: any) {
      alert(e?.message || "Failed to delete.");
    }
  }

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/30 overflow-y-auto overscroll-contain"
      onClick={onClose}
    >
      <div
        className={cls(
          CARD,
          "mt-4 mb-4 flex w-full max-w-4xl max-h-[90vh] flex-col overflow-hidden"
        )}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header – tighter layout, mobile-friendly */}
        <div className="sticky top-0 z-10 border-b border-gray-200 bg-white px-4 py-3">
          <div className="flex flex-wrap items-center gap-3">
            <div className="text-base font-semibold whitespace-nowrap">
              Manage cleaning tasks
            </div>
            <div className="flex-1 min-w-0 flex flex-wrap items-center gap-2">
              <input
                className="h-9 w-full min-w-0 flex-1 rounded-xl border border-gray-200 px-3 text-sm"
                placeholder="Search…"
                value={q}
                onChange={(e) => setQ(e.target.value)}
              />
              <button
                className="inline-flex items-center justify-center whitespace-nowrap rounded-xl border border-gray-200 px-3 py-1.5 text-sm hover:bg-gray-50"
                onClick={openNew}
              >
                <span className="text-lg leading-none mr-1">＋</span>
                <span>Add task</span>
              </button>
              <button
                className="inline-flex items-center justify-center whitespace-nowrap rounded-xl border border-gray-200 px-3 py-1.5 text-sm hover:bg-gray-50"
                onClick={onClose}
              >
                Close
              </button>
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="grid grow grid-cols-1 gap-4 overflow-y-auto p-4 md:grid-cols-2">
          {/* Left: list */}
          <div className="space-y-3">
            {err && (
              <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
                {err}
              </div>
            )}
            {loading ? (
              <div className="rounded-xl border border-gray-200 p-3 text-sm text-gray-500">
                Loading…
              </div>
            ) : grouped.length === 0 ? (
              <div className="rounded-xl border border-gray-200 p-3 text-sm text-gray-500">
                No tasks yet.
              </div>
            ) : (
              grouped.map((g) => (
                <div
                  key={g.cat}
                  className="rounded-xl border border-gray-200"
                >
                  <div className="border-b border-gray-200 bg-gray-50 px-3 py-2 text-xs font-semibold text-gray-600">
                    {g.cat}
                  </div>
                  <ul className="divide-y divide-gray-100">
                    {g.list.map((t) => (
                      <li
                        key={t.id}
                        className="flex items-center justify-between px-3 py-2 text-sm"
                      >
                        <div>
                          <div className="font-medium">{t.task}</div>
                          <div className="text-[11px] text-gray-500">
                            {(t.area ?? "—")} •{" "}
                            {t.frequency === "daily"
                              ? "Daily"
                              : t.frequency === "weekly"
                              ? `Weekly (${t.weekday})`
                              : `Monthly (${t.month_day})`}
                          </div>
                        </div>
                        <div className="shrink-0 space-x-2">
                          <button
                            className="rounded-md border border-gray-200 px-2 py-1 text-xs hover:bg-gray-50"
                            onClick={() => openEdit(t)}
                          >
                            Edit
                          </button>
                          <button
                            className="rounded-md border border-red-200 px-2 py-1 text-xs text-red-700 hover:bg-red-50"
                            onClick={() => deleteTask(t.id)}
                          >
                            Delete
                          </button>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              ))
            )}
          </div>

          {/* Right: editor */}
          <div className="space-y-3">
            {!draft ? (
              <div className="rounded-xl border border-gray-200 p-4 text-sm text-gray-600">
                Select a task to edit, or click <strong>+ Add task</strong>.
              </div>
            ) : (
              <form
                onSubmit={saveDraft}
                className="space-y-3 rounded-xl border border-gray-200 p-4"
              >
                <div className="text-sm font-semibold">
                  {draft.id ? "Edit task" : "Add task"}
                </div>

                <label className="block text-sm">
                  <div className="mb-1 text-gray-600">Task</div>
                  <input
                    className="w-full rounded-xl border border-gray-200 px-3 py-2"
                    value={draft.task}
                    onChange={(e) =>
                      setDraft({ ...draft, task: e.target.value })
                    }
                    required
                  />
                </label>

                <label className="block text-sm">
                  <div className="mb-1 text-gray-600">Area</div>
                  <input
                    className="w-full rounded-xl border border-gray-200 px-3 py-2"
                    value={draft.area}
                    onChange={(e) =>
                      setDraft({ ...draft, area: e.target.value })
                    }
                    placeholder="e.g., Kitchen"
                  />
                </label>

                <label className="block text-sm">
                  <div className="mb-1 text-gray-600">Category</div>
                  <select
                    className="w-full rounded-xl border border-gray-200 px-3 py-2"
                    value={draft.category}
                    onChange={(e) =>
                      setDraft({ ...draft, category: e.target.value })
                    }
                  >
                    {CLEANING_CATEGORIES.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="block text-sm">
                  <div className="mb-1 text-gray-600">Frequency</div>
                  <select
                    className="w-full rounded-xl border border-gray-200 px-3 py-2"
                    value={draft.frequency}
                    onChange={(e) =>
                      setDraft({
                        ...draft,
                        frequency: e.target
                          .value as Frequency,
                      })
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
                      className="w-full rounded-xl border border-gray-200 px-3 py-2"
                      value={draft.weekday ?? 1}
                      onChange={(e) =>
                        setDraft({
                          ...draft,
                          weekday: Number(e.target.value) || 1,
                        })
                      }
                    >
                      {WEEKDAY_OPTIONS.map(([v, label]) => (
                        <option key={v} value={v}>
                          {label}
                        </option>
                      ))}
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
                      className="w-full rounded-xl border border-gray-200 px-3 py-2"
                      value={draft.month_day ?? 1}
                      onChange={(e) =>
                        setDraft({
                          ...draft,
                          month_day: Math.min(
                            31,
                            Math.max(1, Number(e.target.value) || 1)
                          ),
                        })
                      }
                    />
                  </label>
                )}

                <div className="flex items-center justify-end gap-2 pt-1">
                  <button
                    type="button"
                    className="rounded-md px-3 py-1.5 hover:bg-gray-50"
                    onClick={() => setDraft(null)}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="rounded-xl bg-black px-4 py-1.5 text-sm font-medium text-white hover:bg-gray-900"
                  >
                    {draft.id ? "Save changes" : "Add task"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

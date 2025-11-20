// src/components/EditCleaningTaskModal.tsx
"use client";

import React, { useEffect, useMemo, useState } from "react";

/** Matches your table shape */
export type CleaningTaskRow = {
  id: string; // uuid
  org_id: string; // uuid
  area: string | null;
  task: string | null;
  schedule_type: "daily" | "weekly" | "monthly";
  /** 0=Mon … 6=Sun when schedule_type='weekly' */
  weekday: number | null;
  /** 1–31 when schedule_type='monthly' */
  month_day: number | null;
  active: boolean | null;
  notes?: string | null;
};

export type CleaningTaskDraft = {
  id?: string;
  area: string;
  task: string;
  schedule_type: "daily" | "weekly" | "monthly";
  weekday: number | null;
  month_day: number | null;
  active: boolean;
  notes?: string;
};

type Props = {
  open: boolean;
  /** If provided, we populate from here (edit). If not, it’s an add. */
  initial?: Partial<CleaningTaskRow> | null;
  onClose: () => void;
  /** Called with a validated draft; you persist it in the page component. */
  onSave: (draft: CleaningTaskDraft) => Promise<void> | void;
  title?: string; // optional custom title
};

const WEEKDAYS = [
  { v: 0, label: "Mon" },
  { v: 1, label: "Tue" },
  { v: 2, label: "Wed" },
  { v: 3, label: "Thu" },
  { v: 4, label: "Fri" },
  { v: 5, label: "Sat" },
  { v: 6, label: "Sun" },
];

export default function EditCleaningTaskModal({
  open,
  initial,
  onClose,
  onSave,
  title,
}: Props) {
  const seed: CleaningTaskDraft = useMemo(
    () => ({
      id: initial?.id,
      area: (initial?.area ?? "").toString(),
      task: (initial?.task ?? "").toString(),
      schedule_type: (initial?.schedule_type as any) ?? "daily",
      weekday:
        initial?.weekday == null || Number.isNaN(Number(initial?.weekday))
          ? 0
          : Number(initial?.weekday),
      month_day:
        initial?.month_day == null || Number.isNaN(Number(initial?.month_day))
          ? 1
          : Number(initial?.month_day),
      active: initial?.active ?? true,
      notes: (initial?.notes ?? "")?.toString() ?? "",
    }),
    [initial]
  );

  const [draft, setDraft] = useState<CleaningTaskDraft>(seed);
  useEffect(() => setDraft(seed), [seed]);

  // lock background scroll when open
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  if (!open) return null;

  function validate(d: CleaningTaskDraft): string | null {
    if (!d.area.trim()) return "Area is required.";
    if (!d.task.trim()) return "Task is required.";
    if (d.schedule_type === "weekly") {
      if (d.weekday == null || d.weekday < 0 || d.weekday > 6)
        return "Choose a valid weekday (Mon–Sun).";
    }
    if (d.schedule_type === "monthly") {
      if (d.month_day == null || d.month_day < 1 || d.month_day > 31)
        return "Choose a valid day of month (1–31).";
    }
    return null;
  }

  async function handleSave(e?: React.FormEvent) {
    e?.preventDefault();
    const err = validate(draft);
    if (err) {
      alert(err);
      return;
    }
    // normalise conditionals
    const normalised: CleaningTaskDraft = {
      ...draft,
      weekday: draft.schedule_type === "weekly" ? draft.weekday : null,
      month_day: draft.schedule_type === "monthly" ? draft.month_day : null,
    };
    await Promise.resolve(onSave(normalised));
  }

  return (
    <div
      className="fixed inset-0 z-50 bg-black/40"
      onClick={onClose}
      aria-modal
      role="dialog"
    >
      {/* Sheet */}
      <form
        onSubmit={handleSave}
        className="mx-auto mt-6 flex h-[92vh] w-full max-w-xl flex-col overflow-x-hidden rounded-2xl border bg-white shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Sticky header */}
        <div className="sticky top-0 z-10 flex items-center justify-between border-b bg-white px-4 py-3">
          <div className="text-base font-semibold">
            {title ?? (draft.id ? "Edit cleaning task" : "Add cleaning task")}
          </div>
          <button
            type="button"
            className="rounded-md p-2 hover:bg-gray-100"
            onClick={onClose}
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        {/* Scrollable content */}
        <div className="grow overflow-y-auto px-4 py-3">
          <div className="grid gap-3">
            <label className="text-sm">
              <div className="mb-1 text-gray-600">Area</div>
              <input
                className="h-10 w-full rounded-xl border px-3"
                placeholder="e.g., Kitchen"
                value={draft.area}
                onChange={(e) =>
                  setDraft((d) => ({ ...d, area: e.target.value }))
                }
              />
            </label>

            <label className="text-sm">
              <div className="mb-1 text-gray-600">Task</div>
              <input
                className="h-10 w-full rounded-xl border px-3"
                placeholder="e.g., Sanitise preparation surfaces"
                value={draft.task}
                onChange={(e) =>
                  setDraft((d) => ({ ...d, task: e.target.value }))
                }
              />
            </label>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <label className="text-sm">
                <div className="mb-1 text-gray-600">Frequency</div>
                <select
                  className="h-10 w-full rounded-xl border px-3"
                  value={draft.schedule_type}
                  onChange={(e) =>
                    setDraft((d) => ({
                      ...d,
                      schedule_type:
                        e.target.value as CleaningTaskDraft["schedule_type"],
                    }))
                  }
                >
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                </select>
              </label>

              {draft.schedule_type === "weekly" && (
                <label className="text-sm">
                  <div className="mb-1 text-gray-600">Weekday</div>
                  <select
                    className="h-10 w-full rounded-xl border px-3"
                    value={draft.weekday ?? 0}
                    onChange={(e) =>
                      setDraft((d) => ({
                        ...d,
                        weekday: Number(e.target.value),
                      }))
                    }
                  >
                    {WEEKDAYS.map((w) => (
                      <option key={w.v} value={w.v}>
                        {w.label}
                      </option>
                    ))}
                  </select>
                </label>
              )}

              {draft.schedule_type === "monthly" && (
                <label className="text-sm">
                  <div className="mb-1 text-gray-600">Day of month</div>
                  <input
                    type="number"
                    min={1}
                    max={31}
                    className="h-10 w-full rounded-xl border px-3"
                    value={draft.month_day ?? 1}
                    onChange={(e) =>
                      setDraft((d) => ({
                        ...d,
                        month_day: Math.max(
                          1,
                          Math.min(31, Number(e.target.value || 1))
                        ),
                      }))
                    }
                  />
                </label>
              )}
            </div>

            <label className="text-sm">
              <div className="mb-1 text-gray-600">Notes (optional)</div>
              <textarea
                rows={3}
                className="w-full rounded-xl border px-3 py-2"
                value={draft.notes ?? ""}
                onChange={(e) =>
                  setDraft((d) => ({ ...d, notes: e.target.value }))
                }
              />
            </label>

            <label className="mt-1 inline-flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={draft.active}
                onChange={(e) =>
                  setDraft((d) => ({ ...d, active: e.target.checked }))
                }
              />
              Active
            </label>
          </div>
        </div>

        {/* Sticky footer */}
        <div className="sticky bottom-0 z-10 flex items-center justify-end gap-2 border-t bg-white px-4 py-3">
          <button
            type="button"
            className="rounded-md px-3 py-1.5 text-sm hover:bg-gray-50"
            onClick={onClose}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="rounded-xl bg-black px-3 py-1.5 text-sm font-medium text-white hover:bg-gray-800"
          >
            Save
          </button>
        </div>
      </form>
    </div>
  );
}

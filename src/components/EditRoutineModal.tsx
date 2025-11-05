// src/components/EditRoutineModal.tsx
"use client";

import React, { useEffect, useState } from "react";

export type RoutineItemDraft = {
  id?: string; // existing DB id (optional)
  position: number; // 1, 2, 3, ...
  location: string | null;
  item: string | null;
  target_key: string; // e.g. "cooked"
};

export type RoutineDraft = {
  id?: string; // routine id when editing
  name: string;
  active: boolean;
  items: RoutineItemDraft[];
};

type Props = {
  open: boolean;
  initial: RoutineDraft | null;
  onClose: () => void;
  onSave: (draft: RoutineDraft) => Promise<void> | void;
};

// Simple target list – adjust to your real targets if needed
const TARGET_OPTIONS: { key: string; label: string }[] = [
  { key: "cooked", label: "Cooked" },
  { key: "chilled", label: "Chilled" },
  { key: "frozen", label: "Frozen" },
  { key: "fridge", label: "Fridge" },
  { key: "freezer", label: "Freezer" },
  { key: "delivery", label: "Delivery" },
];

function normaliseDraft(initial: RoutineDraft | null): RoutineDraft {
  if (!initial) {
    return {
      name: "",
      active: true,
      items: [],
    };
  }

  const sorted = [...(initial.items ?? [])]
    .map((it, idx) => ({
      ...it,
      position: it.position ?? idx + 1,
      location: it.location ?? "",
      item: it.item ?? "",
      target_key: it.target_key || "cooked",
    }))
    .sort((a, b) => a.position - b.position);

  return {
    id: initial.id,
    name: initial.name ?? "",
    active: initial.active ?? true,
    items: sorted,
  };
}

export default function EditRoutineModal({
  open,
  initial,
  onClose,
  onSave,
}: Props) {
  const [draft, setDraft] = useState<RoutineDraft>(() =>
    normaliseDraft(initial)
  );
  const [saving, setSaving] = useState(false);

  // Reset when opening / initial changes
  useEffect(() => {
    if (!open) return;
    setDraft(normaliseDraft(initial));
    setSaving(false);
  }, [open, initial]);

  if (!open) return null;

  const items = draft.items;

  const updateItem = (index: number, patch: Partial<RoutineItemDraft>) => {
    setDraft((d) => {
      const copy = [...d.items];
      copy[index] = { ...copy[index], ...patch };
      return { ...d, items: copy };
    });
  };

  const addItem = () => {
    setDraft((d) => {
      const nextPos =
        d.items.length === 0
          ? 1
          : Math.max(...d.items.map((i) => i.position || 0)) + 1;
      return {
        ...d,
        items: [
          ...d.items,
          {
            position: nextPos,
            location: "",
            item: "",
            target_key: "cooked",
          },
        ],
      };
    });
  };

  const removeItem = (index: number) => {
    setDraft((d) => {
      const copy = d.items.filter((_, i) => i !== index);
      const renumbered = copy.map((it, idx) => ({
        ...it,
        position: idx + 1,
      }));
      return { ...d, items: renumbered };
    });
  };

  const moveItem = (index: number, dir: -1 | 1) => {
    setDraft((d) => {
      const copy = [...d.items];
      const newIndex = index + dir;
      if (newIndex < 0 || newIndex >= copy.length) return d;
      const [row] = copy.splice(index, 1);
      copy.splice(newIndex, 0, row);
      const renumbered = copy.map((it, idx) => ({
        ...it,
        position: idx + 1,
      }));
      return { ...d, items: renumbered };
    });
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!draft.name.trim()) return;
    setSaving(true);
    try {
      const cleaned: RoutineDraft = {
        ...draft,
        name: draft.name.trim(),
        items: draft.items.map((it, idx) => ({
          ...it,
          position: idx + 1,
          location: (it.location ?? "").trim() || null,
          item: (it.item ?? "").trim() || null,
          target_key: it.target_key || "cooked",
        })),
      };
      await onSave(cleaned);
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 overflow-y-auto overscroll-contain"
      onClick={onClose}
    >
      <form
        onSubmit={handleSubmit}
        onClick={(e) => e.stopPropagation()}
        className="mt-4 mb-4 flex w-full max-w-3xl max-h-[90vh] flex-col overflow-hidden rounded-2xl bg-white shadow-xl"
      >
        {/* Header – styled to match Run routine modal */}
        <div className="flex items-center justify-between border-b bg-slate-900 px-4 py-3 text-white">
          <div className="text-base font-semibold">Edit routine</div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-white/30 bg-white/10 px-3 py-1.5 text-sm font-medium hover:bg-white/20"
          >
            Close
          </button>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-4">
          {/* Routine name + active toggle */}
          <div className="flex flex-wrap items-center gap-3">
            <label className="flex-1 min-w-[180px] text-sm">
              <div className="mb-1 text-gray-600">Routine name</div>
              <input
                className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm"
                value={draft.name}
                onChange={(e) =>
                  setDraft((d) => ({ ...d, name: e.target.value }))
                }
                placeholder="e.g., Cooking checks"
                required
              />
            </label>
            <label className="inline-flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-gray-300"
                checked={draft.active}
                onChange={(e) =>
                  setDraft((d) => ({ ...d, active: e.target.checked }))
                }
              />
              <span>Active</span>
            </label>
          </div>

          {/* Items header + add button */}
          <div className="flex items-center justify-between">
            <div className="text-sm font-semibold">Items</div>
            <button
              type="button"
              onClick={addItem}
              className="rounded-xl border border-gray-300 px-3 py-1.5 text-xs font-medium hover:bg-gray-50"
            >
              + Add item
            </button>
          </div>

          {/* Items list */}
          {items.length === 0 ? (
            <div className="rounded-xl border border-dashed border-gray-300 p-3 text-sm text-gray-500">
              No items yet. Tap “Add item” to start building this routine.
            </div>
          ) : (
            <div className="space-y-3">
              {items.map((it, idx) => {
                const currentKey = it.target_key || "cooked";
                const known = TARGET_OPTIONS.some((t) => t.key === currentKey);
                const options = known
                  ? TARGET_OPTIONS
                  : [
                      ...TARGET_OPTIONS,
                      { key: currentKey, label: currentKey || "Custom" },
                    ];

                return (
                  <div
                    key={idx}
                    className="space-y-2 rounded-xl border border-gray-300 p-3"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="text-xs font-semibold text-gray-500">
                        #{idx + 1}
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          className="rounded-full border border-gray-300 px-2 py-0.5 text-xs hover:bg-gray-50 disabled:opacity-40"
                          disabled={idx === 0}
                          onClick={() => moveItem(idx, -1)}
                        >
                          ↑
                        </button>
                        <button
                          type="button"
                          className="rounded-full border border-gray-300 px-2 py-0.5 text-xs hover:bg-gray-50 disabled:opacity-40"
                          disabled={idx === items.length - 1}
                          onClick={() => moveItem(idx, +1)}
                        >
                          ↓
                        </button>
                        <button
                          type="button"
                          className="ml-2 rounded-full border border-red-200 px-2 py-0.5 text-xs text-red-700 hover:bg-red-50"
                          onClick={() => removeItem(idx)}
                        >
                          Remove
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                      <label className="text-xs sm:text-sm">
                        <div className="mb-1 text-gray-600">Location</div>
                        <input
                          className="w-full rounded-xl border border-gray-300 px-2 py-1.5 text-sm"
                          value={it.location ?? ""}
                          onChange={(e) =>
                            updateItem(idx, { location: e.target.value })
                          }
                        />
                      </label>
                      <label className="text-xs sm:text-sm">
                        <div className="mb-1 text-gray-600">Item</div>
                        <input
                          className="w-full rounded-xl border border-gray-300 px-2 py-1.5 text-sm"
                          value={it.item ?? ""}
                          onChange={(e) =>
                            updateItem(idx, { item: e.target.value })
                          }
                        />
                      </label>
                      <label className="text-xs sm:text-sm">
                        <div className="mb-1 text-gray-600">Target</div>
                        <select
                          className="w-full rounded-xl border border-gray-300 px-2 py-1.5 text-sm"
                          value={currentKey}
                          onChange={(e) =>
                            updateItem(idx, { target_key: e.target.value })
                          }
                        >
                          {options.map((opt) => (
                            <option key={opt.key} value={opt.key}>
                              {opt.label}
                            </option>
                          ))}
                        </select>
                      </label>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer (stays visible) */}
        <div className="flex items-center justify-end gap-2 border-t bg-gray-50 px-4 py-3">
          <button
            type="button"
            className="rounded-md px-3 py-1.5 text-sm hover:bg-white"
            onClick={onClose}
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="rounded-xl bg-black px-4 py-1.5 text-sm font-medium text-white hover:bg-gray-900 disabled:opacity-60"
          >
            {saving ? "Saving…" : "Save routine"}
          </button>
        </div>
      </form>
    </div>
  );
}

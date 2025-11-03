// src/components/EditRoutineModal.tsx
"use client";

import React, { useEffect, useState } from "react";
import { TARGET_PRESETS } from "@/lib/temp-constants";

export type RoutineItemDraft = {
  id?: string;               // existing DB id (optional when creating)
  position: number;          // 1, 2, 3...
  location: string | null;
  item: string | null;
  target_key: string;        // e.g. "chill", "cooked", etc.
};

export type RoutineDraft = {
  id?: string;               // routine id when editing
  name: string;
  active: boolean;
  items: RoutineItemDraft[];
};

type Props = {
  open: boolean;
  initial: RoutineDraft | null;              // null = create new
  onClose: () => void;
  onSave: (draft: RoutineDraft) => Promise<void> | void;
};

const firstTargetKey = TARGET_PRESETS[0]?.key ?? "chill";

function makeBlankItem(position: number): RoutineItemDraft {
  return {
    position,
    location: null,
    item: null,
    target_key: firstTargetKey,
  };
}

export default function EditRoutineModal({
  open,
  initial,
  onClose,
  onSave,
}: Props) {
  const [draft, setDraft] = useState<RoutineDraft>({
    id: undefined,
    name: "",
    active: true,
    items: [makeBlankItem(1)],
  });
  const [saving, setSaving] = useState(false);

  // Hydrate local draft when modal opens or initial changes
  useEffect(() => {
    if (!open) return;

    if (initial) {
      // Deep copy to avoid mutating parent’s state
      const copied: RoutineDraft = {
        id: initial.id,
        name: initial.name,
        active: initial.active,
        items: [...initial.items]
          .map((it, idx) => ({
            id: it.id,
            position: typeof it.position === "number" ? it.position : idx + 1,
            location: it.location ?? null,
            item: it.item ?? null,
            target_key: it.target_key || firstTargetKey,
          }))
          .sort((a, b) => a.position - b.position),
      };
      setDraft(copied);
    } else {
      setDraft({
        id: undefined,
        name: "",
        active: true,
        items: [makeBlankItem(1)],
      });
    }
  }, [open, initial]);

  if (!open) return null;

  function updateItem(idx: number, patch: Partial<RoutineItemDraft>) {
    setDraft((d) => {
      const items = [...d.items];
      const current = items[idx];
      if (!current) return d;
      items[idx] = { ...current, ...patch };
      return { ...d, items };
    });
  }

  function addRow() {
    setDraft((d) => {
      const nextPos = d.items.length ? d.items.length + 1 : 1;
      return {
        ...d,
        items: [...d.items, makeBlankItem(nextPos)],
      };
    });
  }

  function removeRow(idx: number) {
    setDraft((d) => {
      const items = d.items.filter((_, i) => i !== idx);
      // Re-position from 1..n
      const rePos = items.map((it, i) => ({ ...it, position: i + 1 }));
      return { ...d, items: rePos.length ? rePos : [makeBlankItem(1)] };
    });
  }

  function moveRow(idx: number, dir: -1 | 1) {
    setDraft((d) => {
      const items = [...d.items];
      const target = idx + dir;
      if (target < 0 || target >= items.length) return d;
      const tmp = items[idx];
      items[idx] = items[target];
      items[target] = tmp;
      // Fix positions
      const rePos = items.map((it, i) => ({ ...it, position: i + 1 }));
      return { ...d, items: rePos };
    });
  }

  async function handleSubmit(e?: React.FormEvent) {
    e?.preventDefault();
    const trimmedName = draft.name.trim();
    if (!trimmedName) return;

    // Normalise items: remove totally empty rows, reindex positions
    const cleanedItems = draft.items
      .map((it) => ({
        ...it,
        location: (it.location ?? "").toString().trim() || null,
        item: (it.item ?? "").toString().trim() || null,
        target_key: it.target_key || firstTargetKey,
      }))
      .filter((it) => it.location || it.item); // keep only rows with some content

    const finalDraft: RoutineDraft = {
      ...draft,
      name: trimmedName,
      items: cleanedItems.map((it, idx) => ({
        ...it,
        position: idx + 1,
      })),
    };

    setSaving(true);
    try {
      await onSave(finalDraft);
      onClose();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 bg-black/30"
      onClick={onClose}
    >
      <form
        onSubmit={handleSubmit}
        onClick={(e) => e.stopPropagation()}
        className="mx-auto mt-6 flex h-[80vh] w-full max-w-3xl flex-col overflow-hidden rounded-t-2xl border bg-white shadow sm:mt-16 sm:h-[75vh] sm:rounded-2xl"
      >
        {/* Sticky header */}
        <div className="sticky top-0 z-10 border-b bg-white px-4 py-3">
          <div className="flex items-center justify-between gap-2">
            <div>
              <div className="text-sm font-semibold">
                {draft.id ? "Edit routine" : "New routine"}
              </div>
              <div className="text-xs text-gray-500">
                Configure locations, items, and targets for quick logging
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-md px-3 py-1.5 text-sm hover:bg-gray-50"
            >
              Close
            </button>
          </div>
        </div>

        {/* Scrollable body */}
        <div className="grow overflow-y-auto px-4 py-3 space-y-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <label className="text-sm">
              <div className="mb-1 text-gray-700">Routine name</div>
              <input
                className="w-full rounded-xl border border-gray-300 px-2 py-1.5 text-sm"
                value={draft.name}
                onChange={(e) =>
                  setDraft((d) => ({ ...d, name: e.target.value }))
                }
                placeholder="e.g. Morning hot hold"
                required
              />
            </label>
            <label className="mt-2 flex items-center gap-2 text-sm sm:mt-6">
              <input
                type="checkbox"
                checked={draft.active}
                onChange={(e) =>
                  setDraft((d) => ({ ...d, active: e.target.checked }))
                }
              />
              <span className="text-gray-700">Active</span>
            </label>
          </div>

          <div className="flex items-center justify-between">
            <div className="text-sm font-semibold">Routine items</div>
            <button
              type="button"
              onClick={addRow}
              className="rounded-xl border border-gray-300 px-3 py-1.5 text-xs font-medium hover:bg-gray-50"
            >
              + Add row
            </button>
          </div>

          <div className="overflow-x-auto rounded-lg border border-gray-200">
            <table className="min-w-[640px] w-full text-sm">
              <thead className="bg-gray-50 text-gray-600">
                <tr>
                  <th className="px-2 py-2 text-left w-10">#</th>
                  <th className="px-2 py-2 text-left w-32">Location</th>
                  <th className="px-2 py-2 text-left w-40">Item</th>
                  <th className="px-2 py-2 text-left w-40">Target</th>
                  <th className="px-2 py-2 text-right w-32">Actions</th>
                </tr>
              </thead>
              <tbody>
                {draft.items.map((it, idx) => (
                  <tr key={it.id ?? `row-${idx}`} className="border-t">
                    <td className="px-2 py-2 align-top">{idx + 1}</td>
                    <td className="px-2 py-2 align-top">
                      <input
                        className="w-full rounded-xl border border-gray-300 px-2 py-1 text-xs"
                        value={it.location ?? ""}
                        onChange={(e) =>
                          updateItem(idx, { location: e.target.value })
                        }
                        placeholder="e.g. Fridge 1"
                      />
                    </td>
                    <td className="px-2 py-2 align-top">
                      <input
                        className="w-full rounded-xl border border-gray-300 px-2 py-1 text-xs"
                        value={it.item ?? ""}
                        onChange={(e) =>
                          updateItem(idx, { item: e.target.value })
                        }
                        placeholder="e.g. Chicken curry"
                      />
                    </td>
                    <td className="px-2 py-2 align-top">
                      <select
                        className="w-full rounded-xl border border-gray-300 px-2 py-1 text-xs"
                        value={it.target_key}
                        onChange={(e) =>
                          updateItem(idx, { target_key: e.target.value })
                        }
                      >
                        {TARGET_PRESETS.map((p) => (
                          <option key={p.key} value={p.key}>
                            {p.label}
                            {p.minC != null || p.maxC != null
                              ? ` (${p.minC ?? "−∞"}–${
                                  p.maxC ?? "+∞"
                                } °C)`
                              : ""}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="px-2 py-2 align-top text-right">
                      <div className="inline-flex items-center gap-1">
                        <button
                          type="button"
                          className="rounded-md border border-gray-300 px-2 py-0.5 text-[11px] hover:bg-gray-50"
                          onClick={() => moveRow(idx, -1)}
                          disabled={idx === 0}
                          title="Move up"
                        >
                          ↑
                        </button>
                        <button
                          type="button"
                          className="rounded-md border border-gray-300 px-2 py-0.5 text-[11px] hover:bg-gray-50"
                          onClick={() => moveRow(idx, 1)}
                          disabled={idx === draft.items.length - 1}
                          title="Move down"
                        >
                          ↓
                        </button>
                        <button
                          type="button"
                          className="rounded-md border border-red-200 px-2 py-0.5 text-[11px] text-red-700 hover:bg-red-50"
                          onClick={() => removeRow(idx)}
                          title="Delete row"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {draft.items.length === 0 && (
                  <tr>
                    <td
                      colSpan={5}
                      className="px-3 py-4 text-center text-xs text-gray-500"
                    >
                      No items. Add a row to start building this routine.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <p className="text-xs text-gray-500">
            Routines are reusable checklists for fast temperature logging. You
            can manage them from the routines page.
          </p>
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
            disabled={saving}
            className="rounded-xl bg-black px-3 py-1.5 text-sm font-medium text-white hover:bg-gray-900 disabled:opacity-60"
          >
            {saving ? "Saving…" : "Save routine"}
          </button>
        </div>
      </form>
    </div>
  );
}

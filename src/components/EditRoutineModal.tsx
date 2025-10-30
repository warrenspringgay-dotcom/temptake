"use client";

import React, { useEffect, useMemo, useState } from "react";
import { TARGET_PRESETS } from "@/lib/temp-constants";

/* ======================== Types ========================= */

export type RoutineItemDraft = {
  id: string;
  position: number;
  location: string;
  item: string;
  target_key: string; // key from TARGET_PRESETS
};

export type RoutineDraft = {
  id?: string; // present when editing an existing routine
  name: string;
  active: boolean;
  items: RoutineItemDraft[];
};

/* ======================== Props ========================= */

type Props = {
  open: boolean;
  initial: RoutineDraft | null; // null = creating new
  onClose: () => void;
  onSave: (draft: RoutineDraft) => void | Promise<void>;
};

/* ==================== Component ========================= */

export default function EditRoutineModal({ open, initial, onClose, onSave }: Props) {
  const [draft, setDraft] = useState<RoutineDraft | null>(null);
  const [saving, setSaving] = useState(false);

  // Prevent background scroll when open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
  }, [open]);

  // Seed local draft whenever the modal is opened / initial changes
  useEffect(() => {
    if (!open) return;
    const seeded: RoutineDraft =
      initial ?? {
        name: "",
        active: true,
        items: [],
      };
    // Ensure items sorted and positions normalized
    seeded.items = [...(seeded.items ?? [])]
      .sort((a, b) => a.position - b.position)
      .map((it, idx) => ({ ...it, position: idx + 1 }));
    setDraft(seeded);
  }, [open, initial]);

  const targetOptions = useMemo(() => TARGET_PRESETS.map((t) => ({ key: t.key, label: t.label })), []);

  if (!open || !draft) return null;

  /* ==================== Handlers ==================== */

  const addRow = () => {
    const lastPos = draft.items.length ? draft.items[draft.items.length - 1].position : 0;
    const next: RoutineItemDraft = {
      id: crypto.randomUUID(),
      position: lastPos + 1,
      location: "",
      item: "",
      target_key: targetOptions[0]?.key ?? "chill",
    };
    setDraft((d) => ({ ...d!, items: [...d!.items, next] }));
  };

  const removeRow = (id: string) => {
    setDraft((d) => {
      const items = d!.items.filter((x) => x.id !== id).map((x, i) => ({ ...x, position: i + 1 }));
      return { ...d!, items };
    });
  };

  const updateRow = (id: string, patch: Partial<RoutineItemDraft>) => {
    setDraft((d) => ({
      ...d!,
      items: d!.items
        .map((x) => (x.id === id ? { ...x, ...patch } : x))
        .sort((a, b) => a.position - b.position)
        .map((x, i) => ({ ...x, position: i + 1 })),
    }));
  };

  const moveRow = (id: string, dir: -1 | 1) => {
    setDraft((d) => {
      const idx = d!.items.findIndex((x) => x.id === id);
      if (idx < 0) return d!;
      const j = idx + dir;
      if (j < 0 || j >= d!.items.length) return d!;
      const clone = [...d!.items];
      [clone[idx], clone[j]] = [clone[j], clone[idx]];
      return {
        ...d!,
        items: clone.map((x, i) => ({ ...x, position: i + 1 })),
      };
    });
  };

  const canSave =
    draft.name.trim().length > 0 &&
    draft.items.length > 0 &&
    draft.items.every((it) => it.item.trim().length > 0);

  const handleSave = async () => {
    if (!canSave) return;
    try {
      setSaving(true);
      await onSave({ ...draft, items: draft.items.map((i, idx) => ({ ...i, position: idx + 1 })) });
      onClose();
    } finally {
      setSaving(false);
    }
  };

  /* ====================== UI ======================== */

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-3" onClick={onClose}>
      {/* Panel */}
      <div
        className="flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border bg-white shadow-xl"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        {/* Sticky header */}
        <div className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b bg-white/95 px-4 py-3 backdrop-blur supports-[backdrop-filter]:bg-white/75">
          <div className="flex min-w-0 grow items-center gap-3">
            <input
              className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm font-medium"
              placeholder="Routine name"
              value={draft.name}
              onChange={(e) => setDraft((d) => ({ ...d!, name: e.target.value }))}
            />
            <label className="flex items-center gap-2 text-sm whitespace-nowrap">
              <input
                type="checkbox"
                checked={!!draft.active}
                onChange={(e) => setDraft((d) => ({ ...d!, active: e.target.checked }))}
              />
              Active
            </label>
          </div>
          <button
            type="button"
            className="rounded-md px-3 py-1.5 text-sm hover:bg-gray-50"
            onClick={onClose}
          >
            Close
          </button>
        </div>

        {/* Scrollable content */}
        <div className="grow overflow-y-auto px-4 py-3 space-y-3">
          {draft.items.length === 0 && (
            <div className="rounded-md border border-dashed px-3 py-8 text-center text-sm text-gray-500">
              No items yet. Add your first check below.
            </div>
          )}

          {draft.items.map((it, idx) => (
            <div key={it.id} className="rounded-lg border p-3">
              <div className="mb-2 flex items-center justify-between">
                <div className="text-xs font-medium text-gray-500">#{idx + 1}</div>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    className="rounded-md px-2 py-1 text-xs hover:bg-gray-100 disabled:opacity-40"
                    onClick={() => moveRow(it.id, -1)}
                    disabled={idx === 0}
                    title="Move up"
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    className="rounded-md px-2 py-1 text-xs hover:bg-gray-100 disabled:opacity-40"
                    onClick={() => moveRow(it.id, +1)}
                    disabled={idx === draft.items.length - 1}
                    title="Move down"
                  >
                    ↓
                  </button>
                  <button
                    type="button"
                    className="rounded-md px-2 py-1 text-xs text-red-700 hover:bg-red-50"
                    onClick={() => removeRow(it.id)}
                    title="Remove"
                  >
                    Remove
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <div>
                  <label className="mb-1 block text-xs text-gray-500">Location</label>
                  <input
                    className="h-10 w-full rounded-xl border px-3"
                    value={it.location}
                    onChange={(e) => updateRow(it.id, { location: e.target.value })}
                    placeholder="e.g., Kitchen"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs text-gray-500">Item</label>
                  <input
                    className="h-10 w-full rounded-xl border px-3"
                    value={it.item}
                    onChange={(e) => updateRow(it.id, { item: e.target.value })}
                    placeholder="e.g., Chicken curry"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs text-gray-500">Target</label>
                  <select
                    className="h-10 w-full rounded-xl border px-3"
                    value={it.target_key}
                    onChange={(e) => updateRow(it.id, { target_key: e.target.value })}
                  >
                    {targetOptions.map((t) => (
                      <option key={t.key} value={t.key}>
                        {t.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          ))}

          <div>
            <button
              type="button"
              onClick={addRow}
              className="rounded-xl border px-3 py-2 text-sm hover:bg-gray-50"
            >
              + Add item
            </button>
          </div>
        </div>

        {/* Sticky footer */}
        <div className="sticky bottom-0 z-10 flex items-center justify-end gap-2 border-t bg-white/95 px-4 py-3 backdrop-blur supports-[backdrop-filter]:bg-white/75">
          <button
            type="button"
            className="rounded-md px-3 py-1.5 text-sm hover:bg-gray-50"
            onClick={onClose}
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={!canSave || saving}
            onClick={handleSave}
            className={`rounded-xl px-3 py-1.5 text-sm font-medium text-white ${
              !canSave || saving ? "bg-gray-400" : "bg-black hover:bg-gray-800"
            }`}
          >
            {saving ? "Saving…" : "Save routine"}
          </button>
        </div>
      </div>
    </div>
  );
}

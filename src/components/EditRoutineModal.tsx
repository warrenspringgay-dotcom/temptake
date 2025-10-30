"use client";

import React, { useEffect, useMemo, useState } from "react";
import { TARGET_PRESETS } from "@/lib/temp-constants";

/** Exported types so other files can import them */
export type RoutineItemDraft = {
  id: string;
  position: number;
  location: string | null;
  item: string | null;
  target_key: string | null;
};
export type RoutineDraft = {
  id?: string;
  name: string;
  active: boolean;
  items: RoutineItemDraft[];
};

type Props = {
  open: boolean;
  initial: RoutineDraft | null;
  onClose: () => void;
  onSave: (draft: RoutineDraft) => void;
};

function nextPos(items: RoutineItemDraft[]) {
  return (items.at(-1)?.position ?? 0) + 1;
}

export default function EditRoutineModal({ open, initial, onClose, onSave }: Props) {
  const targetOptions = useMemo(() => TARGET_PRESETS, []);
  const [draft, setDraft] = useState<RoutineDraft | null>(null);

  useEffect(() => {
    if (!open) return;
    setDraft(
      initial ?? {
        name: "",
        active: true,
        items: [],
      }
    );
  }, [open, initial]);

  if (!open || !draft) return null;

  const addLine = () => {
    const it: RoutineItemDraft = {
      id: crypto.randomUUID(),
      position: nextPos(draft.items),
      location: "",
      item: "",
      target_key: targetOptions[0]?.key ?? "chill",
    };
    setDraft((d) => ({ ...(d as RoutineDraft), items: [...(d!.items || []), it] }));
  };

  const removeLine = (id: string) => {
    setDraft((d) => ({
      ...(d as RoutineDraft),
      items: (d!.items || [])
        .filter((x) => x.id !== id)
        .map((x, i) => ({ ...x, position: i + 1 })),
    }));
  };

  const updateItem = (id: string, patch: Partial<RoutineItemDraft>) => {
    setDraft((d) => ({
      ...(d as RoutineDraft),
      items: (d!.items || []).map((x) => (x.id === id ? { ...x, ...patch } : x)),
    }));
  };

  const save = (e?: React.FormEvent) => {
    e?.preventDefault();
    onSave(draft);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/30" onClick={onClose}>
      <form
        onSubmit={save}
        className="mx-auto mt-4 flex h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-t-2xl border bg-white shadow sm:mt-16 sm:h-[85vh] sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Sticky header */}
        <div className="sticky top-0 z-10 flex items-center justify-between border-b bg-white px-4 py-3">
          <div className="text-base font-semibold">Edit routine</div>
          <div className="flex items-center gap-3">
            <label className="inline-flex select-none items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={draft.active}
                onChange={(e) =>
                  setDraft((d) => ({ ...(d as RoutineDraft), active: e.target.checked }))
                }
              />
              Active
            </label>
            <button
              type="button"
              className="rounded-md px-2 py-1 text-sm hover:bg-gray-100"
              onClick={onClose}
              aria-label="Close"
              title="Close"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Scrollable body */}
        <div className="grow overflow-y-auto px-4 py-3">
          <label className="block text-sm">
            <div className="mb-1 text-gray-600">Name</div>
            <input
              className="w-full rounded-xl border px-2 py-1.5"
              value={draft.name}
              onChange={(e) =>
                setDraft((d) => ({ ...(d as RoutineDraft), name: e.target.value }))
              }
              placeholder="e.g., Cooking"
              required
            />
          </label>

          <div className="mt-3 flex items-center justify-between">
            <div className="text-sm font-medium">Items</div>
            <button
              type="button"
              onClick={addLine}
              className="rounded-xl border px-2 py-1 text-sm hover:bg-gray-50"
            >
              + Add item
            </button>
          </div>

          <div className="mt-2 space-y-3">
            {(draft.items || []).map((it) => (
              <div key={it.id} className="rounded-xl border p-3">
                <div className="mb-2 text-xs text-gray-500">#{it.position}</div>

                <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                  <input
                    className="rounded-xl border px-2 py-1.5"
                    placeholder="Location (e.g., Kitchen)"
                    value={it.location ?? ""}
                    onChange={(e) => updateItem(it.id, { location: e.target.value })}
                  />
                  <input
                    className="rounded-xl border px-2 py-1.5"
                    placeholder="Item (e.g., Chicken)"
                    value={it.item ?? ""}
                    onChange={(e) => updateItem(it.id, { item: e.target.value })}
                  />
                  <select
                    className="rounded-xl border px-2 py-1.5"
                    value={it.target_key ?? targetOptions[0]?.key}
                    onChange={(e) => updateItem(it.id, { target_key: e.target.value })}
                  >
                    {targetOptions.map((p) => (
                      <option key={p.key} value={p.key}>
                        {p.label}
                        {p.minC != null || p.maxC != null
                          ? ` (${p.minC ?? "−∞"}–${p.maxC ?? "+∞"} °C)`
                          : ""}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="mt-2">
                  <button
                    type="button"
                    className="w-full rounded-xl border px-3 py-1.5 text-sm hover:bg-gray-50"
                    onClick={() => removeLine(it.id)}
                  >
                    Remove
                  </button>
                </div>
              </div>
            ))}

            {(draft.items || []).length === 0 && (
              <div className="rounded-md border border-dashed p-4 text-sm text-gray-600">
                No items yet. Click <span className="font-medium">+ Add item</span> to start.
              </div>
            )}
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
            className="rounded-xl bg-black px-3 py-1.5 text-sm font-medium text-white hover:bg-gray-900"
          >
            Save
          </button>
        </div>
      </form>
    </div>
  );
}

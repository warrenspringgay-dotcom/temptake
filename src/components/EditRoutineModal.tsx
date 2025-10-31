"use client";

import React, { useEffect, useMemo, useState } from "react";
import { TARGET_PRESETS } from "@/lib/temp-constants";

export type RoutineItemDraft = {
  id: string;
  position: number;
  location: string;
  item: string;
  target_key: string;
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
  onSave: (draft: RoutineDraft) => Promise<void> | void;
};

export default function EditRoutineModal({ open, initial, onClose, onSave }: Props) {
  const [draft, setDraft] = useState<RoutineDraft | null>(initial);
  useEffect(() => setDraft(initial), [initial]);

  const targetOptions = useMemo(() => TARGET_PRESETS, []);

  if (!open || !draft) return null;

  function addItem() {
    setDraft((d) => {
      if (!d) return d;
      const nextPos = (d.items.at(-1)?.position ?? 0) + 1;
      const it: RoutineItemDraft = {
        id: crypto.randomUUID(),
        position: nextPos,
        location: "",
        item: "",
        target_key: targetOptions[0]?.key ?? "chill",
      };
      return { ...d, items: [...d.items, it] };
    });
  }

  function removeItem(id: string) {
    setDraft((d) => (!d ? d : { ...d, items: d.items.filter((i) => i.id !== id) }));
  }

  function updateItem(id: string, patch: Partial<RoutineItemDraft>) {
    setDraft((d) =>
      !d ? d : { ...d, items: d.items.map((i) => (i.id === id ? { ...i, ...patch } : i)) }
    );
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!draft || !draft.name.trim()) {
      alert("Routine name is required.");
      return;
    }
    const prepared: RoutineDraft = {
      ...draft,
      items: draft.items
        .map((i, idx) => ({ ...i, position: idx + 1 }))
        .filter((i) => i.item.trim().length > 0),
    };
    await onSave(prepared);
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/30" onClick={onClose}>
      <form
        onSubmit={submit}
        onClick={(e) => e.stopPropagation()}
        className="mx-auto mt-3 flex h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-t-2xl border bg-white shadow sm:mt-16 sm:h-[80vh] sm:rounded-2xl"
      >
        {/* Sticky header */}
        <div className="sticky top-0 z-10 border-b bg-white px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="text-base font-semibold">Edit routine</div>
            <button type="button" className="rounded-md p-2 hover:bg-gray-100" onClick={onClose}>
              ✕
            </button>
          </div>
        </div>

        {/* Scrollable body */}
        <div className="grow overflow-y-auto px-4 py-3 space-y-3">
          <div className="flex items-center gap-3">
            <input
              className="h-10 w-full rounded-xl border px-3"
              placeholder="Routine name"
              value={draft.name}
              onChange={(e) => setDraft({ ...draft, name: e.target.value })}
            />
            <label className="flex items-center gap-2 text-sm whitespace-nowrap">
              <input
                type="checkbox"
                checked={draft.active}
                onChange={(e) => setDraft({ ...draft, active: e.target.checked })}
              />
              Active
            </label>
          </div>

          {draft.items.map((it, idx) => (
            <div key={it.id} className="rounded-xl border p-3">
              <div className="mb-2 text-xs text-gray-500">#{idx + 1}</div>
              <div className="grid gap-2 sm:grid-cols-2">
                <input
                  className="h-10 w-full rounded-xl border px-3"
                  placeholder="Location"
                  value={it.location}
                  onChange={(e) => updateItem(it.id, { location: e.target.value })}
                />
                <input
                  className="h-10 w-full rounded-xl border px-3"
                  placeholder="Item"
                  value={it.item}
                  onChange={(e) => updateItem(it.id, { item: e.target.value })}
                />
              </div>

              <div className="mt-2 grid gap-2 sm:grid-cols-2">
                <select
                  className="h-10 w-full rounded-xl border px-3"
                  value={it.target_key}
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

                <button
                  type="button"
                  onClick={() => removeItem(it.id)}
                  className="h-10 rounded-xl border px-3 text-sm hover:bg-gray-50"
                >
                  Remove
                </button>
              </div>
            </div>
          ))}

          <button
            type="button"
            onClick={addItem}
            className="rounded-xl border px-3 py-2 text-sm hover:bg-gray-50"
          >
            + Add item
          </button>
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
          <button className="rounded-xl bg-black px-3 py-1.5 text-sm font-medium text-white hover:bg-gray-900">
            Save routine
          </button>
        </div>
      </form>
    </div>
  );
}

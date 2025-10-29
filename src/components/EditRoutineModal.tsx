"use client";

import React, { useEffect, useMemo, useState } from "react";

export type RoutineItemDraft = {
  id?: string;
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
  initial?: RoutineDraft | null;
  onClose: () => void;
  onSave: (draft: RoutineDraft) => Promise<void> | void; // Parent persists to DB
};

export default function EditRoutineModal({ open, initial, onClose, onSave }: Props) {
  const [draft, setDraft] = useState<RoutineDraft>({
    id: undefined,
    name: "",
    active: true,
    items: [],
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    if (initial) {
      // clone to avoid mutating parent object
      setDraft({
        id: initial.id,
        name: initial.name,
        active: initial.active,
        items: [...initial.items].sort((a, b) => a.position - b.position),
      });
    } else {
      setDraft({ id: undefined, name: "", active: true, items: [] });
    }
  }, [open, initial]);

  const nextPosition = useMemo(
    () => (draft.items.length ? Math.max(...draft.items.map((i) => i.position)) + 1 : 1),
    [draft.items]
  );

  function addItem() {
    setDraft((d) => ({
      ...d,
      items: [
        ...d.items,
        { position: nextPosition, location: "", item: "", target_key: "cooked" },
      ],
    }));
  }

  function removeAt(position: number) {
    setDraft((d) => ({
      ...d,
      items: d.items.filter((i) => i.position !== position),
    }));
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!draft.name.trim()) return;
    setSaving(true);
    try {
      await onSave({
        ...draft,
        name: draft.name.trim(),
        items: draft.items
          .map((i, idx) => ({
            ...i,
            position: idx + 1, // reindex tidy
            location: (i.location ?? "").trim() || null,
            item: (i.item ?? "").trim() || null,
            target_key: (i.target_key ?? "cooked") || null,
          }))
          .sort((a, b) => a.position - b.position),
      });
      onClose();
    } finally {
      setSaving(false);
    }
  }

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/40"
      onClick={onClose}
      aria-modal="true"
      role="dialog"
    >
      <form
        onSubmit={handleSave}
        onClick={(e) => e.stopPropagation()}
        className="mx-auto mt-3 flex h-[90vh] w-full max-w-xl flex-col overflow-hidden rounded-t-2xl border bg-white shadow sm:mt-16 sm:h-[80vh] sm:rounded-2xl"
      >
        {/* Sticky header */}
        <div className="sticky top-0 z-10 flex items-center justify-between border-b bg-white px-4 py-3">
          <div className="text-base font-semibold">
            {draft.id ? "Edit routine" : "Add routine"}
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
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <label className="sm:col-span-2 text-sm">
              <div className="mb-1 text-gray-600">Name *</div>
              <input
                autoFocus
                className="w-full rounded-xl border px-3 py-2"
                value={draft.name}
                onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
                required
              />
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={draft.active}
                onChange={(e) => setDraft((d) => ({ ...d, active: e.target.checked }))}
              />
              Active
            </label>
          </div>

          {/* Items */}
          <div className="mt-3">
            <div className="mb-2 flex items-center justify-between">
              <div className="text-sm font-medium">Items</div>
              <button
                type="button"
                onClick={addItem}
                className="rounded-xl border px-3 py-1.5 text-sm hover:bg-gray-50"
              >
                + Add row
              </button>
            </div>

            {draft.items.length === 0 ? (
              <div className="rounded border bg-gray-50 px-3 py-2 text-sm text-gray-600">
                No items yet.
              </div>
            ) : (
              <div className="space-y-3">
                {draft.items.map((it) => (
                  <div
                    key={it.position}
                    className="grid grid-cols-1 gap-2 rounded-xl border p-3 sm:grid-cols-4"
                  >
                    <div className="text-xs font-medium text-gray-500 sm:col-span-4">
                      #{it.position}
                    </div>

                    <input
                      className="h-10 w-full rounded-xl border px-3"
                      placeholder="Location (e.g., Kitchen)"
                      value={it.location ?? ""}
                      onChange={(e) =>
                        setDraft((d) => ({
                          ...d,
                          items: d.items.map((x) =>
                            x.position === it.position ? { ...x, location: e.target.value } : x
                          ),
                        }))
                      }
                    />

                    <input
                      className="h-10 w-full rounded-xl border px-3"
                      placeholder="Item (e.g., Chicken)"
                      value={it.item ?? ""}
                      onChange={(e) =>
                        setDraft((d) => ({
                          ...d,
                          items: d.items.map((x) =>
                            x.position === it.position ? { ...x, item: e.target.value } : x
                          ),
                        }))
                      }
                    />

                    <select
                      className="h-10 w-full rounded-xl border px-3"
                      value={it.target_key ?? "cooked"}
                      onChange={(e) =>
                        setDraft((d) => ({
                          ...d,
                          items: d.items.map((x) =>
                            x.position === it.position ? { ...x, target_key: e.target.value } : x
                          ),
                        }))
                      }
                    >
                      <option value="chill">Chill</option>
                      <option value="cooked">Cooked</option>
                      <option value="hot_hold">Hot Hold</option>
                      <option value="delivery">Delivery</option>
                    </select>

                    <button
                      type="button"
                      onClick={() => removeAt(it.position)}
                      className="h-10 rounded-xl border px-3 text-sm hover:bg-gray-50"
                    >
                      Remove
                    </button>
                  </div>
                ))}
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
            disabled={saving || !draft.name.trim()}
            className="rounded-xl bg-black px-3 py-1.5 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-60"
          >
            {saving ? "Saving…" : "Save"}
          </button>
        </div>
      </form>
    </div>
  );
}

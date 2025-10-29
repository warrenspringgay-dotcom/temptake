"use client";

import React from "react";
import { X } from "lucide-react";

/* ===================== Types (exported) ===================== */
export type RoutineItemDraft = {
  id?: string;
  position: number;
  location: string | null;
  item: string | null;
  target_key: string; // e.g., "chill", "cook", etc.
};

export type RoutineDraft = {
  id?: string;
  name: string;
  active: boolean;
  items: RoutineItemDraft[];
};

/* ===================== Props ===================== */
type Props = {
  open: boolean;
  draft: RoutineDraft | null;
  onChange: (next: RoutineDraft) => void;
  onSave: () => void;
  onClose: () => void;
  targetOptions?: { key: string; label: string }[];
};

/* ===================== Component ===================== */
export default function EditRoutineModal({
  open,
  draft,
  onChange,
  onSave,
  onClose,
  targetOptions = [
    { key: "chill", label: "Chilled (≤ 8°C)" },
    { key: "cook", label: "Cooked (≥ 75°C)" },
    { key: "hot-hold", label: "Hot hold (≥ 63°C)" },
    { key: "freeze", label: "Frozen (≤ −18°C)" },
  ],
}: Props) {
  if (!open || !draft) return null;

  const update = <K extends keyof RoutineDraft>(key: K, value: RoutineDraft[K]) =>
    onChange({ ...draft, [key]: value });

  /* ---------- Handlers ---------- */
  function addItem() {
    if (!draft) return;

    const lastPos = (draft.items?.[draft.items.length - 1]?.position ?? 0) + 1;

    const next: RoutineItemDraft = {
      id: crypto.randomUUID(),
      position: lastPos,
      location: "",
      item: "",
      target_key: targetOptions[0]?.key ?? "chill",
    };

    update("items", [...draft.items, next]);
  }

  function removeItem(id?: string) {
    if (!draft) return;

    const updated = draft.items
      .filter((it) => it.id !== id)
      .map((it, i) => ({ ...it, position: i + 1 }));

    update("items", updated);
  }

  function moveItem(id?: string, dir: -1 | 1 = 1) {
    if (!draft) return;
    const idx = draft.items.findIndex((it) => it.id === id);
    if (idx < 0) return;

    const j = idx + dir;
    if (j < 0 || j >= draft.items.length) return;

    const copy = [...draft.items];
    const [row] = copy.splice(idx, 1);
    copy.splice(j, 0, row);

    const rePos = copy.map((it, k) => ({ ...it, position: k + 1 }));
    update("items", rePos);
  }

  /* ---------- Render ---------- */
  return (
    <div className="fixed inset-0 z-50 bg-black/40" onClick={onClose}>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          onSave();
        }}
        onClick={(e) => e.stopPropagation()}
        className="mx-auto mt-3 flex h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-t-2xl border bg-white shadow sm:mt-10 sm:h-[85vh] sm:rounded-2xl"
      >
        {/* Sticky header */}
        <div className="sticky top-0 z-10 flex items-center justify-between border-b bg-white px-4 py-3">
          <div className="text-base font-semibold">Edit routine</div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-2 text-gray-600 hover:bg-gray-100"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Scrollable content */}
        <div className="grow overflow-y-auto px-4 py-3">
          <div className="mb-4 grid grid-cols-1 items-center gap-3 sm:grid-cols-3">
            <label className="sm:col-span-2">
              <div className="mb-1 text-xs text-gray-500">Name</div>
              <input
                className="h-10 w-full rounded-xl border px-3"
                value={draft.name}
                onChange={(e) => update("name", e.target.value)}
                placeholder="e.g., Cooking Routine"
                required
              />
            </label>

            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={!!draft.active}
                onChange={(e) => update("active", e.target.checked)}
              />
              Active
            </label>
          </div>

          {/* Items list */}
          <div className="space-y-3">
            {draft.items.map((it) => (
              <div key={it.id} className="rounded-xl border p-3">
                <div className="mb-2 text-xs font-medium text-gray-500">
                  Step {it.position}
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  <input
                    className="h-10 w-full rounded-xl border px-3"
                    placeholder="Location"
                    value={it.location ?? ""}
                    onChange={(e) =>
                      update(
                        "items",
                        draft.items.map((r) =>
                          r.id === it.id ? { ...r, location: e.target.value } : r
                        )
                      )
                    }
                  />

                  <input
                    className="h-10 w-full rounded-xl border px-3"
                    placeholder="Item"
                    value={it.item ?? ""}
                    onChange={(e) =>
                      update(
                        "items",
                        draft.items.map((r) =>
                          r.id === it.id ? { ...r, item: e.target.value } : r
                        )
                      )
                    }
                  />

                  <select
                    className="h-10 w-full rounded-xl border px-3"
                    value={it.target_key}
                    onChange={(e) =>
                      update(
                        "items",
                        draft.items.map((r) =>
                          r.id === it.id ? { ...r, target_key: e.target.value } : r
                        )
                      )
                    }
                  >
                    {targetOptions.map((opt) => (
                      <option key={opt.key} value={opt.key}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => moveItem(it.id, -1)}
                    className="rounded-md border px-2 py-1 text-xs hover:bg-gray-50"
                  >
                    ↑ Move up
                  </button>
                  <button
                    type="button"
                    onClick={() => moveItem(it.id, 1)}
                    className="rounded-md border px-2 py-1 text-xs hover:bg-gray-50"
                  >
                    ↓ Move down
                  </button>
                  <button
                    type="button"
                    onClick={() => removeItem(it.id)}
                    className="ml-auto rounded-md border px-2 py-1 text-xs text-red-700 hover:bg-red-50"
                  >
                    Remove
                  </button>
                </div>
              </div>
            ))}

            <button
              type="button"
              onClick={addItem}
              className="rounded-xl border px-3 py-1.5 text-sm hover:bg-gray-50"
            >
              + Add step
            </button>
          </div>
        </div>

        {/* Sticky footer */}
        <div className="sticky bottom-0 z-10 flex items-center justify-end gap-2 border-t bg-white px-4 py-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-md px-3 py-1.5 text-sm hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="rounded-xl bg-black px-3 py-1.5 text-sm font-medium text-white hover:bg-gray-900"
          >
            Save routine
          </button>
        </div>
      </form>
    </div>
  );
}

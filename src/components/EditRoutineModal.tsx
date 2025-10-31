"use client";

import React, { useEffect, useState } from "react";
import { TARGET_PRESETS } from "@/lib/temp-constants";

export type RoutineItemDraft = {
  id: string;
  position: number;
  location: string | null;
  item: string | null;
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
  const [draft, setDraft] = useState<RoutineDraft | null>(null);

  useEffect(() => {
    if (!open) return;
    if (initial) setDraft(JSON.parse(JSON.stringify(initial)));
    else
      setDraft({
        name: "",
        active: true,
        items: [],
      });
  }, [open, initial]);

  function addItem() {
    setDraft((d) => {
      const lastPos = d?.items.at(-1)?.position ?? 0;
      const next: RoutineItemDraft = {
        id: crypto.randomUUID(),
        position: lastPos + 1,
        location: "",
        item: "",
        target_key: TARGET_PRESETS[0]?.key ?? "chill",
      };
      return d ? { ...d, items: [...d.items, next] } : d;
    });
  }
  function removeItem(id: string) {
    setDraft((d) => (d ? { ...d, items: d.items.filter((x) => x.id !== id) } : d));
  }
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!draft || !draft.name.trim()) {
      alert("Routine name is required.");
      return;
    }
    await onSave({
      ...draft,
      items: draft.items
        .map((it, idx) => ({ ...it, position: idx + 1 }))
        .filter((it) => (it.item || "").trim().length > 0),
    });
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/30" onClick={onClose}>
      <form
        onSubmit={submit}
        onClick={(e) => e.stopPropagation()}
        className="mx-auto mt-4 flex h-[92vh] w-full max-w-xl flex-col overflow-hidden rounded-2xl border bg-white shadow"
      >
        {/* Sticky header */}
        <div className="sticky top-0 z-10 flex items-center justify-between border-b bg-white px-4 py-3">
          <div className="text-base font-semibold">Edit routine</div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-2 hover:bg-gray-100"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        {/* Scrollable body */}
        <div className="grow overflow-y-auto px-4 py-3">
          <label className="mb-3 block">
            <div className="mb-1 text-xs text-gray-600">Name</div>
            <input
              value={draft?.name || ""}
              onChange={(e) =>
                setDraft((d) => (d ? { ...d, name: e.target.value } : d))
              }
              className="h-11 w-full rounded-xl border px-3"
            />
          </label>

          <label className="mb-4 flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={!!draft?.active}
              onChange={(e) =>
                setDraft((d) => (d ? { ...d, active: e.target.checked } : d))
              }
            />
            Active
          </label>

          {/* Items */}
          <div className="space-y-3">
            {draft?.items.map((it, idx) => (
              <div key={it.id} className="rounded-xl border p-3">
                <div className="mb-2 text-xs font-medium text-gray-600">{idx + 1}</div>
                <div className="grid grid-cols-1 gap-2">
                  <input
                    placeholder="Location"
                    value={it.location || ""}
                    onChange={(e) =>
                      setDraft((d) =>
                        d
                          ? {
                              ...d,
                              items: d.items.map((x) =>
                                x.id === it.id ? { ...x, location: e.target.value } : x
                              ),
                            }
                          : d
                      )
                    }
                    className="h-10 w-full rounded-xl border px-3"
                  />
                  <input
                    placeholder="Item"
                    value={it.item || ""}
                    onChange={(e) =>
                      setDraft((d) =>
                        d
                          ? {
                              ...d,
                              items: d.items.map((x) =>
                                x.id === it.id ? { ...x, item: e.target.value } : x
                              ),
                            }
                          : d
                      )
                    }
                    className="h-10 w-full rounded-xl border px-3"
                  />
                  <select
                    value={it.target_key}
                    onChange={(e) =>
                      setDraft((d) =>
                        d
                          ? {
                              ...d,
                              items: d.items.map((x) =>
                                x.id === it.id ? { ...x, target_key: e.target.value } : x
                              ),
                            }
                          : d
                      )
                    }
                    className="h-10 w-full rounded-xl border px-3"
                  >
                    {TARGET_PRESETS.map((p) => (
                      <option key={p.key} value={p.key}>{p.label}</option>
                    ))}
                  </select>
                </div>

                <div className="mt-2">
                  <button
                    type="button"
                    className="w-full rounded-xl border px-3 py-2 text-sm hover:bg-gray-50"
                    onClick={() => removeItem(it.id)}
                  >
                    Remove
                  </button>
                </div>
              </div>
            ))}

            <button
              type="button"
              onClick={addItem}
              className="w-full rounded-xl border px-3 py-2 text-sm hover:bg-gray-50"
            >
              + Add item
            </button>
          </div>
        </div>

        {/* Sticky footer */}
        <div className="sticky bottom-0 z-10 flex items-center justify-end gap-2 border-t bg-white p-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-md px-3 py-1.5 text-sm hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="rounded-xl bg-black px-4 py-2 text-sm font-medium text-white hover:bg-gray-900"
          >
            Save
          </button>
        </div>
      </form>
    </div>
  );
}

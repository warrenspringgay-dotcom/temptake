"use client";

import React, { useEffect, useMemo, useState } from "react";
import { TARGET_PRESETS } from "@/lib/temp-constants";

export type RoutineItemDraft = {
  id: string;
  position: number;
  location: string;
  item: string;
  target_key: string; // key from TARGET_PRESETS
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

const targetOptions = TARGET_PRESETS;

export default function EditRoutineModal({ open, initial, onClose, onSave }: Props) {
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

  // prevent background scroll while modal is open
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  if (!open) return null;

  function addItem() {
    setDraft((d) => {
      if (!d) return d;
      const pos = (d.items.at(-1)?.position ?? 0) + 1;
      const next: RoutineItemDraft = {
        id: crypto.randomUUID(),
        position: pos,
        location: "",
        item: "",
        target_key: targetOptions[0]?.key ?? "chill",
      };
      return { ...d, items: [...d.items, next] };
    });
  }

  function removeItem(id: string) {
    setDraft((d) => {
      if (!d) return d;
      const items = d.items.filter((i) => i.id !== id).map((i, idx) => ({ ...i, position: idx + 1 }));
      return { ...d, items };
    });
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!draft) return; // guard
    if (!draft.name.trim()) return alert("Routine name is required.");
    await onSave({
      ...draft,
      items: draft.items
        .map((i, idx) => ({ ...i, position: idx + 1 }))
        .filter((i) => i.item.trim().length > 0),
    });
  }

  return (
    <div className="fixed inset-0 z-[100] bg-black/35" onClick={onClose}>
      <form
        onSubmit={submit}
        onClick={(e) => e.stopPropagation()}
        className="mx-auto mt-4 flex h-[94vh] w-full max-w-lg flex-col overflow-hidden rounded-t-2xl border bg-white shadow sm:mt-12 sm:h-[86vh] sm:rounded-2xl"
      >
        {/* Sticky header */}
        <div className="sticky top-0 z-10 flex items-center justify-between border-b bg-white px-4 py-3">
          <div className="text-base font-semibold">Edit routine</div>
          <button type="button" onClick={onClose} className="rounded-md px-2 py-1 hover:bg-gray-100">
            ✕
          </button>
        </div>

        {/* Scrollable content */}
        <div className="grow overflow-y-auto px-4 py-3 space-y-3">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <label className="text-sm">
              <div className="mb-1 text-gray-600">Name</div>
              <input
                className="w-full rounded-xl border px-3 py-2"
                value={draft?.name ?? ""}
                onChange={(e) => setDraft((d) => (d ? { ...d, name: e.target.value } : d))}
                required
              />
            </label>
            <label className="mt-1 flex items-center gap-2 text-sm sm:mt-7">
              <input
                type="checkbox"
                checked={!!draft?.active}
                onChange={(e) => setDraft((d) => (d ? { ...d, active: e.target.checked } : d))}
              />
              Active
            </label>
          </div>

          <div className="mt-2 space-y-2">
            {(draft?.items ?? []).map((it) => (
              <div key={it.id} className="rounded-xl border p-2">
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-4">
                  <input
                    className="rounded-xl border px-2 py-1.5"
                    value={it.position}
                    onChange={(e) =>
                      setDraft((d) =>
                        d
                          ? {
                              ...d,
                              items: d.items.map((x) =>
                                x.id === it.id ? { ...x, position: Number(e.target.value || 1) } : x
                              ),
                            }
                          : d
                      )
                    }
                    inputMode="numeric"
                  />
                  <input
                    className="rounded-xl border px-2 py-1.5"
                    placeholder="Location"
                    value={it.location}
                    onChange={(e) =>
                      setDraft((d) =>
                        d ? { ...d, items: d.items.map((x) => (x.id === it.id ? { ...x, location: e.target.value } : x)) } : d
                      )
                    }
                  />
                  <input
                    className="rounded-xl border px-2 py-1.5"
                    placeholder="Item"
                    value={it.item}
                    onChange={(e) =>
                      setDraft((d) =>
                        d ? { ...d, items: d.items.map((x) => (x.id === it.id ? { ...x, item: e.target.value } : x)) } : d
                      )
                    }
                  />
                  <select
                    className="rounded-xl border px-2 py-1.5"
                    value={it.target_key}
                    onChange={(e) =>
                      setDraft((d) =>
                        d
                          ? {
                              ...d,
                              items: d.items.map((x) => (x.id === it.id ? { ...x, target_key: e.target.value } : x)),
                            }
                          : d
                      )
                    }
                  >
                    {targetOptions.map((t) => (
                      <option key={t.key} value={t.key}>
                        {t.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="mt-2 text-right">
                  <button
                    type="button"
                    onClick={() => removeItem(it.id)}
                    className="rounded-md px-3 py-1 text-sm hover:bg-gray-100"
                  >
                    Remove
                  </button>
                </div>
              </div>
            ))}
          </div>

          <button
            type="button"
            onClick={addItem}
            className="mt-2 rounded-xl border px-3 py-1.5 text-sm hover:bg-gray-50"
          >
            + Add item
          </button>
        </div>

        {/* Sticky footer */}
        <div className="sticky bottom-0 z-10 flex items-center justify-end gap-2 border-t bg-white px-4 py-3">
          <button type="button" onClick={onClose} className="rounded-md px-3 py-1.5 text-sm hover:bg-gray-50">
            Cancel
          </button>
          <button type="submit" className="rounded-xl bg-black px-3 py-1.5 text-sm font-medium text-white">
            Save
          </button>
        </div>
      </form>
    </div>
  );
}

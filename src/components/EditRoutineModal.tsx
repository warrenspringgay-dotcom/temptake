"use client";

import React, { useEffect, useMemo, useState } from "react";
import { TARGET_PRESETS } from "@/lib/temp-constants";

/* --------- types exported to callers --------- */
export type RoutineItemDraft = {
  id?: string;
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
  onSave: (draft: RoutineDraft) => void | Promise<void>;
};

const targetOptions = TARGET_PRESETS;

export default function EditRoutineModal({ open, initial, onClose, onSave }: Props) {
  const [draft, setDraft] = useState<RoutineDraft | null>(null);

  useEffect(() => setDraft(initial ? { ...initial } : null), [initial]);

  // add item
  const addItem = () => {
    setDraft((d) => {
      const lastPos = d?.items.at(-1)?.position ?? 0;
      const next: RoutineItemDraft = {
        id: crypto.randomUUID(),
        position: lastPos + 1,
        location: "",
        item: "",
        target_key: targetOptions[0]?.key ?? "chill",
      };
      return d ? { ...d, items: [...d.items, next] } : d;
    });
  };

  const removeItem = (pos: number) => {
    setDraft((d) =>
      d
        ? {
            ...d,
            items: d.items
              .filter((it) => it.position !== pos)
              .map((it, idx) => ({ ...it, position: idx + 1 })),
          }
        : d
    );
  };

  const setItem = (pos: number, patch: Partial<RoutineItemDraft>) => {
    setDraft((d) =>
      d
        ? {
            ...d,
            items: d.items.map((it) => (it.position === pos ? { ...it, ...patch } : it)),
          }
        : d
    );
  };

  const canSave = useMemo(() => {
    if (!draft) return false;
    if (!draft.name.trim()) return false;
    return true;
  }, [draft]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40"
      aria-modal="true"
      role="dialog"
      onClick={onClose}
    >
      {/* PANEL */}
      <form
        onClick={(e) => e.stopPropagation()}
        onSubmit={(e) => {
          e.preventDefault();
          if (draft && canSave) onSave(draft);
        }}
        className="
          pointer-events-auto w-full sm:max-w-2xl bg-white rounded-t-2xl sm:rounded-2xl shadow
          max-h-[100svh] sm:max-h-[min(90vh,760px)] flex flex-col
        "
      >
        {/* sticky header */}
        <div className="sticky top-0 z-10 flex items-center justify-between border-b bg-white px-4 py-3">
          <h2 className="text-base font-semibold">Edit routine</h2>
          <button
            type="button"
            aria-label="Close"
            onClick={onClose}
            className="rounded-full p-1 hover:bg-gray-100"
          >
            ✕
          </button>
        </div>

        {/* scrollable content */}
        <div className="flex-1 overflow-y-auto px-4 py-3">
          {draft && (
            <>
              <div className="mb-3 grid grid-cols-1 gap-3 sm:grid-cols-5">
                <label className="sm:col-span-4 text-sm">
                  <div className="mb-1 text-gray-600">Name</div>
                  <input
                    className="w-full rounded-xl border border-gray-300 px-3 py-2"
                    value={draft.name}
                    onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                    required
                  />
                </label>
                <label className="flex items-center gap-2 text-sm sm:justify-end">
                  <input
                    type="checkbox"
                    checked={draft.active}
                    onChange={(e) => setDraft({ ...draft, active: e.target.checked })}
                  />
                  <span>Active</span>
                </label>
              </div>

              <div className="space-y-3">
                {draft.items
                  .slice()
                  .sort((a, b) => a.position - b.position)
                  .map((it) => (
                    <div key={it.position} className="rounded-xl border p-3">
                      <div className="grid grid-cols-1 gap-2 sm:grid-cols-6">
                        <div className="sm:col-span-1">
                          <div className="mb-1 text-xs text-gray-500">#</div>
                          <input
                            className="w-full rounded-xl border px-2 py-1.5 text-center"
                            value={it.position}
                            readOnly
                          />
                        </div>
                        <div className="sm:col-span-2">
                          <div className="mb-1 text-xs text-gray-500">Location</div>
                          <input
                            className="w-full rounded-xl border px-2 py-1.5"
                            value={it.location}
                            onChange={(e) => setItem(it.position, { location: e.target.value })}
                          />
                        </div>
                        <div className="sm:col-span-2">
                          <div className="mb-1 text-xs text-gray-500">Item</div>
                          <input
                            className="w-full rounded-xl border px-2 py-1.5"
                            value={it.item}
                            onChange={(e) => setItem(it.position, { item: e.target.value })}
                          />
                        </div>
                        <div className="sm:col-span-1">
                          <div className="mb-1 text-xs text-gray-500">Target</div>
                          <select
                            className="w-full rounded-xl border px-2 py-1.5"
                            value={it.target_key}
                            onChange={(e) =>
                              setItem(it.position, { target_key: e.target.value })
                            }
                          >
                            {targetOptions.map((t) => (
                              <option key={t.key} value={t.key}>
                                {t.label}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                      <div className="mt-2 text-right">
                        <button
                          type="button"
                          className="rounded-md border px-3 py-1.5 text-sm hover:bg-gray-50"
                          onClick={() => removeItem(it.position)}
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
            </>
          )}
        </div>

        {/* sticky footer (safe-area padding on iOS) */}
        <div className="sticky bottom-0 z-10 flex items-center justify-end gap-2 border-t bg-white px-4 py-3 pb-[max(env(safe-area-inset-bottom),0px)]">
          <button
            type="button"
            className="rounded-md px-3 py-1.5 text-sm hover:bg-gray-50"
            onClick={onClose}
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={!canSave}
            className={`rounded-xl px-3 py-1.5 text-sm font-medium text-white ${
              canSave ? "bg-black hover:bg-gray-800" : "bg-gray-400"
            }`}
          >
            Save &amp; lock
          </button>
        </div>
      </form>
    </div>
  );
}

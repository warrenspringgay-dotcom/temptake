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
  <div
    className="fixed inset-0 z-[100] bg-black/35 flex"   // <-- flex wrapper
    onClick={onClose}
  >
    <form
      onSubmit={submit}
      onClick={(e) => e.stopPropagation()}
      className="
        relative mx-auto my-auto w-full max-w-lg
        flex flex-col                     /* vertical layout */
        border bg-white shadow
        rounded-t-2xl sm:rounded-2xl
        max-h-[90dvh]                     /* critical: cap height to viewport */
      "
    >
      {/* Sticky header */}
      <div className="sticky top-0 z-10 flex items-center justify-between border-b bg-white px-4 py-3">
        <div className="text-base font-semibold">Edit routine</div>
        <button type="button" onClick={onClose} className="rounded-md px-2 py-1 hover:bg-gray-100">✕</button>
      </div>

      {/* Scrollable content */}
      <div
        className="
          grow overflow-y-auto px-4 py-3 space-y-3
          [overscroll-behavior:contain]   /* trap scroll inside */
          [-webkit-overflow-scrolling:touch] /* smooth iOS/Android */
        "
      >
        {/* ... your inputs ... */}
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

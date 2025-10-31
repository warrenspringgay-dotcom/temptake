// src/components/RoutinePickerModal.tsx
"use client";

import React from "react";

/** ----- Shared type (source of truth) ----- */
export type RoutineRow = {
  id: string;
  name: string;
  active: boolean;
  items: {
    id: string;
    routine_id: string;
    position: number;
    location: string | null;
    item: string | null;
    target_key: string;
  }[];
};

/** ----- Props ----- */
type Props = {
  open: boolean;
  onClose: () => void;
  onPick: (r: RoutineRow) => void;
  /** Optional: pass routines in; if you prefer to fetch inside, swap this for local state+effect */
  routines?: RoutineRow[];
  title?: string;
};

function cls(...parts: Array<string | false | undefined>) {
  return parts.filter(Boolean).join(" ");
}

/** Simple pill for active/inactive */
function StatusPill({ active }: { active: boolean }) {
  return (
    <span
      className={cls(
        "inline-flex rounded-full px-2 py-[2px] text-xs font-medium",
        active ? "bg-emerald-100 text-emerald-800" : "bg-gray-200 text-gray-700"
      )}
    >
      {active ? "Active" : "Inactive"}
    </span>
  );
}

/** ----- Component ----- */
export default function RoutinePickerModal({
  open,
  onClose,
  onPick,
  routines = [],
  title = "Pick a routine",
}: Props) {
  // close on ESC
  React.useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50"
      aria-modal="true"
      role="dialog"
      onClick={onClose}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40" />

      {/* Panel */}
      <div
        className="absolute inset-x-0 top-[8vh] mx-auto w-[min(720px,92vw)] overflow-x-hidden rounded-2xl border bg-white shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Sticky header (helps on mobile) */}
        <div className="sticky top-0 z-10 flex items-center justify-between border-b bg-white/95 px-4 py-3 backdrop-blur supports-[backdrop-filter]:bg-white/75">
          <div className="text-base font-semibold">{title}</div>
          <button
            onClick={onClose}
            className="rounded-md px-3 py-1.5 text-sm hover:bg-gray-100"
          >
            Close
          </button>
        </div>

        {/* Scrollable list (mobile-friendly) */}
        <div className="max-h-[70vh] overflow-y-auto px-3 py-3 sm:px-4">
          {routines.length === 0 ? (
            <div className="rounded-lg border border-dashed p-6 text-center text-sm text-gray-500">
              No routines yet.
            </div>
          ) : (
            <ul className="space-y-2">
              {routines.map((r) => (
                <li
                  key={r.id}
                  className="flex items-center justify-between gap-3 rounded-xl border px-3 py-2 hover:bg-gray-50 sm:px-4"
                >
                  <div className="min-w-0">
                    <div className="truncate text-sm font-medium">{r.name}</div>
                    <div className="mt-0.5 text-[12px] text-gray-600">
                      {r.items.length} item{r.items.length === 1 ? "" : "s"}
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <StatusPill active={!!r.active} />
                    <button
                      onClick={() => onPick(r)}
                      className="rounded-lg bg-black px-3 py-1.5 text-xs font-medium text-white hover:bg-gray-900"
                    >
                      Use
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Sticky footer (also helps on mobile) */}
        <div className="sticky bottom-0 z-10 border-t bg-white/95 px-4 py-3 text-right backdrop-blur supports-[backdrop-filter]:bg-white/75">
          <button
            onClick={onClose}
            className="rounded-md px-3 py-1.5 text-sm hover:bg-gray-100"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

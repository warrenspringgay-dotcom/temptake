// src/app/routines/[id]/run/RunRoutineClient.tsx
"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { recordRoutineRun } from "@/app/actions/routines";

/** Strict shape the page passes down after normalization */
export type RoutineForRun = {
  id: string;
  name: string;
  items: Array<{
    id: string;
    position: number;
    location: string | null;
    item: string | null;
    target_key: string;
  }>;
};

export default function RoutineRunnerClient({ routine }: { routine: RoutineForRun }) {
  const router = useRouter();

  // inputs
  const [initials, setInitials] = useState("");
  const [temps, setTemps] = useState<string[]>(
    () => new Array(routine.items.length).fill("")
  );
  const tempRefs = useRef<Array<HTMLInputElement | null>>([]);

  function setTempAt(idx: number, v: string) {
    setTemps((prev) => {
      const next = prev.slice();
      next[idx] = v;
      return next;
    });
  }

  function focusRow(idx: number) {
    const el = tempRefs.current[idx];
    if (el) el.focus();
  }

  function handleTempKeyDown(idx: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      e.preventDefault();
      if (idx < routine.items.length - 1) {
        focusRow(idx + 1);
      }
    }
  }

  const canSave = useMemo(() => {
    if (!initials.trim()) return false;
    return temps.some((t) => t.trim() !== "");
  }, [initials, temps]);

  const [saving, setSaving] = useState(false);

  async function doSave() {
    if (!canSave || saving) return;
    setSaving(true);
    try {
      // Build rows; only include lines with a temp value
      const rows = routine.items
        .map((it, i) => ({ it, t: temps[i]?.trim() ?? "" }))
        .filter(({ t }) => t !== "")
        .map(({ it, t }) => ({
          routine_id: routine.id,
          routine_item_id: it.id,
          location: it.location,
          item: it.item,
          target_key: it.target_key,
          initials: initials.trim().toUpperCase(),
          temp_c: Number(t),
        }));

      // Your server action should accept a single array argument:
      //   recordRoutineRun(rows: Array<...>)
      await recordRoutineRun({ routine_id: routine.id, rows });


      router.push("/routines");
      router.refresh();
    } catch (err: any) {
      alert(err?.message ?? "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  // Autofocus first temp on mount
  useEffect(() => {
    focusRow(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <>
      <div className="mb-3 flex items-center justify-between">
        <button
          onClick={() => router.push("/routines")}
          className="rounded-xl border px-3 py-2 text-sm hover:bg-gray-50"
        >
          Back
        </button>

        <div className="flex items-center gap-2">
          <input
            placeholder="e.g., AB"
            value={initials}
            onChange={(e) => setInitials(e.target.value.toUpperCase())}
            className="h-10 w-24 rounded-xl border px-3 py-2"
          />
          <button
            onClick={doSave}
            disabled={!canSave || saving}
            className="rounded-xl bg-black px-3 py-2 text-sm font-medium text-white hover:bg-gray-900 disabled:opacity-60"
          >
            {saving ? "Saving…" : "Save"}
          </button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="text-left text-gray-500">
              <th className="py-2 pr-3 w-8">#</th>
              <th className="py-2 pr-3">Location</th>
              <th className="py-2 pr-3">Item</th>
              <th className="py-2 pr-3">Target</th>
              <th className="py-2 pr-3">Initials</th>
              <th className="py-2 pr-3">Temp (°C)</th>
            </tr>
          </thead>
          <tbody>
            {routine.items.map((it, idx) => (
              <tr key={it.id} className="border-t">
                <td className="py-2 pr-3">{idx + 1}</td>
                <td className="py-2 pr-3">{it.location ?? "—"}</td>
                <td className="py-2 pr-3">{it.item ?? "—"}</td>
                <td className="py-2 pr-3">{it.target_key}</td>
                <td className="py-2 pr-3">
                  <input
                    value={initials}
                    onChange={(e) => setInitials(e.target.value.toUpperCase())}
                    className="w-20 rounded-md border px-2 py-1"
                  />
                </td>
                <td className="py-2 pr-3">
                  <input
                    ref={(el) => {
                      // return void, not the element
                      tempRefs.current[idx] = el ?? null;
                    }}
                    value={temps[idx]}
                    onChange={(e) => setTempAt(idx, e.target.value)}
                    onKeyDown={(e) => handleTempKeyDown(idx, e)}
                    inputMode="decimal"
                    placeholder="e.g., 5.0"
                    className="w-28 rounded-md border px-2 py-1"
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-4 flex justify-end">
        <button
          onClick={doSave}
          disabled={!canSave || saving}
          className="rounded-xl bg-black px-3 py-2 text-sm font-medium text-white hover:bg-gray-900 disabled:opacity-60"
        >
          {saving ? "Saving…" : "Save"}
        </button>
      </div>
    </>
  );
}

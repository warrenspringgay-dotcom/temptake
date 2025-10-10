"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { recordRoutineRun } from "@/app/actions/routines";

type RoutineForRun = {
  id: string;
  name: string;
  items: {
    id: string;
    position: number;
    location: string | null;
    item: string | null;
    target_key: string;
  }[];
};

function isValidNumber(v: string) {
  return /^-?\d+(\.\d+)?$/.test(v.trim());
}

export default function RunRoutineClient({ routine }: { routine: RoutineForRun }) {
  const router = useRouter();
  const [initials, setInitials] = useState("");
  const [temps, setTemps] = useState<string[]>(routine.items.map(() => ""));
  const [saving, setSaving] = useState(false);

  const tempRefs = useRef<(HTMLInputElement | null)[]>([]);
  useEffect(() => {
    tempRefs.current[0]?.focus();
  }, []);

  const canSave = useMemo(() => {
    if (!initials.trim()) return false;
    return temps.some((t) => isValidNumber(t));
  }, [initials, temps]);

  function setTempAt(idx: number, val: string) {
    setTemps((prev) => {
      const arr = prev.slice();
      arr[idx] = val;
      return arr;
    });
  }

  function handleTempKeyDown(idx: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      e.preventDefault();
      if (idx === temps.length - 1) {
        if (canSave) void doSave();
      } else {
        tempRefs.current[idx + 1]?.focus();
        tempRefs.current[idx + 1]?.select();
      }
    }
  }

  async function doSave() {
    if (!canSave || saving) return;
    setSaving(true);
    try {
      const rows = routine.items
        .map((it, idx) => ({
          location: it.location,
          item: it.item,
          target_key: it.target_key,
          initials: initials.trim(),
          temp_c: Number(temps[idx]),
        }))
        .filter((r) => Number.isFinite(r.temp_c));

      if (!rows.length) {
        alert("Enter at least one valid temperature.");
        setSaving(false);
        return;
      }

      await recordRoutineRun(routine.id, rows);
      router.push("/routines");
      router.refresh();
    } catch (err: any) {
      alert(err?.message ?? "Failed to save run.");
      setSaving(false);
    }
  }

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
                    ref={(el) => (tempRefs.current[idx] = el)}
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

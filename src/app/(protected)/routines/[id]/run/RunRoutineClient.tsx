"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import type { RoutineForRun } from "@/app/actions/routines";
import { recordRoutineRun } from "@/app/actions/routines";

type Props = { routine: RoutineForRun };

type RowState = {
  id: string;
  location: string | null;
  item: string | null;
  target_key: string;
  temp_c: number | null;
  status: "pass" | "fail" | null;
  notes: string | null;
};

export default function RunRoutineClient({ routine }: Props) {
  const router = useRouter();

  // seed per-step rows the runner can fill in
  const [rows, setRows] = useState<RowState[]>(
    routine.items.map((it) => ({
      id: String(it.id),
      location: it.location,
      item: it.item,
      target_key: it.target_key,
      temp_c: null,
      status: null,
      notes: null,
    }))
  );

  async function onSubmitRun() {
    const items = rows.map((r) => ({
      stepId: String(r.id),
      location: r.location,
      item: r.item,
      target_key: r.target_key,
      temp_c: r.temp_c,
      status: r.status,
      notes: r.notes,
    }));

    await recordRoutineRun({ routineId: routine.id, items });
    router.push("/routines");
  }

  return (
    <div className="space-y-4">
      <h1 className="text-lg font-semibold">Run routine: {routine.name}</h1>

      {/* Minimal UI – replace with your real form */}
      <div className="rounded-xl border bg-white p-4">
        {rows.map((r, idx) => (
          <div key={r.id} className="grid grid-cols-1 gap-2 sm:grid-cols-4 mb-3">
            <div className="text-sm">
              <div className="text-gray-500">Item</div>
              <div>{r.item ?? r.location ?? "Step"}</div>
            </div>
            <div>
              <label className="text-xs text-gray-500">Temp (°C)</label>
              <input
                className="w-full rounded border px-2 py-1"
                value={r.temp_c ?? ""}
                onChange={(e) =>
                  setRows((prev) => {
                    const copy = [...prev];
                    copy[idx] = { ...copy[idx], temp_c: e.target.value ? Number(e.target.value) : null };
                    return copy;
                  })
                }
              />
            </div>
            <div>
              <label className="text-xs text-gray-500">Status</label>
              <select
                className="w-full rounded border px-2 py-1"
                value={r.status ?? ""}
                onChange={(e) =>
                  setRows((prev) => {
                    const copy = [...prev];
                    copy[idx] = { ...copy[idx], status: (e.target.value || null) as RowState["status"] };
                    return copy;
                  })
                }
              >
                <option value="">—</option>
                <option value="pass">pass</option>
                <option value="fail">fail</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-500">Notes</label>
              <input
                className="w-full rounded border px-2 py-1"
                value={r.notes ?? ""}
                onChange={(e) =>
                  setRows((prev) => {
                    const copy = [...prev];
                    copy[idx] = { ...copy[idx], notes: e.target.value || null };
                    return copy;
                  })
                }
              />
            </div>
          </div>
        ))}

        <button
          onClick={onSubmitRun}
          className="mt-2 rounded-xl bg-black px-4 py-2 text-sm font-medium text-white hover:bg-gray-900"
        >
          Submit run
        </button>
      </div>
    </div>
  );
}

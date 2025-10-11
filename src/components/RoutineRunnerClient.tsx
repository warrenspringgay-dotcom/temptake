"use client";

import React from "react";
import type { RoutineWithItems } from "@/types/routines";

export default function RoutineRunner({ routine }: { routine: RoutineWithItems }) {
  return (
    <div className="space-y-4 rounded-2xl border bg-white p-4 shadow-sm">
      <h2 className="text-lg font-semibold">{routine.name}</h2>

      {routine.items.length === 0 ? (
        <div className="text-sm text-gray-600">
          This routine has no entries yet.
        </div>
      ) : (
        <table className="min-w-full text-sm border">
          <thead>
            <tr className="text-left text-gray-500 bg-gray-50">
              <th className="py-2 px-3">#</th>
              <th className="py-2 px-3">Location</th>
              <th className="py-2 px-3">Item</th>
              <th className="py-2 px-3">Target</th>
              <th className="py-2 px-3">Initials</th>
              <th className="py-2 px-3">Temp (°C)</th>
            </tr>
          </thead>
          <tbody>
            {routine.items.map((it, idx) => (
              <tr key={it.id ?? idx} className="border-t">
                <td className="py-2 px-3">{idx + 1}</td>
                <td className="py-2 px-3">{it.location ?? "—"}</td>
                <td className="py-2 px-3">{it.item ?? "—"}</td>
                <td className="py-2 px-3">{it.target_key ?? "—"}</td>
                <td className="py-2 px-3">
                  <input
                    className="w-20 rounded-md border px-2 py-1 uppercase"
                    placeholder="AB"
                  />
                </td>
                <td className="py-2 px-3">
                  <input
                    className="w-24 rounded-md border px-2 py-1"
                    placeholder="e.g., 5.0"
                    type="number"
                    inputMode="decimal"
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

// src/components/RoutineRunnerClient.tsx
"use client";

import React from "react";
import type { RoutineWithItems } from "@/app/actions/routines";

export default function RoutineRunner({ routine }: { routine: RoutineWithItems }) {
  return (
    <div className="mx-auto max-w-3xl space-y-4 rounded-2xl border bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Run routine: {routine.name}</h1>
        <a href="/routines" className="rounded-lg border px-3 py-1.5 text-sm hover:bg-gray-50">
          Back
        </a>
      </div>

      {routine.items.length === 0 ? (
        <div className="text-sm text-gray-600">This routine has no entries yet.</div>
      ) : (
        <table className="min-w-full text-sm">
          <thead>
            <tr className="text-left text-gray-500">
              <th className="py-2 pr-3">#</th>
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
                  <input className="w-20 rounded-md border px-2 py-1 uppercase" placeholder="AB" />
                </td>
                <td className="py-2 pr-3">
                  <input className="w-24 rounded-md border px-2 py-1" placeholder="e.g., 5.0" />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

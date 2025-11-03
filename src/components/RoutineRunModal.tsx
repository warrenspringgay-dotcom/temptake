// src/components/RoutineRunModal.tsx
"use client";

import React, { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseBrowser";
import { getActiveOrgIdClient } from "@/lib/orgClient";
import { TARGET_BY_KEY, type TargetPreset } from "@/lib/temp-constants";
import type { RoutineRow } from "@/components/RoutinePickerModal";

type Props = {
  open: boolean;
  routine: RoutineRow | null;
  defaultDate: string;
  defaultInitials: string;
  onClose: () => void;
  onSaved: () => Promise<void> | void;
};

function inferStatus(
  temp: number | null,
  preset?: TargetPreset
): "pass" | "fail" | null {
  if (temp == null || !preset) return null;
  const { minC, maxC } = preset;
  if (minC != null && temp < minC) return "fail";
  if (maxC != null && temp > maxC) return "fail";
  return "pass";
}

export default function RoutineRunModal({
  open,
  routine,
  defaultDate,
  defaultInitials,
  onClose,
  onSaved,
}: Props) {
  const [date, setDate] = useState(defaultDate);
  const [initials, setInitials] = useState(defaultInitials || "");
  const [temps, setTemps] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  // Reset whenever a new routine opens
  useEffect(() => {
    if (!open || !routine) return;
    setDate(defaultDate);
    setInitials(defaultInitials || "");
    const init: Record<string, string> = {};
    for (const it of routine.items) init[it.id] = "";
    setTemps(init);
  }, [open, routine, defaultDate, defaultInitials]);

  // If closed or no routine, render nothing
  if (!open || !routine) return null;

  async function handleSave(e?: React.FormEvent) {
    e?.preventDefault();

    // Extra guard so TypeScript is happy
    if (!routine) return;

    if (!date || !initials) return;
    setSaving(true);
    try {
      const org_id = await getActiveOrgIdClient();
      if (!org_id) {
        alert("No organisation found.");
        return;
      }

      const rowsToSave = routine.items
        .map((it) => {
          const raw = (temps[it.id] ?? "").trim();
          if (!raw) return null;
          const tempNum = Number.isFinite(Number(raw)) ? Number(raw) : null;
          const preset = (TARGET_BY_KEY as any)[it.target_key] as
            | TargetPreset
            | undefined;
          const status = inferStatus(tempNum, preset);
          return {
            org_id,
            at: date,
            area: it.location || null,
            note: it.item || null,
            staff_initials: initials.toUpperCase(),
            target_key: it.target_key || null,
            temp_c: tempNum,
            status,
          };
        })
        .filter(Boolean) as any[];

      if (!rowsToSave.length) {
        onClose();
        return;
      }

      const { error } = await supabase
        .from("food_temp_logs")
        .insert(rowsToSave);
      if (error) {
        alert(`Save failed: ${error.message}`);
        return;
      }

      await onSaved();
      onClose();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 overflow-y-auto overscroll-contain"
      onClick={onClose}
    >
      <form
        onSubmit={handleSave}
        onClick={(e) => e.stopPropagation()}
        className="mt-4 mb-4 flex w-full max-w-3xl max-h-[90vh] flex-col overflow-hidden rounded-2xl bg-white shadow-xl"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b bg-slate-900 px-4 py-3 text-white">
          <div>
            <div className="text-xs uppercase tracking-wide opacity-80">
              Run routine
            </div>
            <div className="text-base font-semibold">{routine.name}</div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md bg-slate-800 px-3 py-1.5 text-sm font-medium hover:bg-slate-700"
          >
            Close
          </button>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 min-h-0 overflow-y-auto px-4 py-3 space-y-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <label className="text-sm">
              <div className="mb-1 text-gray-700">Date</div>
              <input
                type="date"
                className="w-full rounded-xl border border-gray-300 px-2 py-2 text-sm"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
              />
            </label>
            <label className="text-sm">
              <div className="mb-1 text-gray-700">Initials</div>
              <input
                className="w-full rounded-xl border border-gray-300 px-2 py-2 text-sm uppercase"
                value={initials}
                onChange={(e) => setInitials(e.target.value.toUpperCase())}
                required
              />
            </label>
          </div>

          <p className="text-xs text-gray-600">
            Enter temps for any items you’re logging now, then “Save all”.
          </p>

          <div className="overflow-x-auto rounded-lg border border-gray-300">
            <table className="min-w-[640px] w-full text-sm">
              <thead className="bg-gray-50 text-gray-600">
                <tr>
                  <th className="px-2 py-2 text-left w-10">#</th>
                  <th className="px-2 py-2 text-left w-32">Location</th>
                  <th className="px-2 py-2 text-left w-40">Item</th>
                  <th className="px-2 py-2 text-left w-40">Target</th>
                  <th className="px-2 py-2 text-left w-32">Temp (°C)</th>
                </tr>
              </thead>
              <tbody>
                {routine.items.map((it, idx) => {
                  const preset =
                    (TARGET_BY_KEY as any)[it.target_key] as
                      | TargetPreset
                      | undefined;
                  return (
                    <tr key={it.id} className="border-t">
                      <td className="px-2 py-2 align-top">{idx + 1}</td>
                      <td className="px-2 py-2 align-top">
                        {it.location ?? "—"}
                      </td>
                      <td className="px-2 py-2 align-top">
                        {it.item ?? "—"}
                      </td>
                      <td className="px-2 py-2 align-top text-xs text-gray-600">
                        {preset
                          ? `${preset.label}${
                              preset.minC != null || preset.maxC != null
                                ? ` (${preset.minC ?? "−∞"}–${
                                    preset.maxC ?? "+∞"
                                  } °C)`
                                : ""
                            }`
                          : it.target_key || "—"}
                      </td>
                      <td className="px-2 py-2 align-top">
                        <input
                          className="w-24 rounded-xl border border-gray-300 px-2 py-1 text-sm"
                          inputMode="decimal"
                          value={temps[it.id] ?? ""}
                          onChange={(e) =>
                            setTemps((t) => ({
                              ...t,
                              [it.id]: e.target.value,
                            }))
                          }
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 border-t bg-gray-50 px-4 py-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-md px-3 py-1.5 text-sm hover:bg-white"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="rounded-xl bg-black px-4 py-1.5 text-sm font-medium text-white hover:bg-gray-900 disabled:opacity-60"
          >
            {saving ? "Saving…" : "Save all"}
          </button>
        </div>
      </form>
    </div>
  );
}

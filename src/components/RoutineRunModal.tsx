"use client";
import React, { useMemo, useState } from "react";
import type { RoutineRow } from "./RoutinePickerModal";
import { TARGET_PRESETS, TARGET_BY_KEY, type TargetPreset } from "@/lib/temp-constants";
import { getActiveOrgIdClient } from "@/lib/orgClient";
import { supabase } from "@/lib/supabaseBrowser";

function cls(...p:(string|false|undefined)[]) { return p.filter(Boolean).join(" "); }

type Props = {
  open: boolean;
  routine: RoutineRow | null;
  defaultDate: string;          // yyyy-mm-dd
  defaultInitials: string;      // auto-filled from form
  onClose: () => void;
  onSaved?: () => void;         // refresh parent table etc.
};

export default function RoutineRunModal({
  open, routine, defaultDate, defaultInitials, onClose, onSaved
}: Props) {
  const [saving, setSaving] = useState(false);

  // Temp inputs per row
  const [initials, setInitials] = useState(defaultInitials || "");
  const [date, setDate] = useState(defaultDate);
  const [temps, setTemps] = useState<Record<string,string>>({}); // by item.id

  // reset when routine changes/open toggles
  React.useEffect(() => {
    if (!open || !routine) return;
    setInitials(defaultInitials || "");
    setDate(defaultDate);
    setTemps({});
  }, [open, routine, defaultDate, defaultInitials]);

  const rows = routine?.items ?? [];

  async function saveAll() {
    if (!routine) return;
    const org_id = await getActiveOrgIdClient();
    if (!org_id) return alert("No organisation found.");

    // Build payloads only for rows with a temp provided
    const payloads = rows.map(it => {
      const tempVal = temps[it.id] ?? "";
      const tempNum = tempVal.trim().length ? Number(tempVal) : null;
      const preset: TargetPreset | undefined = it.target_key
        ? (TARGET_BY_KEY as any)[it.target_key]
        : undefined;
      let status: "pass" | "fail" | null = null;
      if (tempNum != null && preset) {
        const { minC, maxC } = preset;
        status =
          (minC != null && tempNum < minC) || (maxC != null && tempNum > maxC)
            ? "fail"
            : "pass";
      }
      return {
        org_id,
        at: date,
        staff_initials: initials ? initials.toUpperCase() : null,
        area: it.location ?? null,
        note: it.item ?? null,
        target_key: it.target_key ?? null,
        temp_c: tempNum,
        status,
      };
    });

    setSaving(true);
    try {
      // Don’t insert empty rows (no temp and no note/location)
      const filtered = payloads.filter(p =>
        (p.area || p.note) && (p.temp_c !== null && !Number.isNaN(p.temp_c))
      );
      if (!filtered.length) {
        alert("Enter at least one temperature.");
        return;
      }
      const { error } = await supabase.from("food_temp_logs").insert(filtered);
      if (error) throw error;
      onSaved?.();
      onClose();
    } catch (e:any) {
      alert(e?.message ?? "Save failed.");
    } finally {
      setSaving(false);
    }
  }

  const title = routine?.name ?? "Routine";
  if (!open || !routine) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/40" onClick={onClose}>
      <div className="mx-auto mt-10 w-full max-w-3xl overflow-hidden rounded-2xl border bg-white"
           onClick={(e)=>e.stopPropagation()}>
        <div className="flex items-center justify-between bg-slate-800 px-4 py-3 text-white">
          <div>
            <div className="text-sm opacity-80">Run routine</div>
            <div className="text-lg font-semibold">{title}</div>
          </div>
          <button className="rounded-md bg-white/10 px-3 py-1.5 hover:bg-white/20" onClick={onClose}>Close</button>
        </div>

        <div className="p-4 space-y-3">
          <div className="grid gap-3 sm:grid-cols-3">
            <div>
              <label className="mb-1 block text-xs text-gray-500">Date</label>
              <input type="date" value={date} onChange={(e)=>setDate(e.target.value)}
                     className="h-10 w-full rounded-xl border px-3"/>
            </div>
            <div>
              <label className="mb-1 block text-xs text-gray-500">Initials</label>
              <input value={initials} onChange={(e)=>setInitials(e.target.value.toUpperCase())}
                     className="h-10 w-full rounded-xl border px-3 uppercase" placeholder="e.g., DK"/>
            </div>
            <div className="pt-6 text-xs text-gray-500">
              Enter temps for any items you’re logging now, then “Save all”.
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-left text-gray-500">
                  <th className="py-2 pr-3 w-14">#</th>
                  <th className="py-2 pr-3">Location</th>
                  <th className="py-2 pr-3">Item</th>
                  <th className="py-2 pr-3">Target</th>
                  <th className="py-2 pr-3 w-28">Temp (°C)</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((it, idx) => {
                  const preset = it.target_key ? (TARGET_BY_KEY as any)[it.target_key] as TargetPreset : undefined;
                  return (
                    <tr key={it.id} className="border-t">
                      <td className="py-2 pr-3">{(it.position ?? idx+1)}</td>
                      <td className="py-2 pr-3">{it.location ?? "—"}</td>
                      <td className="py-2 pr-3">{it.item ?? "—"}</td>
                      <td className="py-2 pr-3">
                        {preset ? `${preset.label}${(preset.minC!=null||preset.maxC!=null)?` (${preset.minC??"−∞"}–${preset.maxC??"+∞"} °C)`:``}` : "—"}
                      </td>
                      <td className="py-2 pr-3">
                        <input
                          value={temps[it.id] ?? ""}
                          onChange={(e)=>setTemps(prev=>({...prev, [it.id]: e.target.value}))}
                          inputMode="decimal"
                          className="h-9 w-24 rounded-lg border px-2"
                          placeholder="e.g., 5.0"
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button className="rounded-xl border px-4 py-2 text-sm" onClick={onClose}>Cancel</button>
            <button
              disabled={saving}
              onClick={saveAll}
              className={cls("rounded-xl px-4 py-2 text-sm font-medium text-white",
                             saving ? "bg-gray-400" : "bg-black hover:bg-gray-900")}
            >
              {saving ? "Saving…" : "Save all"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// src/components/RoutineRunModal.tsx
"use client";

import React, { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseBrowser";
import { getActiveOrgIdClient } from "@/lib/orgClient";
import { TARGET_BY_KEY, type TargetPreset } from "@/lib/temp-constants";
// If you have a local type, adjust this import:
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

async function getOrgIdSafe(): Promise<string | null> {
  try {
    const org = await getActiveOrgIdClient();
    if (org) return org;
  } catch {}

  try {
    const { data: userRes } = await supabase.auth.getUser();
    const userId = userRes?.user?.id;
    if (!userId) return null;

    const { data, error } = await supabase
      .from("profiles")
      .select("org_id")
      .eq("id", userId)
      .maybeSingle();

    if (error || !data?.org_id) return null;

    const orgId = String(data.org_id);
    try {
      localStorage.setItem("tt_active_org_id", orgId);
    } catch {}
    return orgId;
  } catch {
    return null;
  }
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

  // team initials for quick-fill
  const [initialOptions, setInitialOptions] = useState<string[]>([]);

  // reset when opened / routine changes
  useEffect(() => {
    if (!open || !routine) return;
    setDate(defaultDate);
    setInitials(defaultInitials || "");
    const init: Record<string, string> = {};
    for (const it of routine.items) init[it.id] = "";
    setTemps(init);
  }, [open, routine, defaultDate, defaultInitials]);

  // load initials for this org when modal opens
  useEffect(() => {
    if (!open) return;

    (async () => {
      try {
        const orgId = await getActiveOrgIdClient();
        if (!orgId) return;

        const { data, error } = await supabase
          .from("team_members")
          .select("initials, active")
          .eq("org_id", orgId)
          .eq("active", true)
          .order("initials");

        if (error) throw error;

        const list = Array.from(
          new Set(
            (data ?? [])
              .map((r: any) =>
                (r.initials ?? "").toString().toUpperCase().trim()
              )
              .filter(Boolean)
          )
        );

        setInitialOptions(list);

        // if the box is empty, auto-fill with first initials
        setInitials((prev) => prev || list[0] || "");
      } catch {
        // ignore – user can still type manually
      }
    })();
  }, [open]);

  if (!open || !routine) return null;

  async function handleSave(e?: React.FormEvent) {
    e?.preventDefault();

    // basic validation
    if (!date || !initials) return;

    if (!routine) {
      alert("No routine loaded – please close this window and try again.");
      return;
    }

    setSaving(true);

    try {
      const org_id = await getOrgIdSafe();
      if (!org_id) {
        alert(
          "No organisation found. Please sign out and back in, or ask your admin to check your organisation."
        );
        return;
      }

      type NewLogRow = {
        org_id: string;
        at: string;
        area: string | null;
        note: string | null;
        staff_initials: string;
        target_key: string | null;
        temp_c: number | null;
        status: "pass" | "fail" | null;
      };

      const rowsToSave: NewLogRow[] = routine.items
        .map<NewLogRow | null>((it) => {
          const raw = (temps[it.id] ?? "").trim();
          if (!raw) return null; // skip empty temps

          const tempNum = Number.isFinite(Number(raw)) ? Number(raw) : null;
          const preset =
            (TARGET_BY_KEY as any)[it.target_key] as TargetPreset | undefined;
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
        .filter((row): row is NewLogRow => row !== null);

      if (!rowsToSave.length) {
        // nothing filled in – just close
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
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto overscroll-contain bg-black/40 px-2 py-4 sm:px-4 sm:py-6"
      onClick={onClose}
    >
      <form
        onSubmit={handleSave}
        onClick={(e) => e.stopPropagation()}
        className="mt-2 mb-2 flex w-full max-w-3xl max-h-[90vh] flex-col overflow-hidden rounded-2xl bg-slate-900 text-slate-50 shadow-xl"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 bg-emerald-700 px-4 py-3">
          <div>
            <div className="text-[11px] uppercase tracking-wide text-emerald-100/80">
              Run routine
            </div>
            <div className="text-base font-semibold text-white">
              {routine.name}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md bg-emerald-800/90 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-900"
          >
            Close
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 min-h-0 overflow-y-auto space-y-4 px-4 py-3">
          {/* Date / initials */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <label className="text-sm">
              <div className="mb-1 text-slate-200">Date</div>
              <input
                type="date"
                className="w-full rounded-xl border border-slate-600 bg-slate-900 px-2 py-2 text-sm text-slate-50"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
              />
            </label>

            <label className="text-sm">
              <div className="mb-1 text-slate-200">Initials</div>
              <input
                list={initialOptions.length ? "tt-initials-list" : undefined}
                className="w-full rounded-xl border border-slate-600 bg-slate-900 px-2 py-2 text-sm uppercase text-slate-50"
                value={initials}
                onChange={(e) => setInitials(e.target.value.toUpperCase())}
                placeholder="e.g. WS"
                required
              />

              {/* Dropdown suggestions populated from team_members */}
              {initialOptions.length > 0 && (
                <datalist id="tt-initials-list">
                  {initialOptions.map((opt) => (
                    <option key={opt} value={opt} />
                  ))}
                </datalist>
              )}

              {/* Optional chips for quick tap selection */}
              {initialOptions.length > 0 && (
                <div className="mt-1 flex flex-wrap gap-1 text-[11px] text-slate-300">
                  {initialOptions.map((opt) => (
                    <button
                      key={opt}
                      type="button"
                      className="rounded-full border border-slate-600 bg-slate-800 px-2 py-0.5 uppercase hover:bg-slate-700"
                      onClick={() => setInitials(opt)}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              )}
            </label>
          </div>

          <p className="text-xs text-slate-300">
            Enter temps for any items you’re logging now, then tap{" "}
            <span className="font-semibold">“Save all”</span>.
          </p>

          {/* Desktop/tablet table */}
          <div className="hidden rounded-lg border border-slate-700 bg-slate-900 md:block">
            <table className="w-full table-fixed text-sm">
              <thead className="bg-slate-800 text-slate-300">
                <tr>
                  <th className="w-10 px-3 py-2 text-left">#</th>
                  <th className="w-32 px-3 py-2 text-left">Location</th>
                  <th className="w-40 px-3 py-2 text-left">Item</th>
                  <th className="px-3 py-2 text-left">Target</th>
                  <th className="w-32 px-3 py-2 text-left">Temp (°C)</th>
                </tr>
              </thead>
              <tbody>
                {routine.items.map((it, idx) => {
                  const preset =
                    (TARGET_BY_KEY as any)[it.target_key] as
                      | TargetPreset
                      | undefined;
                  return (
                    <tr key={it.id} className="border-t border-slate-800">
                      <td className="px-3 py-2 align-top">{idx + 1}</td>
                      <td className="px-3 py-2 align-top">
                        {it.location ?? "—"}
                      </td>
                      <td className="px-3 py-2 align-top">
                        {it.item ?? "—"}
                      </td>
                      <td className="px-3 py-2 align-top text-xs text-slate-300">
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
                      <td className="px-3 py-2 align-top">
                        <input
                          className="w-24 rounded-xl border border-slate-600 bg-slate-900 px-2 py-1 text-sm text-slate-50"
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

          {/* Mobile cards */}
          <div className="space-y-2 md:hidden">
            {routine.items.map((it, idx) => {
              const preset =
                (TARGET_BY_KEY as any)[it.target_key] as
                  | TargetPreset
                  | undefined;
              return (
                <div
                  key={it.id}
                  className="rounded-xl border border-slate-700 bg-slate-900 p-3 text-sm"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="text-xs text-slate-400">#{idx + 1}</div>
                  </div>

                  <div className="mt-1 text-sm font-medium text-slate-50">
                    {it.item ?? "—"}
                  </div>
                  <div className="text-xs text-slate-300">
                    {it.location ?? "—"}
                  </div>

                  <div className="mt-2 text-[11px] text-slate-400">
                    {preset
                      ? `${preset.label}${
                          preset.minC != null || preset.maxC != null
                            ? ` (${preset.minC ?? "−∞"}–${
                                preset.maxC ?? "+∞"
                              } °C)`
                            : ""
                        }`
                      : it.target_key || "—"}
                  </div>

                  <div className="mt-2">
                    <label className="text-xs text-slate-300">
                      Temp (°C)
                      <input
                        className="mt-1 w-full rounded-xl border border-slate-600 bg-slate-900 px-2 py-1.5 text-sm text-slate-50"
                        inputMode="decimal"
                        value={temps[it.id] ?? ""}
                        onChange={(e) =>
                          setTemps((t) => ({
                            ...t,
                            [it.id]: e.target.value,
                          }))
                        }
                        placeholder="e.g. 75"
                      />
                    </label>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 border-t border-slate-800 bg-slate-900 px-4 py-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-md px-3 py-1.5 text-sm text-slate-100 hover:bg-slate-800"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="rounded-xl bg-emerald-500 px-4 py-1.5 text-sm font-semibold text-slate-900 hover:bg-emerald-400 disabled:opacity-60"
          >
            {saving ? "Saving…" : "Save all"}
          </button>
        </div>
      </form>
    </div>
  );
}

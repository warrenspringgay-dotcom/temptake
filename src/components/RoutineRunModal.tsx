// src/components/RoutineRunModal.tsx
"use client";

import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseBrowser";
import { getActiveOrgIdClient } from "@/lib/orgClient";
import { getActiveLocationIdClient } from "@/lib/locationClient";
import { TARGET_BY_KEY, type TargetPreset } from "@/lib/temp-constants";
import type { RoutineRow } from "@/components/RoutinePickerModal";
import { useVoiceTempEntry } from "@/lib/useVoiceTempEntry";

const cls = (...parts: Array<string | false | null | undefined>) =>
  parts.filter(Boolean).join(" ");


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
  const [initialOptions, setInitialOptions] = useState<string[]>([]);

  // which routine item we are filling by voice
  const [voiceItemId, setVoiceItemId] = useState<string | null>(null);

  const activeItemLabel = useMemo(() => {
    if (!routine || !voiceItemId) return "";
    const it = routine.items.find((x) => x.id === voiceItemId);
    return it?.item ?? it?.location ?? "item";
  }, [routine, voiceItemId]);

  const {
    supported: voiceSupported,
    listening,
    start,
    stop,
  } = useVoiceTempEntry({
    lang: "en-GB",
    onResult: (r) => {
      // only apply if we're targeting a specific item
      if (!voiceItemId) return;

      if (r.temp_c) {
        setTemps((t) => ({ ...t, [voiceItemId]: r.temp_c! }));
      }
      if (r.staff_initials) {
        setInitials(r.staff_initials.toUpperCase());
      }

      // auto-stop after a successful parse
      stop();
      setVoiceItemId(null);
    },
    onError: () => {
      stop();
      setVoiceItemId(null);
    },
  });

  // Reset when modal opens
  useEffect(() => {
    if (!open || !routine) return;
    setDate(defaultDate);
    setInitials(defaultInitials || "");

    const init: Record<string, string> = {};
    routine.items.forEach((it) => (init[it.id] = ""));
    setTemps(init);

    // kill any in-progress voice
    setVoiceItemId(null);
    if (listening) stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, routine, defaultDate, defaultInitials]);

  // Load initials
  useEffect(() => {
    if (!open) return;

    (async () => {
      try {
        const orgId = await getActiveOrgIdClient();
        if (!orgId) return;

        const { data } = await supabase
          .from("team_members")
          .select("initials, active")
          .eq("org_id", orgId)
          .eq("active", true)
          .order("initials");

        const list = Array.from(
          new Set(
            (data ?? [])
              .map((r: any) => (r.initials ?? "").toUpperCase())
              .filter(Boolean)
          )
        );

        setInitialOptions(list);
        setInitials((prev) => prev || list[0] || "");
      } catch {}
    })();
  }, [open]);

  if (!open || !routine) return null;

 async function handleSave(e?: React.FormEvent) {
  e?.preventDefault();

  // ✅ TS guard: routine can’t be null past this point
  const rt = routine;
  if (!rt) {
    console.error("Routine is null when trying to save routine logs.");
    return;
  }

  if (!date || !initials) return;

  setSaving(true);

  try {
    const org_id = await getActiveOrgIdClient();
    const location_id = await getActiveLocationIdClient();

    if (!org_id || !location_id) {
      alert("Please select a location first.");
      return;
    }

    // Build timestamp: selected date + current time
    let atIso: string;
    try {
      const selected = new Date(date);
      const now = new Date();
      const at = new Date(
        selected.getFullYear(),
        selected.getMonth(),
        selected.getDate(),
        now.getHours(),
        now.getMinutes(),
        now.getSeconds(),
        now.getMilliseconds()
      );
      atIso = at.toISOString();
    } catch {
      atIso = new Date().toISOString();
    }



    
    // ✅ use rt instead of routine
    const rows = rt.items
      .map((it) => {
        const raw = (temps[it.id] ?? "").trim();
        if (!raw) return null;

        const temp = Number.isFinite(Number(raw)) ? Number(raw) : null;
        const preset =
          (TARGET_BY_KEY as any)[it.target_key] as TargetPreset | undefined;
        const status = inferStatus(temp, preset);

        return {
          org_id,
          location_id,
          at: atIso,
          area: it.location ?? null,
          note: it.item ?? null,
          staff_initials: initials.toUpperCase(),
          target_key: it.target_key,
          temp_c: temp,
          status,
        };
      })
      .filter(Boolean) as any[];

    if (!rows.length) {
      onClose();
      return;
    }

    const { error } = await supabase.from("food_temp_logs").insert(rows);

    if (error) {
      alert(error.message);
      return;
    }

    await onSaved();
    onClose();
  } finally {
    setSaving(false);
  }
}


  const micLabel = listening
    ? `🎤 Listening…`
    : `🎤 Voice`;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-3 py-6"
      onClick={onClose}
    >
      <form
        onSubmit={handleSave}
        onClick={(e) => e.stopPropagation()}
        className="flex w-full max-w-4xl max-h-[85vh] flex-col overflow-hidden rounded-2xl bg-white text-slate-900 shadow-2xl"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-emerald-600/30 bg-emerald-600 px-4 py-3 text-white">
          <div>
            <div className="text-[11px] uppercase tracking-widest text-emerald-100">
              Run routine
            </div>
            <div className="text-base font-semibold">{routine.name}</div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-md bg-emerald-700 px-3 py-1.5 text-sm hover:bg-emerald-800"
          >
            Close
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 min-h-0 overflow-y-auto bg-white px-4 py-4 space-y-5">
          {/* Date + Initials */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <label className="text-sm font-medium">
              Date
              <input
                type="date"
                className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
              />
            </label>

            <label className="text-sm font-medium">
              Initials
              <input
                list="initials-list"
                className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm uppercase shadow-sm"
                value={initials}
                onChange={(e) => setInitials(e.target.value.toUpperCase())}
                required
              />
              <datalist id="initials-list">
                {initialOptions.map((i) => (
                  <option key={i} value={i} />
                ))}
              </datalist>
            </label>
          </div>

          {/* Voice status */}
          {voiceSupported && listening && voiceItemId && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
              Listening for <span className="font-semibold">{activeItemLabel}</span>…
              <button
                type="button"
                onClick={() => {
                  stop();
                  setVoiceItemId(null);
                }}
                className="ml-2 rounded-md border border-amber-200 bg-white px-2 py-1 text-xs hover:bg-amber-50"
              >
                Stop
              </button>
            </div>
          )}

          {/* DESKTOP TABLE */}
          <div className="hidden md:block rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-slate-100 text-slate-600">
                <tr>
                  <th className="p-2 text-left text-xs font-semibold">#</th>
                  <th className="p-2 text-left text-xs font-semibold">Location</th>
                  <th className="p-2 text-left text-xs font-semibold">Item</th>
                  <th className="p-2 text-left text-xs font-semibold">Target</th>
                  <th className="p-2 text-left text-xs font-semibold">Temp (°C)</th>
                  <th className="p-2 text-right text-xs font-semibold">Voice</th>
                </tr>
              </thead>

              <tbody>
                {routine.items.map((it, idx) => {
                  const preset =
                    (TARGET_BY_KEY as any)[it.target_key] as TargetPreset;

                  const isThisListening = listening && voiceItemId === it.id;

                  return (
                    <tr key={it.id} className="border-t border-slate-100">
                      <td className="p-2">{idx + 1}</td>
                      <td className="p-2">{it.location ?? "—"}</td>
                      <td className="p-2">{it.item ?? "—"}</td>
                      <td className="p-2 text-xs text-slate-500">
                        {preset?.label ?? it.target_key ?? "—"}
                      </td>
                      <td className="p-2">
                        <input
                          className="w-24 rounded-xl border border-slate-300 bg-white px-2 py-1 shadow-sm"
                          value={temps[it.id] ?? ""}
                          onChange={(e) =>
                            setTemps((t) => ({
                              ...t,
                              [it.id]: e.target.value,
                            }))
                          }
                        />
                      </td>
                      <td className="p-2 text-right">
                        {voiceSupported && (
                          <button
                            type="button"
                            onClick={() => {
                              if (isThisListening) {
                                stop();
                                setVoiceItemId(null);
                              } else {
                                setVoiceItemId(it.id);
                                start();
                              }
                            }}
                            className={cls(
                              "rounded-full border px-2 py-1 text-[11px] font-medium",
                              isThisListening
                                ? "border-red-200 bg-red-50 text-red-700"
                                : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                            )}
                            title="Voice entry"
                          >
                            {isThisListening ? "🎤 Listening…" : "🎤 Voice"}
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* MOBILE CARDS */}
          <div className="space-y-3 md:hidden">
            {routine.items.map((it, idx) => {
              const preset =
                (TARGET_BY_KEY as any)[it.target_key] as TargetPreset;

              const isThisListening = listening && voiceItemId === it.id;

              return (
                <div
                  key={it.id}
                  className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="text-xs font-semibold text-slate-500">
                        #{idx + 1}
                      </div>
                      <div className="mt-1 font-medium text-slate-900">
                        {it.item ?? "—"}
                      </div>
                      <div className="text-xs text-slate-500">
                        {it.location ?? "—"}
                      </div>
                      <div className="mt-2 text-xs text-slate-500">
                        {preset?.label ?? it.target_key ?? "—"}
                      </div>
                    </div>

                    {voiceSupported && (
                      <button
                        type="button"
                        onClick={() => {
                          if (isThisListening) {
                            stop();
                            setVoiceItemId(null);
                          } else {
                            setVoiceItemId(it.id);
                            start();
                          }
                        }}
                        className={cls(
                          "shrink-0 rounded-full border px-2 py-1 text-[11px] font-medium",
                          isThisListening
                            ? "border-red-200 bg-red-50 text-red-700"
                            : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                        )}
                        title="Voice entry"
                      >
                        {isThisListening ? "🎤…" : "🎤"}
                      </button>
                    )}
                  </div>

                  <input
                    className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 shadow-sm"
                    placeholder="e.g. 75"
                    value={temps[it.id] ?? ""}
                    onChange={(e) =>
                      setTemps((t) => ({
                        ...t,
                        [it.id]: e.target.value,
                      }))
                    }
                  />
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 border-t border-slate-200 bg-white px-4 py-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-100"
          >
            Cancel
          </button>

          <button
            type="submit"
            disabled={saving}
            className="rounded-xl bg-emerald-600 px-4 py-1.5 text-sm font-semibold text-white shadow-sm hover:bg-emerald-500 disabled:opacity-50"
          >
            {saving ? "Saving…" : "Save all"}
          </button>
        </div>
      </form>
    </div>
  );
}

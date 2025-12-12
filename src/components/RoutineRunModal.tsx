// src/components/RoutineRunModal.tsx
"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/lib/supabaseBrowser";
import { getActiveOrgIdClient } from "@/lib/orgClient";
import { getActiveLocationIdClient } from "@/lib/locationClient";
import { TARGET_BY_KEY, type TargetPreset } from "@/lib/temp-constants";
import type { RoutineRow } from "@/components/RoutinePickerModal";
import { useVoiceRoutineEntry } from "@/lib/useVoiceRoutineEntry";

type Props = {
  open: boolean;
  routine: RoutineRow | null;
  defaultDate: string;
  defaultInitials: string;
  onClose: () => void;
  onSaved: () => Promise<void> | void;
};

const cls = (...parts: Array<string | false | null | undefined>) =>
  parts.filter(Boolean).join(" ");

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

// ---------- matching helpers (item phrase -> routine item) ----------
function norm(s: string) {
  return (s ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function tokenScore(phrase: string, candidate: string) {
  const p = norm(phrase);
  const c = norm(candidate);
  if (!p || !c) return 0;
  if (c === p) return 999;
  if (c.includes(p)) return 200;
  const pTokens = new Set(p.split(" "));
  const cTokens = new Set(c.split(" "));
  let hit = 0;
  for (const t of pTokens) if (cTokens.has(t)) hit++;
  return hit;
}

function bestMatchIndex(
  phrase: string,
  items: Array<{ item?: string | null }>
) {
  let bestIdx = -1;
  let best = 0;

  for (let i = 0; i < items.length; i++) {
    const label = items[i]?.item ?? "";
    const score = tokenScore(phrase, label);
    if (score > best) {
      best = score;
      bestIdx = i;
    }
  }

  if (bestIdx >= 0 && best >= 1) return bestIdx;
  return -1;
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
  const [activeIdx, setActiveIdx] = useState(0);

  // refs for focus + autoscroll
  const inputRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const rowRefs = useRef<
    Record<string, HTMLTableRowElement | HTMLDivElement | null>
  >({});

  const items = useMemo(() => routine?.items ?? [], [routine]);

  // Reset when modal opens
  useEffect(() => {
    if (!open || !routine) return;

    setDate(defaultDate);
    setActiveIdx(0);

    const init: Record<string, string> = {};
    routine.items.forEach((it) => {
      init[it.id] = "";
    });
    setTemps(init);

    // don't clobber initials here; we resolve in "Load initials" effect
  }, [open, routine, defaultDate]);

  // Resolve initials: logged-in user first, then defaultInitials, then first active initials
  useEffect(() => {
    if (!open) return;

    (async () => {
      try {
        const [orgId, userRes] = await Promise.all([
          getActiveOrgIdClient(),
          supabase.auth.getUser(),
        ]);

        const email = userRes.data.user?.email?.toLowerCase() ?? null;

        // Build active initials list (for datalist)
        let list: string[] = [];
        if (orgId) {
          const { data } = await supabase
            .from("team_members")
            .select("initials, active")
            .eq("org_id", orgId)
            .eq("active", true)
            .order("initials");

          list = Array.from(
            new Set(
              (data ?? [])
                .map((r: any) =>
                  (r.initials ?? "").toString().toUpperCase().trim()
                )
                .filter(Boolean)
            )
          );
        }

        setInitialOptions(list);

        // Logged-in user's initials
        let mine = "";
        if (orgId && email) {
          const { data: tm } = await supabase
            .from("team_members")
            .select("initials")
            .eq("org_id", orgId)
            .eq("email", email)
            .maybeSingle();

          mine = (tm?.initials ?? "").toString().toUpperCase().trim();
        }

        const preferred =
          mine ||
          (defaultInitials ?? "").toString().toUpperCase().trim() ||
          list[0] ||
          "";

        setInitials((prev) => prev || preferred);
      } catch {
        // fallback hard
        const fallback =
          (defaultInitials ?? "").toString().toUpperCase().trim() || "";
        setInitials((prev) => prev || fallback);
      }
    })();
  }, [open, defaultInitials]);

  function nextEmptyIndex(from: number, snapshotTemps?: Record<string, string>) {
    const t = snapshotTemps ?? temps;
    for (let i = from + 1; i < items.length; i++) {
      const id = items[i]?.id;
      if (!id) continue;
      if (!(t[id] ?? "").trim()) return i;
    }
    return Math.min(from + 1, Math.max(0, items.length - 1));
  }

  // Voice hook (item phrase + temp)
  const { supported: voiceSupported, listening, start, stop } =
    useVoiceRoutineEntry({
      lang: "en-GB",
      onResult: (r) => {
        if (!open) return;

        if (r.command === "stop") {
          stop();
          return;
        }

        // choose index: match phrase if present, else current
        let idx = activeIdx;

        if (r.itemPhrase) {
          const matched = bestMatchIndex(r.itemPhrase, items);
          if (matched >= 0) {
            idx = matched;
            setActiveIdx(matched);
          }
        }

        if (r.temp_c) {
          const it = items[idx];
          if (!it) return;

          setTemps((prev) => {
            const next = { ...prev, [it.id]: r.temp_c! };
            const nextIdx = nextEmptyIndex(idx, next);
            setActiveIdx(nextIdx);
            return next;
          });
        }
      },
      onError: (msg) => {
        console.warn(msg);
      },
    });

  // Auto-scroll + focus active row/input
  useEffect(() => {
    if (!open) return;
    const it = items[activeIdx];
    if (!it) return;

    const row = rowRefs.current[it.id];
    row?.scrollIntoView?.({ behavior: "smooth", block: "center" });

    const input = inputRefs.current[it.id];
    input?.focus?.();
  }, [activeIdx, open, items]);

  if (!open || !routine) return null;

  async function handleSave(e?: React.FormEvent) {
    e?.preventDefault();
    if (!routine) return;
    if (!date || !initials) return;

    setSaving(true);

    try {
      const org_id = await getActiveOrgIdClient();
      const location_id = await getActiveLocationIdClient();

      if (!org_id || !location_id) {
        alert("Please select a location first.");
        return;
      }

      // selected date + current time
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

      const rowsToInsert = routine.items
        .map((it) => {
          const raw = (temps[it.id] ?? "").trim();
          if (!raw) return null;

          const temp = Number.isFinite(Number(raw)) ? Number(raw) : null;
          const preset =
            (TARGET_BY_KEY as Record<string, TargetPreset | undefined>)[
              it.target_key
            ];
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

      if (!rowsToInsert.length) {
        if (listening) stop();
        onClose();
        return;
      }

      const { error } = await supabase.from("food_temp_logs").insert(rowsToInsert);
      if (error) {
        alert(error.message);
        return;
      }

      await onSaved();
      if (listening) stop();
      onClose();
    } finally {
      setSaving(false);
    }
  }

  const activeId = items[activeIdx]?.id;
  const nowLabel = items[activeIdx]?.item ?? "—";
  const nextLabel =
    items[Math.min(activeIdx + 1, Math.max(0, items.length - 1))]?.item ?? "—";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-3 py-6"
      onClick={() => {
        if (listening) stop();
        onClose();
      }}
    >
      <form
        onSubmit={handleSave}
        onClick={(e) => e.stopPropagation()}
        className="relative flex w-full max-w-4xl max-h-[85vh] flex-col overflow-hidden rounded-2xl bg-white text-slate-900 shadow-2xl"
      >
        {/* Header */}
       {/* Header */}
<div className="sticky top-0 z-20 flex items-center justify-between border-b border-emerald-600/30 bg-emerald-600 px-3 py-2 text-white">

          <div className="min-w-0">
            <div className="text-[10px] uppercase tracking-widest text-emerald-100">
              Run routine
            </div>
            <div className="text-sm font-semibold truncate">{routine.name}</div>
          </div>

          <div className="flex items-center gap-2">
            {/* Voice button (explicit) */}
            {voiceSupported && (
              <button
                type="button"
                onClick={() => (listening ? stop() : start())}
                className={cls(
                  "rounded-full border px-2.5 py-1 text-[12px] font-semibold",
                  listening
                    ? "border-red-200 bg-red-50 text-red-700"
                    : "border-white/30 bg-white/15 text-white hover:bg-white/25"
                )}
                title="Voice entry"
              >
                {listening ? "🎤 Listening" : "🎤 Voice"}
              </button>
            )}

            <button
              type="button"
              onClick={() => {
                if (listening) stop();
                onClose();
              }}
              className="rounded-md bg-emerald-700 px-2.5 py-1 text-[12px] hover:bg-emerald-800"
            >
              Close
            </button>
          </div>
        </div>

        {/* Sticky “Now / Next” */}
        <div className="sticky top-0 z-10 border-b border-slate-200 bg-white px-3 py-2 text-[12px]">
          <div className="font-semibold text-slate-900 truncate">Now: {nowLabel}</div>
          <div className="text-slate-600 truncate">Next: {nextLabel}</div>
        </div>

        {/* Body (compact) */}
        <div className="flex-1 min-h-0 overflow-y-auto bg-white px-3 py-3 space-y-3">
          {/* Date + Initials */}
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <label className="text-[12px] font-medium">
              Date
              <input
                type="date"
                className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-[13px] shadow-sm"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
              />
            </label>



            <label className="text-[12px] font-medium">
              Initials (auto from logged-in user)
              <input
                list="initials-list"
                className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-[13px] uppercase shadow-sm"
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

          {voiceSupported && (
            <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-[11px] text-slate-700">
              Say: <strong>"chicken curry 5.1"</strong> or <strong>"stop"</strong>. It
              matches your phrase to the closest routine item name and fills that temp.
            </div>
          )}

          {/* DESKTOP TABLE (compact) */}
          <div className="hidden md:block rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
            <table className="w-full text-[13px]">
              <thead className="bg-slate-100 text-slate-600">
                <tr>
                  <th className="p-1.5 text-left text-[11px] font-semibold w-10">#</th>
                  <th className="p-1.5 text-left text-[11px] font-semibold">Location</th>
                  <th className="p-1.5 text-left text-[11px] font-semibold">Item</th>
                  <th className="p-1.5 text-left text-[11px] font-semibold">Target</th>
                  <th className="p-1.5 text-left text-[11px] font-semibold w-24">Temp</th>
                </tr>
              </thead>

              <tbody>
                {routine.items.map((it, idx) => {
                  const preset =
                    (TARGET_BY_KEY as Record<string, TargetPreset | undefined>)[it.target_key];
                  const isActive = it.id === activeId;

                  return (
                    <tr
                      key={it.id}
                      ref={(el) => {
                        rowRefs.current[it.id] = el;
                      }}
                      className={cls("border-t border-slate-100", isActive && "bg-emerald-50")}
                      onClick={() => setActiveIdx(idx)}
                    >
                      <td className="p-1.5">{idx + 1}</td>
                      <td className="p-1.5">{it.location ?? "—"}</td>
                      <td className="p-1.5">{it.item ?? "—"}</td>
                      <td className="p-1.5 text-[11px] text-slate-500">
                        {preset?.label ?? it.target_key ?? "—"}
                      </td>
                      <td className="p-1.5">
                        <input
                          ref={(el) => {
                            inputRefs.current[it.id] = el;
                          }}
                          className={cls(
                            "w-20 rounded-lg border bg-white px-2 py-1 text-[13px] shadow-sm",
                            isActive
                              ? "border-emerald-300 ring-2 ring-emerald-200"
                              : "border-slate-300"
                          )}
                          value={temps[it.id] ?? ""}
                          inputMode="decimal"
                          onChange={(e) =>
                            setTemps((t) => ({
                              ...t,
                              [it.id]: e.target.value,
                            }))
                          }
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              setActiveIdx((i) => nextEmptyIndex(i));
                            }
                          }}
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* MOBILE CARDS (compact) */}
          <div className="space-y-2 md:hidden">
            {routine.items.map((it, idx) => {
              const preset =
                (TARGET_BY_KEY as Record<string, TargetPreset | undefined>)[it.target_key];
              const isActive = it.id === activeId;

              return (
                <div
                  key={it.id}
                  ref={(el) => {
                    rowRefs.current[it.id] = el;
                  }}
                  className={cls(
                    "rounded-xl border p-2 shadow-sm",
                    isActive ? "border-emerald-300 bg-emerald-50" : "border-slate-200 bg-white"
                  )}
                  onClick={() => setActiveIdx(idx)}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="text-[11px] font-semibold text-slate-500">
                        #{idx + 1} {isActive ? "· Active" : ""}
                      </div>
                      <div className="mt-0.5 text-[13px] font-semibold text-slate-900 truncate">
                        {it.item ?? "—"}
                      </div>
                      <div className="text-[11px] text-slate-500 truncate">
                        {it.location ?? "—"}
                      </div>
                      <div className="mt-1 text-[11px] text-slate-500 truncate">
                        {preset?.label ?? it.target_key ?? "—"}
                      </div>
                    </div>

                    <input
                      ref={(el) => {
                        inputRefs.current[it.id] = el;
                      }}
                      className={cls(
                        "w-24 rounded-lg border bg-white px-2 py-1 text-[13px] shadow-sm",
                        isActive ? "border-emerald-300 ring-2 ring-emerald-200" : "border-slate-300"
                      )}
                      placeholder="Temp"
                      value={temps[it.id] ?? ""}
                      inputMode="decimal"
                      onChange={(e) =>
                        setTemps((t) => ({
                          ...t,
                          [it.id]: e.target.value,
                        }))
                      }
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          setActiveIdx((i) => nextEmptyIndex(i));
                        }
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-between gap-2 border-t border-slate-200 bg-white px-3 py-2">
          <button
            type="button"
            onClick={() => {
              if (listening) stop();
              onClose();
            }}
            className="rounded-lg px-3 py-1.5 text-[13px] text-slate-700 hover:bg-slate-100"
          >
            Cancel
          </button>

          <button
            type="submit"
            disabled={saving}
            className="rounded-xl bg-emerald-600 px-4 py-1.5 text-[13px] font-semibold text-white shadow-sm hover:bg-emerald-500 disabled:opacity-50"
          >
            {saving ? "Saving…" : "Save all"}
          </button>
        </div>
      </form>
    </div>
  );
}

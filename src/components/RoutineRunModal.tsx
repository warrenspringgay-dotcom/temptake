"use client";

import React, { useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabaseBrowser";
import { getActiveOrgIdClient } from "@/lib/orgClient";
import { getActiveLocationIdClient } from "@/lib/locationClient";
import { TARGET_BY_KEY, type TargetPreset } from "@/lib/temp-constants";
import type { RoutineRow } from "@/components/RoutinePickerModal";
import { useVoiceRoutineEntry } from "@/lib/useVoiceRoutineEntry";

/* ================= utils ================= */

const cls = (...p: Array<string | false | undefined | null>) =>
  p.filter(Boolean).join(" ");

function norm(s: string) {
  return s
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

  const pt = new Set(p.split(" "));
  const ct = new Set(c.split(" "));
  let hits = 0;
  pt.forEach((t) => ct.has(t) && hits++);
  return hits;
}

function bestMatchIndex(
  phrase: string,
  items: { item?: string | null }[]
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

  return best >= 1 ? bestIdx : -1;
}

function inferStatus(
  temp: number | null,
  preset?: TargetPreset
): "pass" | "fail" | null {
  if (temp == null || !preset) return null;
  if (preset.minC != null && temp < preset.minC) return "fail";
  if (preset.maxC != null && temp > preset.maxC) return "fail";
  return "pass";
}

/* ================= component ================= */

type Props = {
  open: boolean;
  routine: RoutineRow | null;
  defaultDate: string;
  defaultInitials: string;
  onClose: () => void;
  onSaved: () => Promise<void> | void;
};

export default function RoutineRunModal({
  open,
  routine,
  defaultDate,
  defaultInitials,
  onClose,
  onSaved,
}: Props) {
  if (!open || !routine) return null;

  const items = routine.items;

  const [date, setDate] = useState(defaultDate);
  const [initials, setInitials] = useState(defaultInitials || "");
  const [temps, setTemps] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [initialOptions, setInitialOptions] = useState<string[]>([]);
  const [activeIdx, setActiveIdx] = useState(0);

  const inputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  /* ---------- reset on open ---------- */
  useEffect(() => {
    const init: Record<string, string> = {};
    items.forEach((it) => (init[it.id] = ""));
    setTemps(init);
    setActiveIdx(0);
    setDate(defaultDate);
    setInitials(defaultInitials || "");
  }, [open, routine]);

  /* ---------- initials ---------- */
  useEffect(() => {
    (async () => {
      const orgId = await getActiveOrgIdClient();
      if (!orgId) return;

      const { data } = await supabase
        .from("team_members")
        .select("initials")
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
      setInitials((v) => v || list[0] || "");
    })();
  }, [open]);

  /* ---------- voice ---------- */
  const { supported, listening, start, stop } = useVoiceRoutineEntry({
    lang: "en-GB",
    onResult: (r) => {
      if (r.command === "stop") {
        stop();
        return;
      }

      let idx = activeIdx;

      if (r.itemPhrase) {
        const m = bestMatchIndex(r.itemPhrase, items);
        if (m >= 0) {
          idx = m;
          setActiveIdx(m);
        }
      }

      if (r.temp_c) {
        const it = items[idx];
        if (!it) return;

        setTemps((t) => ({ ...t, [it.id]: r.temp_c! }));
        inputRefs.current[it.id]?.focus();
      }
    },
  });

  useEffect(() => {
    const it = items[activeIdx];
    if (it) inputRefs.current[it.id]?.focus();
  }, [activeIdx]);

  /* ---------- save ---------- */
  async function handleSave(e?: React.FormEvent) {
    e?.preventDefault();
    if (!date || !initials) return;

    setSaving(true);

    try {
      const org_id = await getActiveOrgIdClient();
      const location_id = await getActiveLocationIdClient();
      if (!org_id || !location_id) return;

      const selected = new Date(date);
      const now = new Date();

      const atIso = new Date(
        selected.getFullYear(),
        selected.getMonth(),
        selected.getDate(),
        now.getHours(),
        now.getMinutes(),
        now.getSeconds(),
        now.getMilliseconds()
      ).toISOString();

      const rows = items
        .map((it) => {
          const raw = temps[it.id]?.trim();
          if (!raw) return null;

          const temp = Number(raw);
          const preset =
            (TARGET_BY_KEY as Record<string, TargetPreset | undefined>)[
              it.target_key
            ];

          return {
            org_id,
            location_id,
            at: atIso,
            area: it.location ?? null,
            note: it.item ?? null,
            staff_initials: initials.toUpperCase(),
            target_key: it.target_key,
            temp_c: Number.isFinite(temp) ? temp : null,
            status: inferStatus(
              Number.isFinite(temp) ? temp : null,
              preset
            ),
          };
        })
        .filter(Boolean);

      if (!rows.length) {
        onClose();
        return;
      }

      const { error } = await supabase.from("food_temp_logs").insert(rows);
      if (error) throw error;

      await onSaved();
      onClose();
    } finally {
      setSaving(false);
    }
  }

  const activeId = items[activeIdx]?.id;

  /* ================= render ================= */

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
        className="flex w-full max-w-4xl max-h-[85vh] flex-col overflow-hidden rounded-2xl bg-white shadow-2xl"
      >
        {/* Header */}
        <div className="flex items-center justify-between bg-emerald-600 px-4 py-3 text-white">
          <div className="font-semibold">{routine.name}</div>
          <div className="flex items-center gap-2">
            {supported && (
              <button
                type="button"
                onClick={() => (listening ? stop() : start())}
                className={cls(
                  "rounded-full px-3 py-1 text-xs font-semibold",
                  listening
                    ? "bg-red-100 text-red-700"
                    : "bg-white/20 hover:bg-white/30"
                )}
              >
                🎤 {listening ? "Listening" : "Voice"}
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="rounded bg-emerald-700 px-3 py-1 text-sm"
            >
              Close
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {items.map((it, idx) => {
            const active = it.id === activeId;
            return (
              <div
                key={it.id}
                onClick={() => setActiveIdx(idx)}
                className={cls(
                  "rounded-xl border p-3",
                  active
                    ? "border-emerald-400 bg-emerald-50"
                    : "border-slate-200"
                )}
              >
                <div className="text-sm font-medium">{it.item ?? "—"}</div>
                <div className="text-xs text-slate-500">{it.location ?? "—"}</div>
                <input
                  ref={(el) => {
  inputRefs.current[it.id] = el;
}}

                  className="mt-2 w-full rounded-lg border px-3 py-2"
                  placeholder="Temperature"
                  value={temps[it.id] ?? ""}
                  onChange={(e) =>
                    setTemps((t) => ({ ...t, [it.id]: e.target.value }))
                  }
                />
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 border-t p-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded px-3 py-1.5 text-sm"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="rounded bg-emerald-600 px-4 py-1.5 text-sm font-semibold text-white disabled:opacity-50"
          >
            {saving ? "Saving…" : "Save all"}
          </button>
        </div>
      </form>
    </div>
  );
}

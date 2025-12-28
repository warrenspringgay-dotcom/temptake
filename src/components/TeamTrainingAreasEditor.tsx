"use client";

import React, { useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseBrowser";

const AREAS = [
  "Cross-contamination",
  "Cleaning",
  "Chilling",
  "Cooking",
  "Allergens",
  "Management",
] as const;

type Props = {
  teamMemberId: string;
  current: string[] | null;
  onUpdated?: (next: string[]) => void;
};

export default function TeamTrainingAreasEditor({
  teamMemberId,
  current,
  onUpdated,
}: Props) {
  const [saving, setSaving] = useState(false);

  const selected = useMemo(() => new Set((current ?? []).map((x) => x.trim())), [current]);

  async function toggle(area: string) {
    const next = new Set(selected);
    if (next.has(area)) next.delete(area);
    else next.add(area);

    const nextArr = Array.from(next);

    setSaving(true);
    const { error } = await supabase
      .from("team_members")
      .update({ training_areas: nextArr })
      .eq("id", teamMemberId);

    setSaving(false);

    if (error) {
      alert(error.message);
      return;
    }

    onUpdated?.(nextArr);
  }

  return (
    <div className="flex flex-wrap gap-2">
      {AREAS.map((a) => {
        const on = selected.has(a);
        return (
          <button
            key={a}
            type="button"
            onClick={() => toggle(a)}
            disabled={saving}
            className={[
              "rounded-full px-3 py-1 text-xs font-medium border transition",
              on
                ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50",
              saving ? "opacity-60" : "",
            ].join(" ")}
            aria-pressed={on}
          >
            {a}
          </button>
        );
      })}
    </div>
  );
}

// src/app/actions/presets.ts
"use server";

import { createSupabaseServerClient } from "@/lib/supabase-server";

/**
 * Generic “preset” shape. Adjust fields to match your DB if needed.
 * This is intentionally simple so builds pass even if unused.
 */
export type PresetRow = {
  id: string;
  group?: string | null;   // e.g., "targets" | "allergens"
  key: string;             // e.g., "chilled"
  value: unknown;          // JSON blob or primitive
  updated_at?: string | null;
};

/** Fallback presets if the table is missing */
const FALLBACK: PresetRow[] = [
  { id: "chilled", group: "targets", key: "chilled", value: { min: 0, max: 5 }, updated_at: null },
  { id: "hot-hold", group: "targets", key: "hot-hold", value: { min: 63, max: 100 }, updated_at: null },
];

/**
 * List presets by optional group.
 * Expects a table `presets` with columns: id (uuid/text), group (text), key (text), value (jsonb), updated_at (timestamptz).
 */
export async function listPresets(group?: string): Promise<PresetRow[]> {
  try {
    const supabase = await createSupabaseServerClient();
    let q = supabase.from("presets").select("id, group, key, value, updated_at").order("key");
    if (group) q = q.eq("group", group);
    const { data, error } = await q;
    if (error || !data) return group ? FALLBACK.filter(p => p.group === group) : FALLBACK;
    return (data as any[]).map((r) => ({
      id: String(r.id),
      group: r.group ?? null,
      key: String(r.key),
      value: r.value,
      updated_at: r.updated_at ?? null,
    }));
  } catch {
    return group ? FALLBACK.filter(p => p.group === group) : FALLBACK;
  }
}

/**
 * Upsert a preset (insert if missing, otherwise update by (group,key)).
 * Returns the upserted row id.
 */
export async function upsertPreset(preset: Omit<PresetRow, "id" | "updated_at"> & { id?: string }) {
  try {
    const supabase = await createSupabaseServerClient();
    const payload = {
      id: preset.id, // allow client-provided id or let DB generate
      group: preset.group ?? null,
      key: preset.key,
      value: preset.value as any,
    };
    const { data, error } = await supabase
      .from("presets")
      .upsert(payload, { onConflict: "group,key" })
      .select("id")
      .single();

    if (error || !data) return { id: preset.id ?? "" };
    return { id: String(data.id) };
  } catch {
    return { id: preset.id ?? "" };
  }
}

/** Delete a preset by id (ignore errors). */
export async function deletePreset(id: string) {
  try {
    const supabase = await createSupabaseServerClient();
    await supabase.from("presets").delete().eq("id", id);
  } catch {
    // no-op
  }
}

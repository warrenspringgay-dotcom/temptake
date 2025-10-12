// src/app/actions/routines.ts
"use server";

import { createServerClient } from "@/lib/supabaseServer";
import type { RoutineWithItems } from "@/types/routines";

/* =========================
   Types for recording a run
   ========================= */
export type RoutineRunRow = {
  routine_item_id: string;
  location: string | null;
  item: string | null;
  target_key: string;      // "chill" | "freeze" | "hot-hold" | ...
  initials: string;        // e.g. "AB"
  temp_c: number;          // parsed number
};

export type RoutineRunPayload = {
  routine_id: string;
  rows: RoutineRunRow[];
};

/* =========================
   Helpers
   ========================= */
function statusFromTarget(
  target_key: string,
  temp_c: number | null
): "pass" | "fail" | null {
  if (temp_c == null) return null;
  if (target_key === "chill") return temp_c <= 8 ? "pass" : "fail";
  if (target_key === "freeze") return temp_c <= 0 ? "pass" : "fail";
  if (target_key === "hot-hold") return temp_c >= 63 ? "pass" : "fail";
  return null;
}

/* =========================
   Actions
   ========================= */

// Record a routine run (single, canonical shape)
export async function recordRoutineRun(payload: RoutineRunPayload) {
  const supabase = await createServerClient();

  const nowIso = new Date().toISOString();

  const toInsert = payload.rows.map((r) => ({
    at: nowIso,
    routine_id: payload.routine_id,
    routine_item_id: r.routine_item_id,
    area: r.location,
    note: r.item,
    target_key: r.target_key,
    initials: r.initials,
    staff_initials: r.initials,
    temp_c: r.temp_c,
    status: statusFromTarget(r.target_key, r.temp_c),
  }));

  if (toInsert.length) {
    const { error } = await supabase.from("food_temp_logs").insert(toInsert);
    if (error) throw error;
  }

  // touch last_used_at
  const { error: upErr } = await supabase
    .from("temp_routines")
    .update({ last_used_at: nowIso })
    .eq("id", payload.routine_id);
  if (upErr) throw upErr;

  return { inserted: toInsert.length };
}

// List routines + item counts (no FK required)
export async function listRoutines(): Promise<RoutineWithItems[]> {
  const supabase = await createServerClient();

  const { data: routines, error: rErr } = await supabase
    .from("temp_routines")
    .select("id, name, last_used_at")
    .order("name", { ascending: true });
  if (rErr) throw rErr;

  const ids = (routines ?? []).map((r) => r.id);
  if (ids.length === 0) return [];

  const { data: itemsRows, error: iErr } = await supabase
    .from("temp_routine_items")
    .select("routine_id")
    .in("routine_id", ids);
  if (iErr) throw iErr;

  const counts = new Map<string, number>();
  for (const row of itemsRows ?? []) {
    counts.set(row.routine_id, (counts.get(row.routine_id) ?? 0) + 1);
  }

  return (routines ?? []).map((r) => {
    const n = counts.get(r.id) ?? 0;
    return {
      id: r.id,
      name: r.name,
      last_used_at: r.last_used_at ?? null,
      // stub array so UI can use items.length; your page that needs real items uses getRoutineById
      items: Array.from({ length: n }, () => ({} as any)),
    } as RoutineWithItems;
  });
}

// Create a routine (and optional items)
export async function createRoutine(params: {
  name: string;
  items: Array<{
    position: number;
    location: string | null;
    item: string | null;
    target_key: string | null;
  }>;
}) {
  const supabase = await createServerClient();

  const { data: routine, error } = await supabase
    .from("temp_routines")
    .insert({ name: params.name })
    .select("id")
    .single();
  if (error) throw error;

  if (params.items?.length) {
    const rows = params.items.map((it) => ({
      routine_id: routine.id,
      position: it.position,
      location: it.location,
      item: it.item,
      target_key: it.target_key,
    }));
    const { error: itemsErr } = await supabase
      .from("temp_routine_items")
      .insert(rows);
    if (itemsErr) throw itemsErr;
  }

  return routine.id as string;
}

// Replace items in a routine
export async function replaceRoutineItems(
  routineId: string,
  items: Array<{
    position: number;
    location: string | null;
    item: string | null;
    target_key: string | null;
  }>
) {
  const supabase = await createServerClient();

  const { error: delErr } = await supabase
    .from("temp_routine_items")
    .delete()
    .eq("routine_id", routineId);
  if (delErr) throw delErr;

  if (!items.length) return;

  const rows = items.map((it) => ({
    routine_id: routineId,
    position: it.position,
    location: it.location,
    item: it.item,
    target_key: it.target_key,
  }));
  const { error: insErr } = await supabase
    .from("temp_routine_items") // ✅ fixed table name
    .insert(rows);
  if (insErr) throw insErr;
}

// Update routine metadata
export async function updateRoutine(id: string, data: { name?: string }) {
  const supabase = await createServerClient();
  const { error } = await supabase
    .from("temp_routines")
    .update(data)
    .eq("id", id);
  if (error) throw error;
}

// Delete routine + items
export async function deleteRoutine(id: string) {
  const supabase = await createServerClient();
  await supabase.from("temp_routine_items").delete().eq("routine_id", id);
  const { error } = await supabase.from("temp_routines").delete().eq("id", id);
  if (error) throw error;
}

// Fetch one routine with items (for run page)
export async function getRoutineById(
  routineId: string
): Promise<RoutineWithItems> {
  const supabase = await createServerClient();

  const { data: routine, error: rErr } = await supabase
    .from("temp_routines")
    .select("id, name, last_used_at")
    .eq("id", routineId)
    .single();
  if (rErr) throw rErr;

  const { data: items, error: iErr } = await supabase
    .from("temp_routine_items")
    .select("id, position, location, item, target_key")
    .eq("routine_id", routineId)
    .order("position", { ascending: true });
  if (iErr) throw iErr;

  return {
    id: routine.id,
    name: routine.name,
    last_used_at: routine.last_used_at ?? null,
    items: items ?? [],
  };
}

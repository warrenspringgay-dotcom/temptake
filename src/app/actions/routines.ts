// at top of file:
"use server";
import { createServerClient } from "@/lib/supabaseServer";
import type { RoutineWithItems } from "@/types/routines"; // or inline your own type

/**
 * Fetch routines and compute item counts without relying on a PostgREST relation.
 * Works even if there is no FK from routine_items.routine_id -> temp_routines.id.
 */
export async function listRoutines(): Promise<RoutineWithItems[]> {
  const supabase = await createServerClient();

  // 1) routines
  const { data: routines, error: rErr } = await supabase
    .from("temp_routines")
    .select("id, name, last_used_at")
    .order("name", { ascending: true });

  if (rErr) throw new Error(rErr.message);

  const ids = (routines ?? []).map((r: any) => r.id);
  if (ids.length === 0) return [];

  // 2) fetch all items' routine_id for these routines, then count in JS
  const { data: itemsRows, error: iErr } = await supabase
    .from("temp_routine_items")
    .select("routine_id")
    .in("routine_id", ids);

  if (iErr) throw new Error(iErr.message);

  const counts = new Map<string, number>();
  for (const row of itemsRows ?? []) {
    counts.set(row.routine_id, (counts.get(row.routine_id) ?? 0) + 1);
  }

  // 3) return routines with a fake items array of the correct length (for UI)
  return (routines ?? []).map((r: any) => {
    const n = counts.get(r.id) ?? 0;
    return {
      id: r.id,
      name: r.name,
      last_used_at: r.last_used_at ?? null,
      // create an array of the right length so your UI can do r.items.length
      items: Array.from({ length: n }, () => ({})),
    } as RoutineWithItems;
  });
}

/**
 * Create a new routine
 */
export async function createRoutine(params: {
  name: string;
  items: Array<{ position: number; location: string | null; item: string | null; target_key: string | null }>;
}) {
  const supabase = await createServerClient();

  const { data: routine, error } = await supabase
    .from("temp_routines")
    .insert({ name: params.name })
    .select("id")
    .single();

  if (error) throw error;

  if (params.items?.length) {
    const rows = params.items.map(it => ({
      routine_id: routine.id,
      position: it.position,
      location: it.location,
      item: it.item,
      target_key: it.target_key,
    }));
    const { error: itemsErr } = await supabase.from("routine_items").insert(rows);
    if (itemsErr) throw itemsErr;
  }

  return routine.id as string;
}

/**
 * Replace all items in a routine
 */
export async function replaceRoutineItems(
  routineId: string,
  items: Array<{ position: number; location: string | null; item: string | null; target_key: string | null }>
) {
  const supabase = await createServerClient();

  const { error: delErr } = await supabase
    .from("routine_items")
    .delete()
    .eq("routine_id", routineId);

  if (delErr) throw delErr;

  if (items.length) {
    const rows = items.map(it => ({
      routine_id: routineId,
      position: it.position,
      location: it.location,
      item: it.item,
      target_key: it.target_key,
    }));
    const { error: insErr } = await supabase.from("routine_items").insert(rows);
    if (insErr) throw insErr;
  }
}

/**
 * Update routine name or metadata
 */
export async function updateRoutine(id: string, data: { name?: string }) {
  const supabase = await createServerClient();
  const { error } = await supabase.from("temp_routines").update(data).eq("id", id);
  if (error) throw error;
}

/**
 * Delete routine and items
 */
export async function deleteRoutine(id: string) {
  const supabase = await createServerClient();
  await supabase.from("routine_items").delete().eq("routine_id", id);
  const { error } = await supabase.from("temp_routines").delete().eq("id", id);
  if (error) throw error;
}

/**
 * Fetch one routine by ID (for run page)
 */
export async function getRoutineById(routineId: string): Promise<RoutineWithItems> {
  const supabase = await createServerClient();

  const { data: routine, error: rErr } = await supabase
    .from("temp_routines")
    .select("id, name, last_used_at")
    .eq("id", routineId)
    .single();

  if (rErr) throw rErr;

  const { data: items, error: iErr } = await supabase
    .from("routine_items")
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
// -- record a routine run (supports old & new call shapes) --
type RoutineRunRow = {
  position?: number;
  location: string | null;
  item: string | null;
  target_key: string | null;
  initials?: string | null;
  temp_c?: number | null;
};

type RoutineRunPayload =
  | { routine_id: string; entries?: RoutineRunRow[]; rows?: RoutineRunRow[] }
  | [routineId: string, rows: RoutineRunRow[]]; // backward-compat tuple

export async function recordRoutineRun(
  arg1: RoutineRunPayload | string,
  arg2?: RoutineRunRow[]
) {
  const supabase = await createServerClient();

  // accept both: recordRoutineRun(routineId, rows) and recordRoutineRun({ routine_id, entries })
  let routine_id: string;
  let rows: RoutineRunRow[];

  if (typeof arg1 === "string") {
    routine_id = arg1;
    rows = Array.isArray(arg2) ? arg2 : [];
  } else if (Array.isArray(arg1)) {
    routine_id = arg1[0];
    rows = Array.isArray(arg1[1]) ? arg1[1] : [];
  } else {
    routine_id = arg1.routine_id;
    rows = arg1.entries ?? arg1.rows ?? [];
  }

  if (!routine_id) throw new Error("routine_id required");

  const nowIso = new Date().toISOString();

  // Map to your food_temp_logs schema
  const insertRows = rows.map((r) => ({
    at: nowIso,
    routine_id,
    area: r.location ?? null,
    note: r.item ?? null,
    target_key: r.target_key ?? null,
    staff_initials: r.initials ?? null,
    temp_c: r.temp_c ?? null,
    status: null, // compute later if you have logic
  }));

  if (insertRows.length) {
    const { error: insErr } = await supabase
      .from("food_temp_logs")
      .insert(insertRows);
    if (insErr) throw new Error(insErr.message);
  }

  // touch last_used_at on the routine (your routines table is temp_routines)
  const { error: upErr } = await supabase
    .from("temp_routines")
    .update({ last_used_at: nowIso })
    .eq("id", routine_id);
  if (upErr) throw new Error(upErr.message);

  return { inserted: insertRows.length };
}

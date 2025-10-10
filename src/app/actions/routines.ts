// src/app/actions/routines.ts
"use server";

/**
 * Server actions for temperature "routines" made of many preset entries.
 * Tables expected:
 *  - public.temp_routines:      { id uuid pk, name text, created_by uuid, last_used_at timestamptz null, updated_at timestamptz ... }
 *  - public.temp_routine_items: { id uuid pk, routine_id uuid fk->temp_routines.id, position int, location text null, item text null, target_key text }
 */

import { createServerClient } from "@/lib/supabase-server"; // ← if your project uses "@/lib/supabaseServer", swap the import

/* ---------- Types ---------- */

export type Routine = {
  id: string;
  name: string;
  last_used_at: string | null;
  updated_at?: string | null;
};

export type RoutineItem = {
  id: string;
  routine_id: string;
  position: number;
  location: string | null;
  item: string | null;
  target_key: string;
};

export type RoutineItemInput = {
  position: number;
  location?: string | null;
  item?: string | null;
  target_key: string;
};

export type RoutineWithItems = Routine & { items: RoutineItem[] };

/* ---------- List routines with their items ---------- */

export async function listRoutinesWithItems(): Promise<RoutineWithItems[]> {
  const supabase = await createServerClient();

  // base routines
  const { data: routines, error: rErr } = await supabase
    .from("temp_routines")
    .select("id, name, last_used_at, updated_at")
    .order("updated_at", { ascending: false })
    .limit(200);

  if (rErr) throw rErr;

  const base: RoutineWithItems[] = (routines ?? []).map((r: any) => ({
    id: String(r.id),
    name: String(r.name ?? "Untitled"),
    last_used_at: r.last_used_at ?? null,
    updated_at: r.updated_at ?? null,
    items: [],
  }));

  const ids = base.map((b) => b.id);
  if (ids.length === 0) return base;

  // items for those routines
  const { data: items, error: iErr } = await supabase
    .from("temp_routine_items")
    .select("id, routine_id, position, location, item, target_key")
    .in("routine_id", ids)
    .order("position", { ascending: true });

  if (iErr) throw iErr;

  const byId = new Map(base.map((b) => [b.id, b]));
  (items ?? []).forEach((it: any) => {
    const bucket = byId.get(String(it.routine_id));
    if (!bucket) return;
    bucket.items.push({
      id: String(it.id),
      routine_id: String(it.routine_id),
      position: Number(it.position ?? 0),
      location: it.location ?? null,
      item: it.item ?? null,
      target_key: String(it.target_key),
    });
  });

  return base;
}

// Back-compat alias so older clients importing `listRoutines` keep working:
export const listRoutines = listRoutinesWithItems;

/* ---------- Create a routine (optionally with items) ---------- */
// --- ADD: fetch a single routine with items (ordered) ---
export async function getRoutineById(routineId: string) {
  const { data: routine, error: rErr } = await supabase
    .from("routines")
    .select("id, name")
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
    id: routine.id as string,
    name: routine.name as string,
    items: (items ?? []).map((it) => ({
      id: String(it.id),
      position: Number(it.position ?? 0),
      location: it.location as string | null,
      item: it.item as string | null,
      target_key: it.target_key as string,
    })),
  };
}

// --- ADD: write many temp logs as one run ---
type RunRowInput = {
  location: string | null;
  item: string | null;
  target_key: string;
  initials: string;
  temp_c: number;
};

export async function recordRoutineRun(
  routineId: string,
  rows: RunRowInput[]
) {
  if (!rows.length) return;

  const nowISO = new Date().toISOString();

  const payload = rows.map((r) => ({
    at: nowISO,
    area: r.location,                 // ← your app uses "area" as location field
    note: r.item,                     // ← human-readable item
    temp_c: r.temp_c,
    target_key: r.target_key,
    status: null,                     // (optional) let DB compute or leave null
    initials: r.initials,             // if your column is "staff_initials", feel free to duplicate
    staff_initials: r.initials,
    routine_id: routineId,
  }));

  const { error } = await supabase.from("food_temp_logs").insert(payload);
  if (error) throw error;

  // update last used (optional)
  await supabase
    .from("routines")
    .update({ last_used_at: nowISO })
    .eq("id", routineId);
}


export async function createRoutine(input: {
  name: string;
  items?: RoutineItemInput[];
}): Promise<string> {
  const supabase = await createServerClient();

  const { data: me } = await supabase.auth.getUser();
  const uid = me?.user?.id;
  if (!uid) throw new Error("Not signed in.");

  const { data: created, error } = await supabase
    .from("temp_routines")
    .insert({ name: input.name, created_by: uid, last_used_at: null })
    .select("id")
    .single();

  if (error) throw error;
  const routineId = String(created!.id);

  if (input.items?.length) {
    const payload = input.items.map((it, idx) => ({
      routine_id: routineId,
      position: it.position ?? idx,
      location: (it.location ?? null) as string | null,
      item: (it.item ?? null) as string | null,
      target_key: it.target_key,
    }));
    const { error: iErr } = await supabase.from("temp_routine_items").insert(payload);
    if (iErr) throw iErr;
  }

  return routineId;
}

/* ---------- Replace all items for a routine ---------- */

export async function replaceRoutineItems(
  routineId: string,
  items: RoutineItemInput[]
): Promise<void> {
  const supabase = await createServerClient();

  // wipe then bulk insert
  const { error: delErr } = await supabase
    .from("temp_routine_items")
    .delete()
    .eq("routine_id", routineId);
  if (delErr) throw delErr;

  if (items.length === 0) return;

  const payload = items.map((it, idx) => ({
    routine_id: routineId,
    position: it.position ?? idx,
    location: (it.location ?? null) as string | null,
    item: (it.item ?? null) as string | null,
    target_key: it.target_key,
  }));

  const { error: insErr } = await supabase.from("temp_routine_items").insert(payload);
  if (insErr) throw insErr;
}

/* ---------- Update routine meta (name / last_used_at) ---------- */
// --- single routine with items ---------------------------------------------
export async function getRoutineWithItems(id: string): Promise<RoutineWithItems | null> {
  const supabase = await createServerClient();

  // fetch routine
  const { data: r, error: rErr } = await supabase
    .from("temp_routines")
    .select("id, name, last_used_at")
    .eq("id", id)
    .maybeSingle();

  if (rErr) throw rErr;
  if (!r) return null;

  // fetch items
  const { data: items, error: iErr } = await supabase
    .from("temp_routine_items")
    .select("id, routine_id, position, location, item, target_key")
    .eq("routine_id", r.id)
    .order("position", { ascending: true });

  if (iErr) throw iErr;

  return {
    id: String(r.id),
    name: String(r.name ?? "Untitled"),
    last_used_at: r.last_used_at ?? null,
    items: (items ?? []).map((it: any) => ({

      id: String(it.id),
      routine_id: String(it.routine_id),
      position: Number(it.position ?? 0),
      location: it.location ?? null,
      item: it.item ?? null,
      target_key: String(it.target_key),
    })),
  };
}


export async function updateRoutine(
  id: string,
  patch: Partial<Pick<Routine, "name" | "last_used_at">>
): Promise<void> {
  const supabase = await createServerClient();
  const { error } = await supabase.from("temp_routines").update(patch).eq("id", id);
  if (error) throw error;
}

/* ---------- Delete routine (and cascade items) ---------- */

export async function deleteRoutine(id: string): Promise<void> {
  const supabase = await createServerClient();

  // remove items first (in case FK is not ON DELETE CASCADE)
  const { error: iErr } = await supabase.from("temp_routine_items").delete().eq("routine_id", id);
  if (iErr) throw iErr;

  const { error: rErr } = await supabase.from("temp_routines").delete().eq("id", id);
  if (rErr) throw rErr;
}

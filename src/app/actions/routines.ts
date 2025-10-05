// src/app/actions/routines.ts
"use server";

import { createServerClient } from "@/lib/supabaseServer";

export type Routine = {
  id: string;
  name: string;
  last_used_at: string | null;
  created_by?: string | null;
  created_at?: string | null;
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

export type RoutineItemInput = Omit<RoutineItem, "id" | "routine_id" | "position"> & {
  position?: number;
};

export type RoutineWithItems = Routine & { items: RoutineItem[] };

// legacy alias
export type TempRoutine = Routine;

/** ALWAYS returns RoutineWithItems[] (items = [] when not loaded). */
export async function listRoutines(withItems = true): Promise<RoutineWithItems[]> {
  const supabase = await createServerClient();

  const { data: routines, error } = await supabase
    .from("temp_routines")
    .select("id, name, last_used_at, created_by, created_at, updated_at")
    .order("updated_at", { ascending: false })
    .limit(200);

  if (error) throw error;

  const base: RoutineWithItems[] = (routines ?? []).map((r) => ({
    id: String(r.id),
    name: String(r.name ?? "Untitled"),
    last_used_at: r.last_used_at ?? null,
    created_by: r.created_by ?? null,
    created_at: r.created_at ?? null,
    updated_at: r.updated_at ?? null,
    items: [], // ensure items exists
  }));

  if (!withItems || base.length === 0) return base;

  const ids = base.map((b) => b.id);
  const { data: items, error: iErr } = await supabase
    .from("temp_routine_items")
    .select("id, routine_id, position, location, item, target_key")
    .in("routine_id", ids)
    .order("position", { ascending: true });

  if (iErr) throw iErr;

  const byId: Record<string, RoutineItem[]> = {};
  (items ?? []).forEach((it) => {
    const rid = String(it.routine_id);
    (byId[rid] = byId[rid] ?? []).push({
      id: String(it.id),
      routine_id: rid,
      position: Number(it.position ?? 0),
      location: it.location ?? null,
      item: it.item ?? null,
      target_key: String(it.target_key),
    });
  });

  return base.map((r) => ({ ...r, items: byId[r.id] ?? [] }));
}

export async function createRoutine(input: {
  name: string;
  items?: RoutineItemInput[];
}): Promise<string> {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const created_by = user?.id ?? null;

  const { data: r, error } = await supabase
    .from("temp_routines")
    .insert({ name: input.name, created_by })
    .select("id")
    .single();

  if (error) throw error;
  const id = String(r.id);

  if (input.items?.length) {
    const payload = input.items.map((it, idx) => ({
      routine_id: id,
      position: it.position ?? idx,
      location: it.location ?? null,
      item: it.item ?? null,
      target_key: it.target_key,
    }));
    const { error: iErr } = await supabase.from("temp_routine_items").insert(payload);
    if (iErr) throw iErr;
  }

  return id;
}

export async function replaceRoutineItems(routineId: string, items: RoutineItemInput[]) {
  const supabase = await createServerClient();
  const { error: delErr } = await supabase
    .from("temp_routine_items")
    .delete()
    .eq("routine_id", routineId);
  if (delErr) throw delErr;

  if (items.length) {
    const payload = items.map((it, i) => ({
      routine_id: routineId,
      position: it.position ?? i,
      location: it.location ?? null,
      item: it.item ?? null,
      target_key: it.target_key,
    }));
    const { error: insErr } = await supabase.from("temp_routine_items").insert(payload);
    if (insErr) throw insErr;
  }

  await supabase
    .from("temp_routines")
    .update({ updated_at: new Date().toISOString() })
    .eq("id", routineId);
}

export async function updateRoutine(
  id: string,
  patch: Partial<Pick<Routine, "name" | "last_used_at">>
) {
  const supabase = await createServerClient();
  const { error } = await supabase.from("temp_routines").update(patch).eq("id", id);
  if (error) throw error;
}

export async function deleteRoutine(id: string) {
  const supabase = await createServerClient();
  const { error: delItemsErr } = await supabase
    .from("temp_routine_items")
    .delete()
    .eq("routine_id", id);
  if (delItemsErr) throw delItemsErr;

  const { error } = await supabase.from("temp_routines").delete().eq("id", id);
  if (error) throw error;
}

// src/app/actions/routines.ts
"use server";

import { getServerSupabase } from "@/lib/supabaseServer";

export type Routine = {
  id: string;
  name: string;
  location?: string | null;
  active: boolean;        // synthesized for UI (table doesn’t have it)
  items?: RoutineItem[];
};

export type RoutineItem = {
  id: string;
  routine_id: string;
  title: string;
  hint?: string | null;
  required: boolean;
  sort_index: number;
};

export type CreateRoutineInput = {
  name: string;
  location?: string | null;
  items?: Array<{ title: string; hint?: string | null; required?: boolean; sort_index?: number }>;
};

export type UpdateRoutineInput = {
  name?: string;
  location?: string | null;
};

// optional: still used when creating
async function getUserId(): Promise<string | null> {
  const supabase = await getServerSupabase();
  const { data } = await supabase.auth.getUser();
  return data.user?.id ?? null;
}

export async function listRoutines(): Promise<Routine[]> {
  const supabase = await getServerSupabase();

  // Show ALL routines (no created_by filter)
  const { data: routines, error: rErr } = await supabase
    .from("temp_routines")
    .select("*")
    .order("name", { ascending: true });

  if (rErr || !routines?.length) return [];

  const ids = routines.map((r: any) => r.id);
  const { data: items } = await supabase
    .from("temp_routine_items")
    .select("*")
    .in("routine_id", ids)
    .order("sort_index", { ascending: true });

  const by = new Map<string, RoutineItem[]>();
  for (const it of (items ?? []) as any[]) {
    const arr = by.get(it.routine_id) ?? [];
    arr.push({
      id: it.id,
      routine_id: it.routine_id,
      title: it.title,
      hint: it.hint ?? null,
      required: !!it.required,
      sort_index: Number(it.sort_index ?? 0),
    });
    by.set(it.routine_id, arr);
  }

  return (routines as any[]).map((r) => ({
    id: r.id,
    name: r.name,
    location: r.location ?? null,
    active: true,
    items: by.get(r.id) ?? [],
  }));
}

export async function createRoutine(input: CreateRoutineInput) {
  const supabase = await getServerSupabase();
  const userId = await getUserId(); // may be null if RLS allows
  const payload: any = {
    name: input.name,
    location: input.location ?? null,
    ...(userId ? { created_by: userId } : {}),
  };

  const { data, error } = await supabase
    .from("temp_routines")
    .insert(payload)
    .select("id")
    .single();

  if (error || !data?.id) return { error: error?.message ?? "Failed to create routine" };

  const id = data.id as string;

  if (input.items?.length) {
    const itemsPayload = input.items.map((it, idx) => ({
      routine_id: id,
      title: it.title,
      hint: it.hint ?? null,
      required: it.required ?? true,
      sort_index: typeof it.sort_index === "number" ? it.sort_index : idx,
    }));
    await supabase.from("temp_routine_items").insert(itemsPayload);
  }

  return { id };
}

export async function replaceRoutineItems(
  routineId: string,
  items: Array<{ title: string; hint?: string | null; required?: boolean; sort_index?: number }>
) {
  const supabase = await getServerSupabase();
  await supabase.from("temp_routine_items").delete().eq("routine_id", routineId);
  if (!items.length) return { ok: true };
  const payload = items.map((it, idx) => ({
    routine_id: routineId,
    title: it.title,
    hint: it.hint ?? null,
    required: it.required ?? true,
    sort_index: typeof it.sort_index === "number" ? it.sort_index : idx,
  }));
  const { error } = await supabase.from("temp_routine_items").insert(payload);
  if (error) return { error: error.message };
  return { ok: true };
}

export async function updateRoutine(id: string, patch: UpdateRoutineInput) {
  const supabase = await getServerSupabase();
  const upd: Record<string, unknown> = {};
  if (patch.name !== undefined) upd.name = patch.name;
  if (patch.location !== undefined) upd.location = patch.location;
  if (!Object.keys(upd).length) return { ok: true };
  const { error } = await supabase.from("temp_routines").update(upd).eq("id", id);
  if (error) return { error: error.message };
  return { ok: true };
}

export async function deleteRoutine(id: string) {
  const supabase = await getServerSupabase();
  const { error } = await supabase.from("temp_routines").delete().eq("id", id);
  if (error) return { error: error.message };
  return { ok: true };
}

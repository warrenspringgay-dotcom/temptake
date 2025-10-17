// src/app/actions/routines.ts
"use server";

import { cookies } from "next/headers";
import { getServerSupabase } from "@/lib/supabaseServer";


/** ——— Types your UI expects ——— */
export type RoutineItem = {
  id: string;
  position: number;
  location: string | null;
  item: string | null;
  target_key: string;
  notes: string | null;
};

export type RoutineWithItems = {
  id: string;
  org_id: string;
  name: string;
  active: boolean;
  last_used_at: string | null;
  items: RoutineItem[];
};

/** Minimal shape needed by the run page */
export type RoutineForRun = {
  id: string;
  name: string;
  items: Array<{
    id: string;
    position: number;
    location: string | null;
    item: string | null;
    target_key: string;
  }>;
};

export type CreateRoutineInput = {
  name: string;
  active?: boolean;
  items?: Array<Omit<RoutineItem, "id"> & { id?: string }>;
};

export type UpdateRoutineInput = {
  id: string;
  name?: string;
  active?: boolean;
  /** If provided, replaces all items */
  items?: Array<Omit<RoutineItem, "id"> & { id?: string }>;
};

export type RecordRoutineRunInput = {
  routineId: string;
  at?: string; // ISO time (optional; defaults to now)
  items: Array<{
    stepId: string;
    location: string | null;
    item: string | null;
    target_key: string;
    temp_c: number | null;
    status: "pass" | "fail" | null;
    notes: string | null;
  }>;
};

/** ——— Helpers ——— */



// ...

async function requireOrgId(): Promise<string> {
  const cookieStore = await cookies();              // <— await here (Next 15)
  const orgId = cookieStore.get("org_id")?.value;
  if (!orgId) throw new Error("No active organisation. (Missing org_id cookie)");
  return orgId;
}



function normalizeItems(rows: any[]): RoutineItem[] {
  return (rows ?? []).map((r) => ({
    id: String(r.id),
    position: Number(r.position ?? 0),
    location: r.location ?? null,
    item: r.item ?? null,
    target_key: String(r.target_key ?? "chill"),
    notes: r.notes ?? null,
  }));
}

/** ——— Actions ——— */

export async function listRoutines(): Promise<RoutineWithItems[]> {
  const supabase = await getServerSupabase();
  ;
const orgId = await requireOrgId();

  const { data, error } = await supabase
    .from("routines")
    .select(
      `
      id, org_id, name, active, last_used_at,
      routine_items:id (
        id, position, location, item, target_key, notes
      )
    `
        // aliasing is driver-sensitive; if your Supabase instance doesn’t like the alias,
        // switch to: routine_items ( id, position, location, item, target_key, notes )
    )
    .eq("org_id", orgId)
    .order("name", { ascending: true });

  if (error) throw new Error(`[routines.list] ${error.message}`);

  // Some drivers return the nested as "routine_items", not "id"; handle both:
  return (data ?? []).map((r: any) => {
    const nested = r.routine_items ?? r.id ?? [];
    return {
      id: String(r.id),
      org_id: String(r.org_id),
      name: String(r.name),
      active: !!r.active,
      last_used_at: r.last_used_at ?? null,
      items: normalizeItems(nested).sort((a, b) => a.position - b.position),
    };
  });
}

export async function createRoutine(input: CreateRoutineInput): Promise<{ id: string }> {
  const supabase = await getServerSupabase();
  ;
const orgId = await requireOrgId();

  const { data, error } = await supabase
    .from("routines")
    .insert({
      org_id: orgId,
      name: input.name,
      active: input.active ?? true,
    })
    .select("id")
    .single();

  if (error) throw new Error(`[routines.create] ${error.message}`);
  const routineId = String(data.id);

  if (input.items?.length) {
    const payload = input.items.map((it, idx) => ({
      routine_id: routineId,
      position: Number(it.position ?? idx + 1),
      location: it.location ?? null,
      item: it.item ?? null,
      target_key: it.target_key ?? "chill",
      notes: it.notes ?? null,
    }));

    const { error: itemsErr } = await supabase.from("routine_items").insert(payload);
    if (itemsErr) throw new Error(`[routines.create.items] ${itemsErr.message}`);
  }

  return { id: routineId };
}

export async function updateRoutine(input: UpdateRoutineInput): Promise<void> {
  const supabase = await getServerSupabase();
  ;
const orgId = await requireOrgId();

  if (input.name != null || input.active != null) {
    const { error } = await supabase
      .from("routines")
      .update({
        ...(input.name != null ? { name: input.name } : {}),
        ...(input.active != null ? { active: input.active } : {}),
      })
      .eq("id", input.id)
      .eq("org_id", orgId);

    if (error) throw new Error(`[routines.update] ${error.message}`);
  }

  // Replace items if provided
  if (input.items) {
    const { error: delErr } = await supabase
      .from("routine_items")
      .delete()
      .eq("routine_id", input.id);
    if (delErr) throw new Error(`[routines.update.deleteItems] ${delErr.message}`);

    const payload = input.items.map((it, idx) => ({
      routine_id: input.id,
      position: Number(it.position ?? idx + 1),
      location: it.location ?? null,
      item: it.item ?? null,
      target_key: it.target_key ?? "chill",
      notes: it.notes ?? null,
    }));

    const { error: insErr } = await supabase.from("routine_items").insert(payload);
    if (insErr) throw new Error(`[routines.update.insertItems] ${insErr.message}`);
  }
}

export async function deleteRoutine(id: string): Promise<void> {
  const supabase = await getServerSupabase();
  ;
const orgId = await requireOrgId();

  // If you don’t have ON DELETE CASCADE, delete child rows first:
  await supabase.from("routine_items").delete().eq("routine_id", id);

  const { error } = await supabase.from("routines").delete().eq("id", id).eq("org_id", orgId);
  if (error) throw new Error(`[routines.delete] ${error.message}`);
}

/** Used by the runner page */
export async function getRoutineById(id: string): Promise<RoutineForRun | null> {
  const supabase = await getServerSupabase();
  ;
const orgId = await requireOrgId();

  const { data, error } = await supabase
    .from("routines")
    .select(
      `
      id, org_id, name,
      routine_items (
        id, position, location, item, target_key
      )
    `
    )
    .eq("id", id)
    .eq("org_id", orgId)
    .maybeSingle();

  if (error) throw new Error(`[routines.getById] ${error.message}`);
  if (!data) return null;

  const items = normalizeItems(data.routine_items ?? []).sort((a, b) => a.position - b.position);

  const forRun: RoutineForRun = {
    id: String(data.id),
    name: String(data.name),
    items: items.map((it) => ({
      id: it.id,
      position: it.position,
      location: it.location,
      item: it.item,
      target_key: it.target_key,
    })),
  };

  return forRun;
}

/** Save a completed routine run + update last_used_at */
export async function recordRoutineRun(input: RecordRoutineRunInput): Promise<void> {
  const supabase = await getServerSupabase();
  ;
const orgId = await requireOrgId();

  const { data: run, error: runErr } = await supabase
    .from("routine_runs")
    .insert({
      org_id: orgId,
      routine_id: input.routineId,
      at: input.at ?? new Date().toISOString(),
    })
    .select("id")
    .single();

  if (runErr) throw new Error(`[routines.recordRun] ${runErr.message}`);

  const runId = String(run.id);

  if (input.items?.length) {
    const payload = input.items.map((it) => ({
      run_id: runId,
      step_id: it.stepId,
      location: it.location,
      item: it.item,
      target_key: it.target_key,
      temp_c: it.temp_c,
      status: it.status,
      notes: it.notes,
    }));

    const { error: itemsErr } = await supabase.from("routine_run_items").insert(payload);
    if (itemsErr) throw new Error(`[routines.recordRun.items] ${itemsErr.message}`);
  }

  // Touch routine.last_used_at
  await supabase
    .from("routines")
    .update({ last_used_at: new Date().toISOString() })
    .eq("id", input.routineId)
    .eq("org_id", orgId);
}

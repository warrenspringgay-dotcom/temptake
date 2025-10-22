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

/** Robust org resolver: cookie -> profile -> user_orgs */
async function requireOrgId(): Promise<string> {
  const cookieStore = await cookies();
  const fromCookie = cookieStore.get("org_id")?.value;
  if (fromCookie) return fromCookie;

  const supabase = await getServerSupabase();
  const { data: userRes } = await supabase.auth.getUser();
  const uid = userRes?.user?.id;
  if (!uid) throw new Error("No active organisation (no user).");

  // profiles.org_id
  const { data: prof } = await supabase
    .from("profiles")
    .select("org_id")
    .eq("id", uid)
    .maybeSingle();
  if (prof?.org_id) return String(prof.org_id);

  // fallback user_orgs
  const { data: uo } = await supabase
    .from("user_orgs")
    .select("org_id")
    .eq("user_id", uid)
    .maybeSingle();
  if (uo?.org_id) return String(uo.org_id);

  throw new Error("No active organisation.");
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
  const orgId = await requireOrgId();

  // IMPORTANT: select from temp_routines and join temp_routine_items as 'items'
  const { data, error } = await supabase
    .from("temp_routines")
    .select(
      `
      id, org_id, name, active, last_used_at,
      items:temp_routine_items (
        id, position, location, item, target_key, notes
      )
    `
    )
    .eq("org_id", orgId)
    .order("name", { ascending: true });

  if (error) throw new Error(`[routines.list] ${error.message}`);

  return (data ?? []).map((r: any) => ({
    id: String(r.id),
    org_id: String(r.org_id),
    name: String(r.name),
    active: !!r.active,
    last_used_at: r.last_used_at ?? null,
    items: normalizeItems(r.items ?? []).sort((a, b) => a.position - b.position),
  }));
}

export async function createRoutine(input: CreateRoutineInput): Promise<{ id: string }> {
  const supabase = await getServerSupabase();
  const orgId = await requireOrgId();

  const { data, error } = await supabase
    .from("temp_routines")
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

    const { error: itemsErr } = await supabase.from("temp_routine_items").insert(payload);
    if (itemsErr) throw new Error(`[routines.create.items] ${itemsErr.message}`);
  }

  return { id: routineId };
}

export async function updateRoutine(input: UpdateRoutineInput): Promise<void> {
  const supabase = await getServerSupabase();
  const orgId = await requireOrgId();

  if (input.name != null || input.active != null) {
    const { error } = await supabase
      .from("temp_routines")
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
      .from("temp_routine_items")
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

    // IMPORTANT: insert back into temp_routine_items (not routine_items)
    const { error: insErr } = await supabase.from("temp_routine_items").insert(payload);
    if (insErr) throw new Error(`[routines.update.insertItems] ${insErr.message}`);
  }
}

export async function deleteRoutine(id: string): Promise<void> {
  const supabase = await getServerSupabase();
  const orgId = await requireOrgId();

  // If no ON DELETE CASCADE, clear children first
  await supabase.from("temp_routine_items").delete().eq("routine_id", id);

  const { error } = await supabase.from("temp_routines").delete().eq("id", id).eq("org_id", orgId);
  if (error) throw new Error(`[routines.delete] ${error.message}`);
}

export async function getRoutineById(id: string): Promise<RoutineForRun | null> {
  const supabase = await getServerSupabase();
  const orgId = await requireOrgId();

  const { data, error } = await supabase
    .from("temp_routines")
    .select(
      `
      id, org_id, name,
      items:temp_routine_items (
        id, position, location, item, target_key
      )
    `
    )
    .eq("id", id)
    .eq("org_id", orgId)
    .maybeSingle();

  if (error) throw new Error(`[routines.getById] ${error.message}`);
  if (!data) return null;

  const items = normalizeItems(data.items ?? []).sort((a, b) => a.position - b.position);

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

export async function recordRoutineRun(input: RecordRoutineRunInput): Promise<void> {
  const supabase = await getServerSupabase();
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

  // Touch last_used_at on the correct table
  await supabase
    .from("temp_routines")
    .update({ last_used_at: new Date().toISOString() })
    .eq("id", input.routineId)
    .eq("org_id", orgId);
}

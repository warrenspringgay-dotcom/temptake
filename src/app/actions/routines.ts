// src/app/actions/routines.ts
"use server";

import { createServerClient } from "@/lib/supabaseServer";

export type TempRoutine = {
  id: string;
  created_by: string;
  name: string;
  location: string | null;
  item: string | null;
  target_key: string;
  active: boolean;
  sort_order: number;
  inserted_at?: string;
};

export async function listRoutines(): Promise<TempRoutine[]> {
  const supabase = createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];
  const { data, error } = await supabase
    .from("temp_routines")
    .select("*")
    .eq("created_by", user.id)
    .eq("active", true)
    .order("sort_order", { ascending: true })
    .order("inserted_at", { ascending: true });
  if (error) throw new Error(error.message);
  return (data as TempRoutine[]) ?? [];
}

export async function createRoutine(input: { name: string; location?: string | null; item?: string | null; target_key: string; }) {
  const supabase = createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const payload = {
    created_by: user.id,
    name: input.name.trim(),
    location: input.location ?? null,
    item: input.item ?? null,
    target_key: input.target_key,
    active: true,
  };

  const { data, error } = await supabase.from("temp_routines").insert(payload).select("*").single();
  if (error) throw new Error(error.message);
  return data as TempRoutine;
}

export async function updateRoutine(id: string, patch: Partial<Omit<TempRoutine, "id" | "created_by">>) {
  const supabase = createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");
  const { data, error } = await supabase
    .from("temp_routines")
    .update(patch)
    .eq("id", id)
    .eq("created_by", user.id)
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  return data as TempRoutine;
}

export async function deleteRoutine(id: string) {
  const supabase = createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");
  const { error } = await supabase.from("temp_routines").delete().eq("id", id).eq("created_by", user.id);
  if (error) throw new Error(error.message);
}

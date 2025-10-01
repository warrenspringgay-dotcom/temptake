// src/app/actions/routines.ts
"use server";

import { supabaseServer } from "@/lib/supabaseServer";

export type TempRoutine = {
  id: string;
  name: string | null;
  location: string | null;
  item: string | null;
  target_key: string | null;
  last_used_at?: string | null;
};

export async function listRoutines(): Promise<TempRoutine[]> {
  const supabase = await supabaseServer();
  const { data, error } = await supabase
    .from("temp_routines")
    .select("id, name, location, item, target_key, last_used_at")
    .order("last_used_at", { ascending: false })
    .limit(100);

  if (error) throw error;
  return (data ?? []) as TempRoutine[];
}

export async function upsertRoutine(payload: Omit<TempRoutine, "id"> & { created_by: string }) {
  const supabase = await supabaseServer();
  const { error } = await supabase.from("temp_routines").upsert(payload, {
    onConflict: "created_by,location,item,target_key",
  });
  if (error) throw error;
}

export async function deleteRoutine(id: string) {
  const supabase = await supabaseServer();
  const { error } = await supabase.from("temp_routines").delete().eq("id", id);
  if (error) throw error;
}

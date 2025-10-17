// src/app/actions/tempLogs.ts
"use server";

import { getServerSupabase } from "@/lib/supabaseServer";

export type TempLogRow = {
  id: string;
  date: string | null;
  staff_initials: string | null;
  location: string | null;
  item: string | null;
  target_key: string | null;
  temp_c: number | null;
  status: "pass" | "fail" | null;
  created_at?: string;
};

export type TempLogInput = {
  date: string | null;
  staff_initials: string | null;
  location: string | null;
  item: string | null;
  target_key: string | null;
  temp_c: number | null;
  status: "pass" | "fail" | null;
};

export async function listTempLogs(): Promise<TempLogRow[]> {
  const supabase = await getServerSupabase();
  const { data, error } = await supabase
    .from("temp_logs")
    .select("*")
    .order("date", { ascending: false })
    .order("created_at", { ascending: false });
  if (error || !data) return [];
  return data as TempLogRow[];
}

export async function upsertTempLog(input: TempLogInput) {
  const supabase = await getServerSupabase();
  const { error } = await supabase.from("temp_logs").insert(input);
  if (error) return { error: error.message };
  return { ok: true };
}

export async function deleteTempLog(id: string) {
  const supabase = await getServerSupabase();
  const { error } = await supabase.from("temp_logs").delete().eq("id", id);
  if (error) return { error: error.message };
  return { ok: true };
}

/** Re-export team initials for client convenience (same shape as FoodTempLogger expects). */
export { listStaffInitials } from "@/app/actions/team";

// src/lib/getServerSupabase.ts
import { getServerSupabase as getServerSupabaseImpl } from "@/lib/supabaseServer";

/**
 * Canonical server Supabase helper.
 * This file exists so other imports can stay stable across refactors.
 */
export async function getServerSupabase() {
  return getServerSupabaseImpl();
}

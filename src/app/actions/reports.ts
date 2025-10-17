// src/app/actions/reports.ts
"use server";

import { getServerSupabase } from "@/lib/supabaseServer";
import { getActiveOrgIdServer } from "@/lib/orgServer";

export type CustomReportInput = {
  from: string; // "YYYY-MM-DD"
  to: string;   // "YYYY-MM-DD"
  limit?: number; // default 500
};

/**
 * Fetch food temperature logs for the active org between dates (inclusive).
 * Returns raw rows from `food_temp_logs`.
 */
export async function getCustomReport(params: CustomReportInput) {
  const { from, to, limit = 500 } = params;
  if (!from || !to) throw new Error("from/to are required");

  const supabase = await getServerSupabase();
  const orgId = await getActiveOrgIdServer();
  if (!orgId) throw new Error("No active org");

  const { data, error } = await supabase
    .from("food_temp_logs")
    .select("*")
    .eq("org_id", orgId)
    .gte("at", from)
    .lte("at", to)
    .order("at", { ascending: false })
    .limit(limit);

  if (error) throw new Error(`[reports.getCustomReport] ${error.message}`);
  return data ?? [];
}

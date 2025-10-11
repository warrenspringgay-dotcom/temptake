"use server";

import { createServerClient } from "@/lib/supabaseServer";

type ReportRow = {
  id: string;
  at: string | null;
  staff_initials: string | null;
  area: string | null;
  note: string | null;
  target_key: string | null;
  temp_c: number | null;
  status: "pass" | "fail" | null;
};

export async function getCustomReport(params: {
  limit?: number;
  from?: string; // yyyy-mm-dd (optional)
  to?: string;   // yyyy-mm-dd (optional)
}) {
  const { limit = 200, from, to } = params ?? {};
  const supabase = await createServerClient();

  let query = supabase
    .from("food_temp_logs")
    .select("id, at, staff_initials, area, note, target_key, temp_c, status")
    .order("at", { ascending: false })
    .limit(limit);

  if (from) {
    query = query.gte("at", new Date(from).toISOString());
  }
  if (to) {
    // include whole "to" day
    const end = new Date(new Date(to).getTime() + 24 * 3600 * 1000 - 1);
    query = query.lte("at", end.toISOString());
  }

  const { data, error } = await query;
  if (error) throw error;

  const items = (data ?? []) as ReportRow[];

  const counts = {
    total: items.length,
    pass: items.filter((r) => r.status === "pass").length,
    fail: items.filter((r) => r.status === "fail").length,
    locations: new Set(items.map((r) => r.area ?? "")).size,
  };

  return { items, counts };
}

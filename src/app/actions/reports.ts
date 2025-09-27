// src/app/actions/reports.ts
"use server";

import { createServerClient } from "@/lib/supabaseServer";

/** Rows as stored in DB (subset) */
type FoodTempRow = {
  id: string;
  at: string | null;              // timestamptz
  area: string | null;
  staff_initials: string | null;
  target_key: string | null;
  temp_c: number | null;
  status: "pass" | "fail" | null;
  note: string | null;
  created_by?: string | null;
};

export type ReportRow = {
  id: string;
  at: string | null;
  area: string | null;
  staff_initials: string | null;
  target_key: string | null;
  temp_c: number | null;
  status: "pass" | "fail" | null;
  note: string | null;
};

export type GetCustomReportOptions = {
  from?: string;        // "YYYY-MM-DD"
  to?: string;          // "YYYY-MM-DD"
  area?: string;
  target_key?: string;
  limit?: number;       // default 500
};

/**
 * Returns rows from food_temp_logs scoped to the current user (RLS-safe).
 * Filters are optional; pass from/to as YYYY-MM-DD.
 */
export async function getCustomReport(opts: GetCustomReportOptions = {}): Promise<ReportRow[]> {
  const supabase = createServerClient();

  const {
    data: { user },
    error: authErr,
  } = await supabase.auth.getUser();
  if (authErr) throw new Error(authErr.message);
  if (!user) throw new Error("Not authenticated");

  let q = supabase.from("food_temp_logs").select("*").eq("created_by", user.id);

  if (opts.from) q = q.gte("at", opts.from);
  if (opts.to) {
    const toEnd = opts.to.length === 10 ? `${opts.to}T23:59:59.999Z` : opts.to;
    q = q.lte("at", toEnd);
  }

  if (opts.area) q = q.eq("area", opts.area);
  if (opts.target_key) q = q.eq("target_key", opts.target_key);

  const { data, error } = await q.order("at", { ascending: false }).limit(opts.limit ?? 500);
  if (error) throw new Error(error.message);

  return (data ?? []).map((r: any): ReportRow => ({
    id: String(r.id),
    at: r.at ?? null,
    area: r.area ?? null,
    staff_initials: r.staff_initials ?? null,
    target_key: r.target_key ?? null,
    temp_c: typeof r.temp_c === "number" ? r.temp_c : r.temp_c != null ? Number(r.temp_c) : null,
    status: r.status ?? null,
    note: r.note ?? null,
  }));
}

/** (Optional) tiny helper to list distinct areas for filters */
export async function listAreas(): Promise<string[]> {
  const supabase = createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from("food_temp_logs")
    .select("area")
    .eq("created_by", user.id)
    .not("area", "is", null);

  if (error) return [];
  const set = new Set<string>();
  for (const row of data as any[]) if (row.area) set.add(row.area);
  return Array.from(set).sort();
}

/** Shape expected by /reports and /reports/custom pages */
export type AuditItem = {
  id: string;
  at: string | null;
  title: string;
  details?: string | null;
  severity: "high" | "medium" | "low";
};

/**
 * Build an “instant audit” of the last 90 days, scoped to the current user.
 * Very simple rules:
 *  - HIGH: status = 'fail'
 *  - MEDIUM: temp_c is null or target_key is missing
 *  - LOW: note mentions 'recheck' or 'advice'
 */
export async function getInstantAudit90d(): Promise<AuditItem[]> {
  const supabase = createServerClient();

  const {
    data: { user },
    error: authErr,
  } = await supabase.auth.getUser();
  if (authErr) throw new Error(authErr.message);
  if (!user) throw new Error("Not authenticated");

  const since = new Date();
  since.setDate(since.getDate() - 90);

  const { data, error } = await supabase
    .from("food_temp_logs")
    .select("*")
    .eq("created_by", user.id)
    .gte("at", since.toISOString())
    .order("at", { ascending: false })
    .limit(1000);

  if (error) throw new Error(error.message);

  const rows = (data ?? []) as FoodTempRow[];
  const items: AuditItem[] = [];

  for (const r of rows) {
    const when = r.at ?? null;
    const where = r.area ?? "—";
    const who = r.staff_initials ?? "—";
    const temp = r.temp_c;
    const tg = r.target_key ?? "—";

    if (r.status === "fail") {
      items.push({
        id: r.id,
        at: when,
        severity: "high",
        title: `Temperature out of range (${tg})`,
        details: `Area: ${where} · Temp: ${temp ?? "—"} °C · Staff: ${who}${r.note ? ` · Note: ${r.note}` : ""}`,
      });
      continue;
    }

    if (temp == null || r.target_key == null) {
      items.push({
        id: r.id,
        at: when,
        severity: "medium",
        title: temp == null ? "Missing temperature" : "Missing target",
        details: `Area: ${where} · Staff: ${who}${r.note ? ` · Note: ${r.note}` : ""}`,
      });
      continue;
    }

    if (r.note && /recheck|advice|investigate/i.test(r.note)) {
      items.push({
        id: r.id,
        at: when,
        severity: "low",
        title: "Follow-up noted",
        details: `Area: ${where} · Temp: ${temp} °C · Staff: ${who} · Note: ${r.note}`,
      });
    }
  }

  return items;
}

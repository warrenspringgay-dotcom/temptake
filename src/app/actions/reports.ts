// src/app/actions/reports.ts
"use server";

// --- ADD BELOW EXISTING EXPORTS IN: src/app/actions/reports.ts ---
import { createServerClient } from "@/lib/supabaseServer";

export type CustomReportFilters = {
  dateFrom?: string;   // "YYYY-MM-DD"
  dateTo?: string;     // "YYYY-MM-DD" (exclusive end or same-day inclusive, see below)
  location?: string | null;
  limit?: number;      // default 200
};

export type CustomReportRow = {
  id: string;
  at: string | null;
  staff_initials: string | null;
  area: string | null;
  note: string | null;
  target_key: string | null;
  temp_c: number | null;
  status: "pass" | "fail" | null;
};

export type CustomReport = {
  items: CustomReportRow[];
  counts: {
    total: number;
    pass: number;
    fail: number;
    locations: number;
  };
};

/**
 * Custom, filterable report for temperature logs.
 * - dateFrom/dateTo are compared against the "at" column.
 * - If only dateFrom is provided, returns logs from that date to now.
 * - If only dateTo is provided, returns logs up to that date (inclusive).
 * - location matches "area" OR "location" (whichever your data has).
 */
export async function getCustomReport(filters: CustomReportFilters = {}): Promise<CustomReport> {
  const supabase = await createServerClient();

  const { dateFrom, dateTo, location, limit = 200 } = filters;

  // Start a base query
  let q = supabase
    .from("food_temp_logs")
    .select("id, at, area, location, note, staff_initials, target_key, temp_c, status")
    .order("at", { ascending: false })
    .limit(limit);

  // Date filters (safe best-effort)
  if (dateFrom) {
    // Include anything with at >= dateFrom
    q = q.gte("at", dateFrom);
  }
  if (dateTo) {
    // Include anything with at < next day of dateTo (treat dateTo as inclusive day)
    const nextDay = new Date(dateTo);
    if (!Number.isNaN(nextDay.getTime())) {
      nextDay.setDate(nextDay.getDate() + 1);
      const y = nextDay.getFullYear();
      const m = String(nextDay.getMonth() + 1).padStart(2, "0");
      const d = String(nextDay.getDate()).padStart(2, "0");
      const exclusive = `${y}-${m}-${d}`;
      q = q.lt("at", exclusive);
    }
  }

  // Location filter (matches either area or location)
  if (location && location.trim()) {
    // We don't have OR helpers in all client versions, so fetch and filter in JS after.
    const { data, error } = await q;
    if (error) throw error;

    const filtered = (data ?? []).filter((r: any) => {
      const a = (r.area ?? r.location ?? "").toString();
      return a.toLowerCase() === location.toLowerCase();
    });

    const items: CustomReportRow[] = filtered.map((r: any) => ({
      id: String(r.id),
      at: r.at ?? null,
      staff_initials: r.staff_initials ?? null,
      area: (r.area ?? r.location ?? null)?.toString() ?? null,
      note: r.note ?? null,
      target_key: r.target_key ?? null,
      temp_c: r.temp_c != null ? Number(r.temp_c) : null,
      status: r.status ?? null,
    }));

    const pass = items.filter((i) => i.status === "pass").length;
    const fail = items.filter((i) => i.status === "fail").length;
    const locations = new Set(items.map((i) => i.area || "")).size;

    return {
      items,
      counts: {
        total: items.length,
        pass,
        fail,
        locations,
      },
    };
  }

  // No location filter → use DB results directly
  const { data, error } = await q;
  if (error) throw error;

  const items: CustomReportRow[] = (data ?? []).map((r: any) => ({
    id: String(r.id),
    at: r.at ?? null,
    staff_initials: r.staff_initials ?? null,
    area: (r.area ?? r.location ?? null)?.toString() ?? null,
    note: r.note ?? null,
    target_key: r.target_key ?? null,
    temp_c: r.temp_c != null ? Number(r.temp_c) : null,
    status: r.status ?? null,
  }));

  const pass = items.filter((i) => i.status === "pass").length;
  const fail = items.filter((i) => i.status === "fail").length;
  const locations = new Set(items.map((i) => i.area || "")).size;

  return {
    items,
    counts: {
      total: items.length,
      pass,
      fail,
      locations,
    },
  };
}


export type AuditTemp = {
  id: string;
  at: string | null;
  staff_initials: string | null;
  area: string | null;
  note: string | null;
  target_key: string | null;
  temp_c: number | null;
  status: "pass" | "fail" | null;
};

export async function getInstantAuditAll() {
  const supabase = await createServerClient();

  // Temps (latest 10)
  const { data: tempRows, error: tempsErr } = await supabase
    .from("food_temp_logs")
    .select("id, at, staff_initials, area, note, target_key, temp_c, status")
    .order("at", { ascending: false })
    .limit(10);

  if (tempsErr) throw new Error(`[/reports] getInstantAudit90d failed`);

  // Team due in 14 days (training)
  const soonISO = new Date(Date.now() + 14 * 24 * 3600 * 1000).toISOString();
  const { data: teamRows } = await supabase
    .from("team_members")
    .select("id, training_expires_at, training_expiry, expires_at");

  const teamDue =
    (teamRows ?? []).reduce((acc: number, r: any) => {
      const raw = r.training_expires_at ?? r.training_expiry ?? r.expires_at;
      if (!raw) return acc;
      return new Date(raw).toISOString() <= soonISO ? acc + 1 : acc;
    }, 0) ?? 0;

  // Suppliers count
  const { count: suppliersCount = 0 } = await supabase
    .from("suppliers")
    .select("id", { count: "exact", head: true });

  return {
    temps: (tempRows ?? []) as AuditTemp[],
    teamDue,
    suppliersCount,
  };
}

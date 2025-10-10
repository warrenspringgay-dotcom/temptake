// src/app/actions/reports.ts
"use server";

import { createServerClient } from "@/lib/supabaseServer";

export type ReportRange = { fromISO: string; toISO: string };
export type TempRow = {
  at: string;
  staff_initials: string | null;
  area: string | null;
  note: string | null;
  target_key: string | null;
  temp_c: number | null;
  status: "pass" | "fail" | null;
};

export async function runTempReport(range: ReportRange) {
  const supabase = await createServerClient();
  const { fromISO, toISO } = range;

  // Logs in date window
  const { data: logs, error: e1 } = await supabase
    .from("food_temp_logs")
    .select("at, staff_initials, area, note, target_key, temp_c, status")
    .gte("at", fromISO)
    .lte("at", toISO)
    .order("at", { ascending: false });

  if (e1) throw new Error(e1.message);

  const rows: TempRow[] = (logs ?? []) as any[];

  // KPIs
  const entries = rows.length;
  const failures = rows.filter(r => r.status === "fail").length;
  const locations = new Set(rows.map(r => r.area ?? "")).size;

  return { rows, entries, failures, locations };
}

export async function listAllergenNextDue() {
  const supabase = await createServerClient();

  // Compute next_due on the fly
  const { data, error } = await supabase.rpc("exec_sql", {
    // If you don't have exec_sql helper, see note below for a SELECT version.
    // language=SQL
    sql: `
      SELECT
        id,
        reviewer,
        last_reviewed,
        interval_days,
        (last_reviewed + ((interval_days || ' days')::interval))::date AS next_due
      FROM allergen_review
      ORDER BY next_due NULLS LAST;
    `
  } as any);

  if (!error && Array.isArray(data)) return data;

  // Fallback without RPC: do the same with a view-like select
  const { data: fallback, error: e2 } = await supabase
    .from("allergen_review")
    .select("id, reviewer, last_reviewed, interval_days");

  if (e2) throw new Error(e2.message);

  return (fallback ?? []).map(r => ({
    ...r,
    next_due: r.last_reviewed
      ? new Date(
          new Date(r.last_reviewed).getTime() + (Number(r.interval_days || 0) * 24 * 3600 * 1000)
        )
          .toISOString()
          .slice(0, 10)
      : null,
  }));
}

export async function listExpiringTraining() {
  const supabase = await createServerClient();

  // Coalesce whichever expiry column exists
  const { data, error } = await supabase.rpc("exec_sql", {
    // language=SQL
    sql: `
      SELECT
        id,
        name,
        email,
        COALESCE(training_expires_at, training_expiry, expires_at)::date AS expires_on
      FROM team_members
      ORDER BY expires_on NULLS LAST;
    `
  } as any);

  if (!error && Array.isArray(data)) return data;

  // Fallback: simple select and compute in JS if rpc is unavailable
  const { data: fallback, error: e2 } = await supabase
    .from("team_members")
    .select("id, name, email, training_expires_at, training_expiry, expires_at");

  if (e2) throw new Error(e2.message);

  return (fallback ?? []).map(r => ({
    id: r.id,
    name: r.name,
    email: r.email,
    expires_on:
      (r.training_expires_at ?? r.training_expiry ?? r.expires_at) &&
      new Date(r.training_expires_at ?? r.training_expiry ?? r.expires_at)
        .toISOString()
        .slice(0, 10),
  }));
}

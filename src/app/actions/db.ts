// src/app/actions/db.ts
"use server";

import { createServerClient } from "@/lib/supabaseServer";

import { getOrgId } from "@/lib/org-helpers";

/** Team initials from your Team table (assumes column 'initials') */
export async function getTeamInitials(): Promise<string[]> {
  const sb = await createServerClient();
  const org_id = await getOrgId();
  const { data, error } = await sb
    .from("team")              // <- your team table
    .select("initials")
    .eq("org_id", org_id)
    .order("initials", { ascending: true });

  if (error) throw error;
  return (data ?? [])
    .map((r: any) => String(r.initials ?? "").toUpperCase())
    .filter(Boolean);
}

/** Count temp logs in the last N days (assumes 'date' is a date string) */
export async function countTempLogsLastNDays(n = 30): Promise<number> {
  const sb = await createServerClient();
  const org_id = await getOrgId();

  const sinceISO = new Date(Date.now() - n * 864e5).toISOString().slice(0, 10);
  const { count, error } = await sb
    .from("temp_logs")
    .select("id", { count: "exact", head: true })
    .eq("org_id", org_id)
    .gte("date", sinceISO); // if you only store created_at, switch to gte("created_at", new Date(...).toISOString())

  if (error) throw error;
  return count ?? 0;
}

/** Optional: flags for training & allergen review KPIs.
 *  Assumptions:
 *   - team.training_expires (date) on 'team' rows
 *   - allergens.review_due (date) on 'allergens' single-row or per-item table
 */
export async function getComplianceFlags() {
  const sb = await createServerClient();
  const org_id = await getOrgId();

  const today = new Date().toISOString().slice(0, 10);
  const soonISO = new Date(Date.now() + 14 * 864e5).toISOString().slice(0, 10); // next 14 days

  // TRAINING
  const { data: tExpired, error: tErr1 } = await sb
    .from("team")
    .select("id")
    .eq("org_id", org_id)
    .lt("training_expires", today);     // expired
  if (tErr1) throw tErr1;

  const { data: tSoon, error: tErr2 } = await sb
    .from("team")
    .select("id")
    .eq("org_id", org_id)
    .gte("training_expires", today)
    .lte("training_expires", soonISO);  // expiring within 14 days
  if (tErr2) throw tErr2;

  // ALLERGEN REVIEW
  // If you keep a single “review_due” on a settings row, change the query accordingly
  const { data: aExpired, error: aErr1 } = await sb
    .from("allergens")
    .select("id")
    .eq("org_id", org_id)
    .lt("review_due", today);
  if (aErr1) throw aErr1;

  const { data: aSoon, error: aErr2 } = await sb
    .from("allergens")
    .select("id")
    .eq("org_id", org_id)
    .gte("review_due", today)
    .lte("review_due", soonISO);
  if (aErr2) throw aErr2;

  return {
    trainingExpired: (tExpired ?? []).length,
    trainingExpiringSoon: (tSoon ?? []).length,
    allergenExpired: (aExpired ?? []).length,
    allergenExpiringSoon: (aSoon ?? []).length,
  };
}

// src/app/actions/reports.ts
"use server";

import { supabaseServer } from "@/lib/supabaseServer";

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
  const supabase = await supabaseServer();

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

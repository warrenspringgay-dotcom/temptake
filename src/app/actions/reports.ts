"use server";

import { supabaseServer } from "@/lib/supabaseServer";

export type AuditTempItem = {
  id: string;
  at: string | null;
  area: string | null;
  note: string | null;
  staff_initials: string | null;
  target_key: string | null;
  temp_c: number | null;
  status: "pass" | "fail" | null;
};

export async function getInstantAuditAll(): Promise<{
  temps: AuditTempItem[];
  teamDue: number;
  suppliersCount: number;
}> {
  const supabase = await supabaseServer();

  // recent temperature logs (richer payload)
  const { data: tempsData } = await supabase
    .from("food_temp_logs")
    .select("id, at, area, note, staff_initials, target_key, temp_c, status")
    .order("at", { ascending: false })
    .limit(15);

  // team items due (same logic you already use elsewhere – best-effort)
  const soon = new Date();
  soon.setDate(soon.getDate() + 14);

  let teamDue = 0;
  try {
    const { data: team } = await supabase.from("team_members").select("*");
    teamDue =
      (team ?? []).reduce((acc: number, r: any) => {
        const raw = r.training_expires_at ?? r.training_expiry ?? r.expires_at ?? null;
        if (!raw) return acc;
        const d = new Date(raw);
        return isNaN(d.getTime()) ? acc : d <= soon ? acc + 1 : acc;
      }, 0) || 0;
  } catch {}

  // suppliers count (simple)
  const { count: suppliersCount = 0 } = await supabase
    .from("suppliers")
    .select("*", { count: "exact", head: true });

  return {
    temps: (tempsData ?? []) as AuditTempItem[],
    teamDue,
    suppliersCount,
  };
}

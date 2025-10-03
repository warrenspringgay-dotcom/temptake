"use server";

import { createServerClient } from "@/lib/supabaseServer";
import { getOrgId } from "@/lib/org-helpers";

/** Distinct team initials (active members). Falls back to recent logs. */
export async function getTeamInitials(): Promise<string[]> {
  const supabase = await createServerClient();
  const org_id = await getOrgId().catch(() => null);
  if (!org_id) return [];

  // Preferred: team table
  const { data: team, error: teamErr } = await supabase
    .from("team")
    .select("initials")
    .eq("org_id", org_id)
    .eq("active", true);

  let initials = (team ?? [])
    .map((t) => (t?.initials ?? "").toString().trim().toUpperCase())
    .filter(Boolean);

  // Fallback: distinct initials from recent temp logs
  if ((!initials || initials.length === 0) || teamErr) {
    const { data: logs } = await supabase
      .from("temp_logs")
      .select("staff_initials")
      .eq("org_id", org_id)
      .order("created_at", { ascending: false })
      .limit(300);

    const set = new Set<string>();
    for (const r of logs ?? []) {
      const v = (r?.staff_initials ?? "").toString().trim().toUpperCase();
      if (v) set.add(v);
    }
    initials = Array.from(set);
  }

  return Array.from(new Set(initials)).sort();
}

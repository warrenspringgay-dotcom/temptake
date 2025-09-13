"use server";

import { createClient } from "@/utils/supabase/server";

export type Kpis = {
  todayCount: number;
  last7Count: number;
  failCount: number;
  topLogger: { name: string; count: number } | null;
  missingEntries: number;
};

function emptyKpis(): Kpis {
  return {
    todayCount: 0,
    last7Count: 0,
    failCount: 0,
    topLogger: null,
    missingEntries: 0,
  };
}

export async function getDashboardKpis(_opts?: { days?: number }): Promise<Kpis> {
  // defaults (don’t return undefined)
  const safe = emptyKpis();

  // supabase client
  const supabase = await createClient();

  // get org id (return zeros if unauthenticated / no org)
  let orgId: string | null = null;
  try {
    const { data } = await supabase.auth.getUser();
    orgId = (data?.user?.user_metadata as any)?.org_id ?? null;
  } catch {
    return safe;
  }
  if (!orgId) return safe;

  // date boundaries
  const now = new Date();
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const sevenDaysStart = new Date();
  sevenDaysStart.setDate(sevenDaysStart.getDate() - 7);
  sevenDaysStart.setHours(0, 0, 0, 0);

  // Count today's logs (using logged_at TIMESTAMP)
  try {
    const { count } = await supabase
      .from("temp_logs")
      .select("id", { count: "exact", head: true })
      .eq("org_id", orgId)
      .gte("logged_at", todayStart.toISOString());
    safe.todayCount = count ?? 0;
  } catch {}

  // Count last 7 days
  try {
    const { count } = await supabase
      .from("temp_logs")
      .select("id", { count: "exact", head: true })
      .eq("org_id", orgId)
      .gte("logged_at", sevenDaysStart.toISOString())
      .lte("logged_at", now.toISOString());
    safe.last7Count = count ?? 0;
  } catch {}

  // Count fails (pass = false)
  try {
    const { count } = await supabase
      .from("temp_logs")
      .select("id", { count: "exact", head: true })
      .eq("org_id", orgId)
      .eq("pass", false);
    safe.failCount = count ?? 0;
  } catch {}

  // Top logger initials in last 30 days (or any window you want)
  try {
    const thirtyDaysStart = new Date();
    thirtyDaysStart.setDate(thirtyDaysStart.getDate() - 30);
    thirtyDaysStart.setHours(0, 0, 0, 0);

    const { data } = await supabase
      .from("temp_logs")
      .select("staff_initials", { count: "exact" })
      .eq("org_id", orgId)
      .gte("logged_at", thirtyDaysStart.toISOString());

    // Supabase doesn’t aggregate client-side; fetch rows & reduce.
    // If you have a view for aggregation, swap to that.
    const counts = new Map<string, number>();
    (data ?? []).forEach((r: any) => {
      const k = String(r.staff_initials ?? "").trim();
      if (!k) return;
      counts.set(k, (counts.get(k) ?? 0) + 1);
    });
    let best: { name: string; count: number } | null = null;
    counts.forEach((cnt, k) => {
      if (!best || cnt > best.count) best = { name: k, count: cnt };
    });
    safe.topLogger = best;
  } catch {}

  // “Missing entries” – placeholder logic (keep 0 if you don’t track a target)
  safe.missingEntries = 0;

  return safe;
}

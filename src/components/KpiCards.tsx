// src/components/KpiCards.tsx
// Server Component
import { createServerClient } from "@/lib/supabaseServer";

type Kpis = {
  total7d: number;
  avgTemp7d: number | null;
  lastLogAt: string | null; // ISO
};

/** Try to resolve an org_id for the signed-in user. */
async function resolveOrgId(
  supabase: Awaited<ReturnType<typeof createServerClient>>
): Promise<string | null> {
  try {
    const { data: userData } = await supabase.auth.getUser();
    const uid = userData.user?.id;
    if (!uid) return null;

    // 1) team_members.user_id -> org_id / owner_id
    try {
      const { data: tm } = await supabase
        .from("team_members")
        .select("org_id, owner_id")
        .eq("user_id", uid)
        .maybeSingle();

      if (tm?.org_id) return String(tm.org_id);
      if (tm?.owner_id) return String(tm.owner_id);
    } catch {
      /* ignore */
    }

    // 2) user_orgs mapping (if present)
    try {
      const { data: uo } = await supabase
        .from("user_orgs")
        .select("org_id")
        .eq("user_id", uid)
        .maybeSingle();
      if (uo?.org_id) return String(uo.org_id);
    } catch {
      /* ignore */
    }
  } catch {
    /* ignore */
  }
  return null;
}

async function loadKpis(): Promise<Kpis> {
  const supabase = await createServerClient();
  const org_id = await resolveOrgId(supabase);

  const startISO = new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString();

  // Total entries in last 7 days
  let total7d = 0;
  {
    let q = supabase
      .from("food_temp_logs")
      .select("*", { count: "exact", head: true })
      .gte("at", startISO);
    if (org_id) q = q.eq("org_id", org_id);
    const { count } = await q;
    total7d = count ?? 0;
  }

  // Average temp in last 7 days
  let avgTemp7d: number | null = null;
  {
    let q = supabase
      .from("food_temp_logs")
      .select("avg_temp:avg(temp_c)")
      .gte("at", startISO)
      .single();
    if (org_id) {
      // Rebuild query when adding filter (Supabase typings require recompose)
      const { data } = await supabase
        .from("food_temp_logs")
        .select("avg_temp:avg(temp_c)")
        .gte("at", startISO)
        .eq("org_id", org_id)
        .single();
      avgTemp7d = (data as any)?.avg_temp ?? null;
    } else {
      const { data } = await q;
      avgTemp7d = (data as any)?.avg_temp ?? null;
    }
  }

  // Last log time (any)
  let lastLogAt: string | null = null;
  {
    let q = supabase
      .from("food_temp_logs")
      .select("at")
      .order("at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (org_id) {
      const { data } = await supabase
        .from("food_temp_logs")
        .select("at")
        .eq("org_id", org_id)
        .order("at", { ascending: false })
        .limit(1)
        .maybeSingle();
      lastLogAt = (data as any)?.at ?? null;
    } else {
      const { data } = await q;
      lastLogAt = (data as any)?.at ?? null;
    }
  }

  return { total7d, avgTemp7d, lastLogAt };
}

function fmtDateTime(iso: string | null): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}

export default async function KpiCards() {
  const { total7d, avgTemp7d, lastLogAt } = await loadKpis();

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
      <div className="rounded-xl border bg-white p-3">
        <div className="text-xs text-gray-500">Entries (last 7 days)</div>
        <div className="mt-1 text-2xl font-semibold">{total7d}</div>
      </div>

      <div className="rounded-xl border bg-white p-3">
        <div className="text-xs text-gray-500">Average temp (last 7 days)</div>
        <div className="mt-1 text-2xl font-semibold">
          {avgTemp7d == null ? "—" : `${Number(avgTemp7d).toFixed(1)} °C`}
        </div>
      </div>

      <div className="rounded-xl border bg-white p-3">
        <div className="text-xs text-gray-500">Last temperature log</div>
        <div className="mt-1 text-sm">{fmtDateTime(lastLogAt)}</div>
      </div>
    </div>
  );
}

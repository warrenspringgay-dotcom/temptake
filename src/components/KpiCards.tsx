// src/components/KPICards.tsx
import { supabaseServer } from "@/lib/supabase-server";
import { getOrgId } from "@/lib/org-helpers";

type Kpis = {
  total7d: number;
  avgTemp7d: number | null;
  lastLogAt: string | null;
};

async function loadKpis(): Promise<Kpis> {
  const supabase = await createServerClient();
  const org_id = await getOrgId();
  if (!org_id) return { total7d: 0, avgTemp7d: null, lastLogAt: null };

  const since = new Date(Date.now() - 7 * 864e5).toISOString();

  // total last 7 days
  const { count: total7d } = await supabase
    .from("temp_logs")
    .select("id", { count: "exact", head: true })
    .eq("org_id", org_id)
    .gte("created_at", since);

  // avg temp last 7 days (for rows that have temp)
  const { data: avgRows, error: avgErr } = await supabase
    .from("temp_logs")
    .select("temp_c")
    .eq("org_id", org_id)
    .gte("created_at", since)
    .not("temp_c", "is", null);

  if (avgErr) throw avgErr;
  const temps = (avgRows ?? []).map(r => Number(r.temp_c)).filter(n => Number.isFinite(n));
  const avgTemp7d = temps.length ? +(temps.reduce((a, b) => a + b, 0) / temps.length).toFixed(1) : null;

  // last log at
  const { data: last } = await supabase
    .from("temp_logs")
    .select("created_at")
    .eq("org_id", org_id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  return {
    total7d: total7d ?? 0,
    avgTemp7d,
    lastLogAt: last?.created_at ?? null,
  };
}

export default async function KPICards() {
  const { total7d, avgTemp7d, lastLogAt } = await loadKpis();

  const Card = ({
    label,
    value,
    sub,
  }: { label: string; value: string; sub?: string }) => (
    <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
      <div className="text-xs text-gray-500">{label}</div>
      <div className="mt-1 text-2xl font-semibold tracking-tight">{value}</div>
      {sub ? <div className="mt-1 text-xs text-gray-400">{sub}</div> : null}
    </div>
  );

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3">
      <Card label="Logs (last 7 days)" value={String(total7d)} />
      <Card
        label="Avg temp (last 7 days)"
        value={avgTemp7d == null ? "—" : `${avgTemp7d} °C`}
      />
      <Card
        label="Last log"
        value={lastLogAt ? new Date(lastLogAt).toLocaleString() : "—"}
        sub={lastLogAt ? "Most recent entry time" : undefined}
      />
    </div>
  );
}

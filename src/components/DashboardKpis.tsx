/* Server component – renders 5 square KPIs with no duplicates:
   - Last log (most recent)
   - Top team logger (last 30d)
   - Total logs
   - Training expiring (≤14d)   -> green/red pill
   - Allergen review (≤14d)      -> green/red pill
*/
import { supabaseServer } from "@/lib/supabase-server";
import { getOrgId } from "@/lib/org-helpers";
import { countTrainingExpiring14d, countAllergenReviewExpiring14d } from "@/app/actions/kpis";

type TempRow = {
  id: string;
  date: string | null;
  created_at: string | null;
  staff_initials: string | null;
  status: "pass" | "fail" | null;
};

function Card({ title, value, sub }: { title: string; value: React.ReactNode; sub?: React.ReactNode }) {
  return (
    <div className="rounded-2xl border bg-white p-4 shadow-sm">
      <div className="text-xs text-gray-500">{title}</div>
      <div className="mt-1 text-2xl font-semibold">{value}</div>
      {sub ? <div className="mt-1 text-xs text-gray-500">{sub}</div> : null}
    </div>
  );
}

function Pill({ ok, label }: { ok: boolean; label: string }) {
  const base = "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium";
  return ok
    ? <span className={`${base} bg-green-100 text-green-700`}>{label}</span>
    : <span className={`${base} bg-red-100 text-red-700`}>{label}</span>;
}

export default async function DashboardKpisServer() {
  const supabase = await supabaseServer();
  const org_id = await getOrgId();

  const { data: rowsRaw, error } = await supabase
    .from("temp_logs")
    .select("id,date,created_at,staff_initials,status")
    .eq("org_id", org_id)
    .order("created_at", { ascending: false })
    .limit(500);

  if (error) {
    return (
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <Card title="Last log" value="—" />
        <Card title="Top team logger (30d)" value="—" />
        <Card title="Total logs" value="—" />
        <Card title="Training expiring (≤14d)" value={<Pill ok={true} label="OK" />} />
        <Card title="Allergen review (≤14d)" value={<Pill ok={true} label="OK" />} />
      </div>
    );
  }

  const rows: TempRow[] = rowsRaw ?? [];
  const totalLogs = rows.length;

  // Last log
  const latest = rows[0];
  const lastLogIso = latest?.date ?? latest?.created_at ?? null;
  const lastLogDisplay = lastLogIso
    ? (lastLogIso.length === 10 ? lastLogIso : new Date(lastLogIso).toLocaleString())
    : "—";

  // 30d stats
  const now = new Date();
  const cutoff = new Date(now);
  cutoff.setDate(now.getDate() - 30);

  let last30Count = 0;
  const byInitials = new Map<string, number>();

  for (const r of rows) {
    const dStr = r.date ?? r.created_at;
    if (!dStr) continue;
    const d = dStr.length === 10 ? new Date(dStr + "T00:00:00") : new Date(dStr);
    if (isNaN(d.getTime())) continue;
    if (d >= cutoff) {
      last30Count++;
      const ini = (r.staff_initials ?? "").toUpperCase().trim();
      if (ini) byInitials.set(ini, (byInitials.get(ini) ?? 0) + 1);
    }
  }

  let topLogger: string | null = null;
  let topCount = 0;
  for (const [ini, count] of byInitials) {
    if (count > topCount) {
      topCount = count;
      topLogger = ini;
    }
  }
  const topLoggerDisplay = topLogger ? `${topLogger} (${topCount})` : "—";

  const [trainingExp, allergenExp] = await Promise.all([
    countTrainingExpiring14d(),
    countAllergenReviewExpiring14d(),
  ]);

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
      <Card title="Last log" value={lastLogDisplay} sub={last30Count ? `Last 30d: ${last30Count}` : undefined} />
      <Card title="Top team logger (30d)" value={topLoggerDisplay} />
      <Card title="Total logs" value={totalLogs} />
      <Card title="Training expiring (≤14d)" value={<Pill ok={trainingExp === 0} label={trainingExp === 0 ? "OK" : "Attention"} />} />
      <Card title="Allergen review (≤14d)" value={<Pill ok={allergenExp === 0} label={allergenExp === 0 ? "OK" : "Attention"} />} />
    </div>
  );
}

// src/components/DashboardKpis.tsx
// Server component
import { createServerClient } from "@/lib/supabaseServer";
import type { SupabaseClient } from "@supabase/supabase-js";

async function countSince(
  client: SupabaseClient,
  table: string,
  dateCol: string,
  fromISO: string,
  userId: string
): Promise<number> {
  const { count, error } = await client
    .from(table)
    .select("*", { count: "exact", head: true })
    .eq("created_by", userId)
    .gte(dateCol, fromISO);

  if (error) return 0;
  return count ?? 0;
}

async function countSinceWithStatus(
  client: SupabaseClient,
  table: string,
  dateCol: string,
  fromISO: string,
  userId: string,
  status: string
): Promise<number> {
  const { count, error } = await client
    .from(table)
    .select("*", { count: "exact", head: true })
    .eq("created_by", userId)
    .eq("status", status)
    .gte(dateCol, fromISO);

  if (error) return 0;
  return count ?? 0;
}

async function distinctLocationsSince(
  client: SupabaseClient,
  table: string,
  dateCol: string,
  fromISO: string,
  userId: string
): Promise<number> {
  // Fetch minimal columns and count distinct in memory (works across PostgREST versions)
  const { data, error } = await client
    .from(table)
    .select("area, location")
    .eq("created_by", userId)
    .gte(dateCol, fromISO)
    .limit(1000); // adjust if you expect more

  if (error || !data) return 0;
  const set = new Set<string>();
  for (const r of data) {
    const loc = (r as any).area ?? (r as any).location ?? "";
    if (loc) set.add(String(loc));
  }
  return set.size;
}

export default async function DashboardKpis() {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // If not signed in, render zeros (or redirect—up to you)
  if (!user) {
    return (
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {["Entries today", "Last 7 days", "Failures (7d)", "Locations (7d)"].map((label) => (
          <div key={label} className="rounded-xl border bg-white p-3">
            <div className="text-xs text-gray-500">{label}</div>
            <div className="text-2xl font-semibold">0</div>
          </div>
        ))}
      </div>
    );
  }

  const today = new Date();
  const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate())
    .toISOString()
    .slice(0, 10); // yyyy-mm-dd
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 3600 * 1000)
    .toISOString()
    .slice(0, 10); // yyyy-mm-dd

  // Adjust table/column names if yours differ
  const table = "food_temp_logs";
  const dateCol = "at"; // change to your actual date column if needed

  const [entriesToday, last7, failures7, locations7] = await Promise.all([
    countSince(supabase, table, dateCol, startOfToday, user.id),
    countSince(supabase, table, dateCol, sevenDaysAgo, user.id),
    countSinceWithStatus(supabase, table, dateCol, sevenDaysAgo, user.id, "fail"),
    distinctLocationsSince(supabase, table, dateCol, sevenDaysAgo, user.id),
  ]);

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <div className="rounded-xl border bg-white p-3">
        <div className="text-xs text-gray-500">Entries today</div>
        <div className="text-2xl font-semibold">{entriesToday}</div>
      </div>
      <div className="rounded-xl border bg-white p-3">
        <div className="text-xs text-gray-500">Last 7 days</div>
        <div className="text-2xl font-semibold">{last7}</div>
      </div>
      <div className="rounded-xl border bg-white p-3">
        <div className="text-xs text-gray-500">Failures (7d)</div>
        <div className="text-2xl font-semibold">{failures7}</div>
      </div>
      <div className="rounded-xl border bg-white p-3">
        <div className="text-xs text-gray-500">Locations (7d)</div>
        <div className="text-2xl font-semibold">{locations7}</div>
      </div>
    </div>
  );
}

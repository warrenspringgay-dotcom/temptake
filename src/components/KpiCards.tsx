// src/components/KpiCards.tsx
// Server component (no "use client")
import { getServerSupabase } from "@/lib/supabaseServer";
import { getActiveOrgIdServer } from "@/lib/orgServer";
import type { SupabaseClient } from "@supabase/supabase-js";

async function resolveOrgId(supabase: SupabaseClient): Promise<string | null> {
  // Prefer your helper (cookie/JWT/profile)
  const org = await getActiveOrgIdServer();
  if (org) return org;

  // Fallback: try user -> profile lookup
  const { data: userData } = await supabase.auth.getUser();
  const uid = userData.user?.id;
  if (!uid) return null;
  const { data: prof } = await supabase
    .from("profiles")
    .select("org_id")
    .eq("id", uid)
    .maybeSingle();
  return (prof?.org_id as string) ?? null;
}

export default async function KpiCards() {
  const supabase = await getServerSupabase();
  const orgId = await resolveOrgId(supabase);

  // Default zeros in case org or queries fail
  let trainingDue = 0;
  let allergenDue = 0;

  // Look 14 days ahead
  const soonISO = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

  try {
    // Count trainings expiring within 14 days
    const { count: c1, error: e1 } = await supabase
      .from("trainings")
      .select("id", { count: "exact", head: true })
      .lte("expires_on", soonISO)
      .order("expires_on", { ascending: true })
      .maybeSingle(); // head: true means no rows, but count still returns
    if (!e1 && typeof c1 === "number") trainingDue = c1;
  } catch {}

  try {
    // Allergen: prefer 'next_due'; if your schema uses a different column,
    // uncomment another block or adjust the column name below.
    let count = 0;

    // next_due
    const { count: a1, error: ae1 } = await supabase
      .from("allergen_reviews")
      .select("id", { count: "exact", head: true })
      .lte("next_due", soonISO)
      .maybeSingle();
    if (!ae1 && typeof a1 === "number") count = Math.max(count, a1 ?? 0);

    // next_review_due (fallback)
    const { count: a2, error: ae2 } = await supabase
      .from("allergen_reviews")
      .select("id", { count: "exact", head: true })
      .lte("next_review_due", soonISO)
      .maybeSingle();
    if (!ae2 && typeof a2 === "number") count = Math.max(count, a2 ?? 0);

    allergenDue = count;
  } catch {}

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <div className="rounded-xl border bg-white p-3">
        <div className="text-xs text-gray-500">Training</div>
        <div className="mt-1 inline-flex items-center gap-2">
          <span className="text-2xl font-semibold">{trainingDue}</span>
          <span className="text-xs text-gray-500">due in 14 days</span>
        </div>
      </div>
      <div className="rounded-xl border bg-white p-3">
        <div className="text-xs text-gray-500">Allergen Review</div>
        <div className="mt-1 inline-flex items-center gap-2">
          <span className="text-2xl font-semibold">{allergenDue}</span>
          <span className="text-xs text-gray-500">due in 14 days</span>
        </div>
      </div>
      {/* Add two empty cards (or other KPIs) to keep a 4-card grid */}
      <div className="rounded-xl border bg-white p-3">
        <div className="text-xs text-gray-500">Entries today</div>
        <div className="text-2xl font-semibold">—</div>
      </div>
      <div className="rounded-xl border bg-white p-3">
        <div className="text-xs text-gray-500">Locations (7d)</div>
        <div className="text-2xl font-semibold">—</div>
      </div>
    </div>
  );
}

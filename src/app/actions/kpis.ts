// src/app/actions/kpis.ts
"use server";
import { createServerClient } from "@/lib/supabaseServer";

export async function countTrainingExpiring14d(org_id: string | null) {
  if (!org_id) return 0; // nothing to scope by – render 0
  const supabase = await createServerClient();
  const { data, error } = await supabase
    .from("team_training")
    .select("id")
    .eq("org_id", org_id)
    .lte("expires_on", new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10));

  if (error) return 0;
  return data?.length ?? 0;
}

export async function countAllergenReviewExpiring14d(org_id: string | null) {
  if (!org_id) return 0;
  const supabase = await createServerClient();
  const { data, error } = await supabase
    .from("allergen_reviews")
    .select("id")
    .eq("org_id", org_id)
    .lte("next_review_due", new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10));

  if (error) return 0;
  return data?.length ?? 0;
}

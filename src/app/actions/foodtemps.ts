// src/app/actions/foodtemps.ts
"use server";

import { revalidatePath } from "next/cache";
import { createServerClient } from "@/lib/supabaseServer";
import { getOrgId } from "@/lib/org";

export type NewFoodTemp = {
  takenAt?: string;     // ISO, optional
  location: string;
  item: string;
  tempC: number;
  source: "probe" | "fridge" | "freezer" | "delivery" | "other";
  notes?: string;
};

export async function logFoodTemp(payload: NewFoodTemp) {
  const supabase = await createServerClient();
  const orgId = await getOrgId();

  const { error } = await supabase.from("food_temps").insert({
    org_id: orgId,
    user_id: (await supabase.auth.getUser()).data.user?.id,
    taken_at: payload.takenAt ?? new Date().toISOString(),
    location: payload.location.trim(),
    item: payload.item.trim(),
    temp_c: payload.tempC,
    source: payload.source,
    notes: payload.notes?.trim() ?? null,
  });

  if (error) return { ok: false as const, message: error.message };

  // keep reports & dashboard fresh on SSR paths
  revalidatePath("/reports");
  revalidatePath("/");
  return { ok: true as const };
}

// src/app/actions/foodtemps.ts
"use server";

import { revalidatePath } from "next/cache";
import { getServerSupabase } from "@/lib/supabaseServer";
import { requireUser } from "@/lib/requireUser";
import { getOrgId } from "@/lib/org";

export type NewFoodTemp = {
  takenAt?: string; // ISO optional
  location: string;
  item: string;
  tempC: number;
  source: "probe" | "fridge" | "freezer" | "delivery" | "other";
  notes?: string;
};

type Result =
  | { ok: true }
  | { ok: false; message: string };

export async function logFoodTemp(payload: NewFoodTemp): Promise<Result> {
  // ✅ enforce auth
  const user = await requireUser();

  const supabase = await getServerSupabase();

  // ✅ derive org (adjust if your helper needs args)
  const orgId = await getOrgId(); // or: getOrgId(user)

  // ✅ light validation/normalization
  const location = (payload.location ?? "").trim();
  const item = (payload.item ?? "").trim();
  const tempC = Number(payload.tempC);
  const source = payload.source ?? "other";
  const taken_at = payload.takenAt ?? new Date().toISOString();
  const notes = payload.notes?.trim() || null;

  if (!location) return { ok: false, message: "Location is required." };
  if (!item) return { ok: false, message: "Item is required." };
  if (!Number.isFinite(tempC)) return { ok: false, message: "Temperature must be a number." };

  // ⚠️ Ensure the table/columns match your schema:
  //   If your table is `food_temp_logs` and the time column is `at`, rename accordingly.
  const { error } = await supabase.from("food_temps").insert({
    org_id: orgId,
    user_id: user.id,              // <- from requireUser()
    taken_at,                      // or `at` if your column is named that
    location,
    item,
    temp_c: tempC,
    source,
    notes,
  });

  if (error) return { ok: false, message: error.message };

  // keep SSR pages fresh
  revalidatePath("/reports");
  revalidatePath("/"); // dashboard/home

  return { ok: true };
}

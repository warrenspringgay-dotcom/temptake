// src/app/actions/foodtemps.ts
"use server";

import { revalidatePath } from "next/cache";
import { getServerSupabase } from "@/lib/supabaseServer";
import { requireUser } from "@/lib/requireUser";
import { getActiveOrgIdServer } from "@/lib/orgServer";

export type NewFoodTemp = {
  takenAt?: string; // ISO optional
  location: string;
  item: string;
  tempC: number;
  // keep for caller compatibility, but we don't insert it unless your table has this column
  source?: "probe" | "fridge" | "freezer" | "delivery" | "other";
  notes?: string;
};

type Result = { ok: true } | { ok: false; message: string };

export async function logFoodTemp(payload: NewFoodTemp): Promise<Result> {
  // ✅ Require authentication
  const user = await requireUser();
  const supabase = await getServerSupabase();

  // ✅ Get organisation ID safely
  const orgId = await getActiveOrgIdServer();

  // ✅ Validate and normalise data
  const location = (payload.location ?? "").trim();
  const item = (payload.item ?? "").trim();
  const tempC = Number(payload.tempC);
  const taken_at = payload.takenAt ?? new Date().toISOString();
  const notes = payload.notes?.trim() || null;

  if (!location) return { ok: false, message: "Location is required." };
  if (!item) return { ok: false, message: "Item is required." };
  if (!Number.isFinite(tempC)) return { ok: false, message: "Temperature must be a number." };

  // ✅ Prepare record for insertion
  // Your Supabase table `food_temp_logs` has columns:
  // id, org_id, created_by, at, area, target_key, temp_c, status, note, meta, staff_initials
  const insertRow: any = {
    org_id: orgId,
    created_by: user.id,      // correct column name (not user_id)
    at: taken_at,
    area: location,
    note: item,
    temp_c: tempC,
    status: "ok",             // required if status column is NOT NULL
    notes,                    // optional
  };

  // ✅ Insert into Supabase
  const { error } = await supabase.from("food_temp_logs").insert(insertRow);

  if (error) {
    return { ok: false, message: error.message };
  }

  // ✅ Revalidate pages that display this data
  revalidatePath("/foodtemps");    // correct route
  revalidatePath("/dashboard");
  revalidatePath("/");

  return { ok: true };
}

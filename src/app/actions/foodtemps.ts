// src/app/actions/foodtemps.ts
"use server";

import { revalidatePath } from "next/cache";
import { getServerSupabase } from "@/lib/supabaseServer";
import { requireUser } from "@/lib/requireUser";
import { getActiveOrgIdServer } from "@/lib/orgServer";
import { getActiveLocationIdServer } from "@/lib/locationServer"; // create if you don't have it

export type NewFoodTemp = {
  takenAt?: string;          // ISO optional
  area: string;              // e.g. "Fridge 1", "Hot hold", "Delivery"
  targetKey: string;         // stable key for routine item
  tempC: number;
  note?: string | null;
  staffInitials?: string | null;
  teamMemberId?: string | null; // uuid
};

type Result = { ok: true } | { ok: false; message: string };

export async function logFoodTemp(payload: NewFoodTemp): Promise<Result> {
  const user = await requireUser();
  const supabase = await getServerSupabase();

  const orgId = await getActiveOrgIdServer();
  const locationId = await getActiveLocationIdServer();

  const area = (payload.area ?? "").trim();
  const targetKey = (payload.targetKey ?? "").trim();
  const tempC = Number(payload.tempC);
  const at = payload.takenAt ?? new Date().toISOString();

  if (!area) return { ok: false, message: "Area is required." };
  if (!targetKey) return { ok: false, message: "Item is required." };
  if (!Number.isFinite(tempC)) return { ok: false, message: "Temperature must be a number." };

  const insertRow = {
    org_id: orgId,
    location_id: locationId,
    created_by: user.id,
    at,
    area,
    target_key: targetKey,
    temp_c: tempC,
    status: "pass",
    note: payload.note?.trim() || null,
    staff_initials: payload.staffInitials?.trim() || null,
    team_member_id: payload.teamMemberId || null,
    meta: {}, // keep if you use it
  };

  const { error } = await supabase.from("food_temp_logs").insert(insertRow);

  if (error) return { ok: false, message: error.message };

  revalidatePath("/foodtemps");
  revalidatePath("/dashboard");
  return { ok: true };
}

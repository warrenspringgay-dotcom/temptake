// src/app/actions/foodtemps.ts
"use server";

import { revalidatePath } from "next/cache";
import { getServerSupabase } from "@/lib/supabaseServer";
import { requireUser } from "@/lib/requireUser";
import { getActiveOrgIdServer } from "@/lib/orgServer";

export type NewFoodTemp = {
  takenAt?: string; // ISO optional

  // "Area" within the site (Kitchen, Delivery, Fridge 1 etc.)
  location: string;

  item: string;
  tempC: number;

  // NEW: explicit site id (source of truth)
  locationId?: string | null;

  // keep for caller compatibility
  source?: "probe" | "fridge" | "freezer" | "delivery" | "other";
  notes?: string;
};

type Result = { ok: true } | { ok: false; message: string };

export async function logFoodTemp(payload: NewFoodTemp): Promise<Result> {
  const user = await requireUser();
  const supabase = await getServerSupabase();
  const orgId = await getActiveOrgIdServer();

  const area = (payload.location ?? "").trim();
  const item = (payload.item ?? "").trim();
  const tempC = Number(payload.tempC);
  const atIso = payload.takenAt ?? new Date().toISOString();
  const notes = payload.notes?.trim() || null;

  if (!area) return { ok: false, message: "Location/area is required." };
  if (!item) return { ok: false, message: "Item is required." };
  if (!Number.isFinite(tempC)) return { ok: false, message: "Temperature must be a number." };

  // Resolve site location_id
  let location_id: string | null = payload.locationId ?? null;

  // If caller didn't send locationId, pick the first active location for this org (server-side fallback).
  // This matches your client helper behaviour.
  if (!location_id) {
    const { data, error } = await supabase
      .from("locations")
      .select("id")
      .eq("org_id", orgId)
      .eq("active", true)
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();

    if (error || !data?.id) {
      return { ok: false, message: "No active site selected (or available). Create/select a location first." };
    }

    location_id = String(data.id);
  }

  // Insert row
  const insertRow: any = {
    org_id: orgId,
    location_id,              // ✅ site scope (critical)
    created_by: user.id,
    at: atIso,
    area,                     // within-site area label
    note: item,
    temp_c: tempC,
    status: "ok",
    notes,
  };

  const { error: insErr } = await supabase.from("food_temp_logs").insert(insertRow);

  if (insErr) {
    return { ok: false, message: insErr.message };
  }

  revalidatePath("/foodtemps");
  revalidatePath("/dashboard");
  revalidatePath("/");

  return { ok: true };
}

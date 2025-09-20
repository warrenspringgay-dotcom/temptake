// src/app/actions/db.ts
"use server";

import { revalidatePath } from "next/cache";
import { supabaseServer } from "@/lib/supabase-server"; // your existing helper
import { getOrgId } from "@/lib/org-helpers";

/** Narrow shape for inserting/updating from FoodTempLogger */
export type TempLogInsert = {
  id?: string | null;             // may be a non-UUID from local cache; we'll strip it
  date?: string | null;           // "YYYY-MM-DD"
  staff_initials?: string | null;
  location?: string | null;
  item?: string | null;
  target_key?: string | null;     // optional in DB
  temp_c?: number | null;
};

const isUuid = (v: unknown) =>
  typeof v === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v || "");

/** List latest temp logs for the current org (limit optional). */
export async function listTempLogs(limit = 200) {
  const supabase = await supabaseServer();
  const org_id = await getOrgId();

  const { data, error } = await supabase
    .from("temp_logs")
    .select("id,date,created_at,staff_initials,location,item,target_key,temp_c,org_id")
    .eq("org_id", org_id)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data ?? [];
}

/** Insert (or update if a *real* UUID id is provided). Always sets org_id. */
export async function upsertTempLog(input: TempLogInsert) {
  const supabase = await supabaseServer();
  const org_id = await getOrgId();

  // Build a clean row. If id is not a UUID, omit it and let DB generate one.
  const row: Record<string, any> = {
    org_id,
    date: input.date ?? null,
    staff_initials: input.staff_initials ?? null,
    location: input.location ?? null,
    item: input.item ?? null,
    target_key: input.target_key ?? null,
    temp_c: input.temp_c ?? null,
  };
  if (isUuid(input.id)) row.id = input.id;

  // Use upsert only when id is UUID; otherwise do a plain insert
  const q = isUuid(row.id)
    ? supabase.from("temp_logs").upsert(row, { onConflict: "id" }).select("id").single()
    : supabase.from("temp_logs").insert(row).select("id").single();

  const { error } = await q;
  if (error) throw error;

  revalidatePath("/");          // dashboard
  revalidatePath("/reports");   // reports
}

/** Delete a log by id, scoped to current org. */
export async function deleteTempLog(id: string) {
  if (!isUuid(id)) return; // ignore local-only ids
  const supabase = await supabaseServer();
  const org_id = await getOrgId();

  const { error } = await supabase.from("temp_logs").delete().eq("id", id).eq("org_id", org_id);
  if (error) throw error;

  revalidatePath("/");
  revalidatePath("/reports");
}

/** Optional: staff initials quick list pulled from latest logs (org-scoped). */
export async function listStaffInitials() {
  const supabase = await supabaseServer();
  const org_id = await getOrgId();

  // Quick-and-safe: pick from latest 500 logs then de-dup in JS
  const { data, error } = await supabase
    .from("temp_logs")
    .select("staff_initials")
    .eq("org_id", org_id)
    .order("created_at", { ascending: false })
    .limit(500);

  if (error) throw error;

  const set = new Set<string>();
  for (const r of data ?? []) {
    const v = (r.staff_initials ?? "").toString().trim().toUpperCase();
    if (v) set.add(v);
  }
  return Array.from(set);
}

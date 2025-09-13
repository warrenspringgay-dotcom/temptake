// src/app/actions/db.ts
"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase-server";

/** ───────────────────────── Types used by FoodTempLogger ───────────────────────── */

export type TempLogRow = {
  id: string;
  created_at: string;          // timestamptz in DB
  date: string;                // derived on the server for UI (YYYY-MM-DD)
  staff_name: string | null;
  location: string | null;
  item: string | null;
  temp_c: number | null;
  target_c: number | null;     // mapped from DB column `target` if that exists
  notes: string | null;
};

export type TempLogInput = {
  id?: string;
  item?: string | null;
  temp_c?: number | null;
  target_c?: number | null;    // will be written to DB column `target`
  location?: string | null;
  notes?: string | null;
  staff_name?: string | null;
};

/** Small helper: safe number parse */
function toNum(v: any): number | null {
  if (v === null || v === undefined || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

/** ───────────────────────── temp_logs queries (no joins) ───────────────────────── */

/**
 * List recent logs. We do NOT select from other tables (avoids profiles/policies recursion).
 * We try to read a column named `target`; if it doesn't exist, target_c will be null.
 */
export async function listTempLogs(limit = 100): Promise<TempLogRow[]> {
  const supabase = await createSupabaseServerClient();

  // First: try selecting the common columns that DO exist in your DB.
  // You said you have: id, created_at, item, temp_c, target, staff_name, location, notes.
  // We’ll select `target` and then remap to `target_c` for the UI.
  const sel =
    "id, created_at, item, temp_c, target, staff_name, location, notes";

  const { data, error } = await supabase
    .from("temp_logs")
    .select(sel)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.error(" Server  [listTempLogs]", error);
    // last resort: try without target if schema is even more minimal
    const { data: data2, error: err2 } = await supabase
      .from("temp_logs")
      .select("id, created_at, item, temp_c, staff_name, location, notes")
      .order("created_at", { ascending: false })
      .limit(limit);

    if (err2) {
      console.error(" Server  [listTempLogs fallback]", err2);
      throw err2;
    }

    return (data2 ?? []).map((r: any) => ({
      id: r.id,
      created_at: r.created_at,
      date: new Date(r.created_at).toISOString().slice(0, 10),
      staff_name: r.staff_name ?? null,
      location: r.location ?? null,
      item: r.item ?? null,
      temp_c: toNum(r.temp_c),
      target_c: null,
      notes: r.notes ?? null,
    }));
  }

  // Normal map (with `target`)
  return (data ?? []).map((r: any) => ({
    id: r.id,
    created_at: r.created_at,
    date: new Date(r.created_at).toISOString().slice(0, 10),
    staff_name: r.staff_name ?? null,
    location: r.location ?? null,
    item: r.item ?? null,
    temp_c: toNum(r.temp_c),
    target_c: toNum(r.target),             // <— map DB `target` to UI `target_c`
    notes: r.notes ?? null,
  }));
}

/**
 * Insert or update one log. We write `target_c` into DB column `target`.
 * No other tables touched.
 */
export async function upsertTempLog(input: TempLogInput) {
  const supabase = await createSupabaseServerClient();

  const payload: Record<string, any> = {
    id: input.id,
    item: input.item ?? null,
    temp_c: toNum(input.temp_c),
    target: toNum(input.target_c),        // <— your DB column is `target`
    location: input.location ?? null,
    notes: input.notes ?? null,
    staff_name: input.staff_name ?? null,
  };

  const { error } = await supabase
    .from("temp_logs")
    .upsert(payload, { onConflict: "id" })
    .select()
    .single();

  if (error) {
    console.error(" Server  [upsertTempLog]", error);
    throw error;
  }

  revalidatePath("/");
}

/** Delete one log by id (no other tables). */
export async function deleteTempLog(id: string) {
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("temp_logs").delete().eq("id", id);
  if (error) {
    console.error(" Server  [deleteTempLog]", error);
    throw error;
  }
  revalidatePath("/");
}

/**
 * Staff picker for the logger.
 * We DO NOT touch profiles/staff tables to avoid your recursion policy issue.
 * We only collect distinct `staff_name` values from temp_logs.
 */
export async function listStaffInitials(): Promise<
  { label: string; value: string }[]
> {
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from("temp_logs")
    .select("staff_name")
    .not("staff_name", "is", null);

  if (error) {
    console.error(" Server  [listStaffInitials]", error);
    return [];
  }

  const uniq = Array.from(
    new Set((data ?? []).map((r: any) => String(r.staff_name)))
  )
    .filter(Boolean)
    .sort((a, b) => a.localeCompare(b));

  return uniq.map((name) => ({
    label: `${initialsFromName(name)} — ${name}`,
    value: name,
  }));
}

function initialsFromName(name?: string | null) {
  if (!name) return "";
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((s) => s[0]!.toUpperCase())
    .join("");
}

/**
 * Targets (presets) for the target dropdown.
 * To avoid your `profiles` recursion and unknown presets schema, we:
 *  1) read distinct numeric targets from temp_logs.target,
 *  2) merge with a small default list,
 *  3) return as {id,name} where name is a display string (e.g. "75").
 */
export async function listTargets(): Promise<{ id: string; name: string }[]> {
  const supabase = await createSupabaseServerClient();

  // distinct targets that already exist in your logs
  const { data, error } = await supabase
    .from("temp_logs")
    .select("target")
    .not("target", "is", null);

  if (error) {
    console.error(" Server  [listTargets] from temp_logs", error);
  }

  const fromLogs = Array.from(
    new Set(
      (data ?? [])
        .map((r: any) => toNum(r.target))
        .filter((n): n is number => Number.isFinite(n as number))
    )
  );

  // A small default set you can tweak
  const defaults = [63, 65, 70, 75, 80];

  const merged = Array.from(new Set([...fromLogs, ...defaults])).sort(
    (a, b) => a - b
  );

  return merged.map((n, idx) => ({
    id: String(idx + 1),
    name: String(n),
  }));
}

/** If something still needs the user id, expose a helper. */
export async function requireUserId(): Promise<string | null> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error) {
    console.error(" Server  [requireUserId]", error);
  }
  return user?.id ?? null;
}

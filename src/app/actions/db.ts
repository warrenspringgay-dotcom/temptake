// src/app/actions/db.ts
"use server";

import { createSupabaseServerClient } from "@/lib/supabase-server";

/** Types used by FoodTempLogger.tsx */
export type TempLogRow = {
  id: string;
  created_at: string; // ISO
  staff: string;
  location: string;
  item: string;
  target: string; // e.g. "Chilled 0–5°C"
  temp_c: number;
  pass: boolean;
  notes: string | null;
};

export type TempLogInput = {
  staff: string;
  location: string;
  item: string;
  target: string;
  temp_c: number;
  notes: string | null;
};

/** Utility */
const uid = () => Math.random().toString(36).slice(2);
const todayISO = () => new Date().toISOString();

/**
 * List temperature logs for a date range.
 * Expects a 'temp_logs' table (created_at, staff, location, item, target, temp_c, pass, notes).
 * Falls back to empty array if the table is missing.
 */
export async function listTempLogs({ from, to }: { from: string; to: string }): Promise<TempLogRow[]> {
  try {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase
      .from("temp_logs")
      .select("*")
      .gte("created_at", from)
      .lte("created_at", to)
      .order("created_at", { ascending: false });

    if (error || !data) return [];
    // Ensure shape matches UI
    return data.map((r: any) => ({
      id: String(r.id ?? uid()),
      created_at: r.created_at ?? todayISO(),
      staff: r.staff ?? "",
      location: r.location ?? "",
      item: r.item ?? "",
      target: r.target ?? "Unspecified",
      temp_c: Number(r.temp_c ?? 0),
      pass: Boolean(r.pass ?? true),
      notes: r.notes ?? null,
    }));
  } catch {
    return [];
  }
}

/**
 * Insert or update a temperature log.
 * Returns: { id }
 */
export async function upsertTempLog(input: TempLogInput): Promise<{ id: string }> {
  try {
    const supabase = await createSupabaseServerClient();
    const payload = { ...input, created_at: todayISO(), pass: true }; // 'pass' can be recomputed client-side; store for convenience
    const { data, error } = await supabase.from("temp_logs").insert(payload).select("id").single();
    if (error || !data) return { id: uid() };
    return { id: String(data.id) };
  } catch {
    return { id: uid() };
  }
}

/** Delete a log by id (ignore errors). */
export async function deleteTempLog(id: string): Promise<void> {
  try {
    const supabase = await createSupabaseServerClient();
    await supabase.from("temp_logs").delete().eq("id", id);
  } catch {
    // no-op
  }
}

/**
 * List staff initials (used by the quick entry).
 * Expects a 'staff' table (initials text). Falls back to a few suggestions.
 */
export async function listStaffInitials(): Promise<string[]> {
  try {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase.from("staff").select("initials").order("initials");
    if (error || !data) return ["AA", "BB", "CC"];
    return (data as Array<{ initials: string }>).map((r) => r.initials || "").filter(Boolean);
  } catch {
    return ["AA", "BB", "CC"];
  }
}

/**
 * List temperature targets to display in the dropdown.
 * Expects a 'targets' table (id uuid/text, name text, min numeric, max numeric).
 * Falls back to sensible defaults.
 */
export type TargetRow = { id: string; name: string; min: number; max: number };

export async function listTargets(): Promise<TargetRow[]> {
  try {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase.from("targets").select("id,name,min,max").order("name");
    if (error || !data) {
      return [
        { id: "chilled", name: "Chilled", min: 0, max: 5 },
        { id: "hot-hold", name: "Hot hold", min: 63, max: 100 },
        { id: "frozen", name: "Frozen", min: -25, max: -15 },
      ];
    }
    return (data as any[]).map((r) => ({
      id: String(r.id ?? uid()),
      name: r.name ?? "Target",
      min: Number(r.min ?? 0),
      max: Number(r.max ?? 0),
    }));
  } catch {
    return [
      { id: "chilled", name: "Chilled", min: 0, max: 5 },
      { id: "hot-hold", name: "Hot hold", min: 63, max: 100 },
      { id: "frozen", name: "Frozen", min: -25, max: -15 },
    ];
  }
}

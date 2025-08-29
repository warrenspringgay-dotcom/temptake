// src/app/actions/db.ts
"use server";

import { cookies as nextCookies } from "next/headers";
import { supabaseServer } from "@/lib/supabase";

/** ===== Types that mirror your Supabase tables ===== */
export type TempLogRow = {
  id: string;
  org_id: string | null;
  created_at: string;
  recorded_at: string;         // ISO (YYYY-MM-DD) or datetime; UI uses slice(0,10)
  staff_initials: string | null;
  location: string | null;
  target: string | null;       // e.g. "Fridge", "Freezer", "Cook", "Hot hold"
  item: string | null;         // free text (optional)
  temperature: number | null;
  unit: "C" | "F" | null;
  pass: boolean | null;
  notes: string | null;
};

export type TempLogInput = {
  id?: string;                  // present for edits; omit for create
  recorded_at: string;
  staff_initials?: string | null;
  location?: string | null;
  target?: string | null;
  item?: string | null;
  temperature?: number | null;
  unit?: "C" | "F" | null;
  pass?: boolean | null;
  notes?: string | null;
};

/** ===== Supabase client (Next 15: await cookies()) =====
 * In Server Actions we read cookies; writing is a no-op here.
 */
async function sb() {
  const store = await nextCookies();
  const adapter = {
    get: (name: string) => store.get(name)?.value,
    getAll: () => store.getAll().map((c) => ({ name: c.name, value: c.value })),
    set: (_name: string, _value: string, _options: any) => {
      /* no-op in Server Actions */
    },
    remove: (_name: string, _options: any) => {
      /* no-op in Server Actions */
    },
  };
  return supabaseServer(adapter as any);
}

/** Helper: fetch org_id for the current user (used by RLS) */
async function currentOrgId(): Promise<string | null> {
  const client = await sb();
  const { data: { user } } = await client.auth.getUser();
  if (!user) return null;
  const { data, error } = await client
    .from("profiles")
    .select("org_id")
    .eq("id", user.id)
    .single();
  if (error) return null;
  return (data as { org_id: string | null }).org_id ?? null;
}

/** ===== Temp Logs CRUD ===== */

/** List logs (optionally by date range or search). */
export async function listTempLogs(params?: {
  from?: string;     // inclusive (YYYY-MM-DD)
  to?: string;       // inclusive (YYYY-MM-DD)
  query?: string;    // free-text query over item/location/target/notes
  limit?: number;    // default 200
  offset?: number;   // for pagination
}): Promise<TempLogRow[]> {
  const client = await sb();
  let q = client
    .from("temp_logs")
    .select(
      "id, org_id, created_at, recorded_at, staff_initials, location, target, item, temperature, unit, pass, notes"
    )
    // If recorded_at just got added to your DB, you can keep only created_at ordering temporarily.
    .order("recorded_at", { ascending: false })
    .order("created_at", { ascending: false });

  if (params?.from) q = q.gte("recorded_at", params.from);
  if (params?.to) q = q.lte("recorded_at", params.to);
  if (params?.query && params.query.trim()) {
    const term = `%${params.query.trim()}%`;
    q = q.or(
      [
        `item.ilike.${term}`,
        `location.ilike.${term}`,
        `target.ilike.${term}`,
        `notes.ilike.${term}`,
        `staff_initials.ilike.${term}`,
      ].join(",")
    );
  }
  if (typeof params?.limit === "number") q = q.limit(params.limit);
  if (typeof params?.offset === "number")
    q = q.range(params.offset, (params.offset ?? 0) + (params.limit ?? 200) - 1);

  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []) as TempLogRow[];
}

/** Insert or update a log. Returns the saved row. */
export async function upsertTempLog(input: TempLogInput): Promise<TempLogRow> {
  const client = await sb();
  const orgId = await currentOrgId(); // may be null in guest mode depending on RLS

  const row = {
    id: input.id ?? undefined,
    org_id: orgId,
    recorded_at: input.recorded_at,
    staff_initials: input.staff_initials ?? null,
    location: input.location ?? null,
    target: input.target ?? null,
    item: input.item ?? null,
    temperature: input.temperature ?? null,
    unit: input.unit ?? null,
    pass: typeof input.pass === "boolean" ? input.pass : null,
    notes: input.notes ?? null,
  };

  const { data, error } = await client
    .from("temp_logs")
    .upsert(row, { onConflict: "id", ignoreDuplicates: false })
    .select(
      "id, org_id, created_at, recorded_at, staff_initials, location, target, item, temperature, unit, pass, notes"
    )
    .single();

  if (error) throw error;
  return data as TempLogRow;
}

/** Delete a log by id. */
export async function deleteTempLog(id: string): Promise<void> {
  const client = await sb();
  const { error } = await client.from("temp_logs").delete().eq("id", id);
  if (error) throw error;
}

/** ===== Lookups used by the UI (staff initials & targets) ===== */

/** Distinct staff initials from staff_profiles (team members). */
export async function listStaffInitials(): Promise<string[]> {
  const client = await sb();
  const { data, error } = await client
    .from("staff_profiles")
    .select("initials")
    .order("initials", { ascending: true });

  if (error) throw error;
  const dedup = new Set<string>();
  for (const r of (data ?? []) as Array<{ initials: string | null }>) {
    const v = (r.initials ?? "").trim();
    if (v) dedup.add(v.toUpperCase());
  }
  return [...dedup];
}

/** Targets (Fridge/Freezer/Cook/etc.). We read from `presets` where kind='target'. */
export async function listTargets(): Promise<string[]> {
  const client = await sb();
  const { data, error } = await client
    .from("presets")
    .select("value")
    .eq("kind", "target")
    .order("value", { ascending: true });

  if (error) throw error;
  return (data ?? [])
    .map((r: { value: string | null }) => (r.value ?? "").trim())
    .filter(Boolean);
}

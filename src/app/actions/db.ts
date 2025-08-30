// src/app/actions/db.ts
"use server";

import { cookies as nextCookies } from "next/headers";
import { supabaseServer, type ServerCookieAdapter } from "@/lib/supabase";
import type { SerializeOptions } from "cookie";

/** ===== Types that mirror your Supabase tables ===== */
export type TempLogRow = {
  id: string;
  org_id: string | null;
  created_at: string;
  recorded_at: string; // YYYY-MM-DD
  staff_initials: string | null;
  location: string | null;
  target: string | null; // Fridge/Freezer/Cook/Hot hold
  item: string | null;
  temperature: number | null;
  unit: "C" | "F" | null;
  pass: boolean | null;
  notes: string | null;
};

export type TempLogInput = {
  id?: string;
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

/** Build an authenticated Supabase server client (Next 15 cookies() must be awaited). */
async function sb() {
  const store = await nextCookies();
  const adapter: ServerCookieAdapter = {
    get(name) {
      return store.get(name)?.value;
    },
    getAll() {
      return store.getAll().map((c) => ({ name: c.name, value: c.value }));
    },
    set(name, value, options?: Partial<SerializeOptions>) {
      store.set(name, value, options ?? {});
    },
    remove(name, options?: Partial<SerializeOptions>) {
      store.set(name, "", { ...(options ?? {}), maxAge: 0 });
    },
  };
  return supabaseServer(adapter);
}

/** Helper: fetch org_id for current user (used by RLS). */
async function currentOrgId(): Promise<string | null> {
  const client = await sb();
  const { data: auth } = await client.auth.getUser();
  const user = auth?.user;
  if (!user) return null;
  const { data, error } = await client
    .from("profiles")
    .select("org_id")
    .eq("id", user.id)
    .maybeSingle();

  if (error) return null;
  return (data as { org_id: string | null } | null)?.org_id ?? null;
}

/** ===== Temp Logs CRUD ===== */
export async function listTempLogs(params?: {
  from?: string;
  to?: string;
  query?: string;
  limit?: number;
  offset?: number;
}): Promise<TempLogRow[]> {
  const client = await sb();
  let q = client
    .from("temp_logs")
    .select(
      "id, org_id, created_at, recorded_at, staff_initials, location, target, item, temperature, unit, pass, notes"
    )
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
  if (typeof params?.offset === "number") {
    const start = params.offset;
    const end = start + (params.limit ?? 200) - 1;
    q = q.range(start, end);
  }

  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []) as TempLogRow[];
}

export async function upsertTempLog(input: TempLogInput): Promise<TempLogRow> {
  const client = await sb();
  const orgId = await currentOrgId();

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

export async function deleteTempLog(id: string): Promise<void> {
  const client = await sb();
  const { error } = await client.from("temp_logs").delete().eq("id", id);
  if (error) throw error;
}

/** ===== Lookups ===== */
export async function listStaffInitials(): Promise<string[]> {
  try {
    const client = await sb();
    const { data, error } = await client
      .from("staff_profiles")
      .select("initials")
      .order("initials", { ascending: true });

    if (error) throw error;
    const set = new Set<string>();
    for (const r of (data ?? []) as Array<{ initials: string | null }>) {
      const v = (r.initials ?? "").trim();
      if (v) set.add(v.toUpperCase());
    }
    return [...set];
  } catch {
    return [];
  }
}

/** Targets (Fridge/Freezer/Cook/etc.). Reads shared defaults (org-less). */
export async function listTargets(): Promise<string[]> {
  try {
    const client = await sb();
    const { data, error } = await client
      .from("presets")
      .select("value, org_id, kind")
      .eq("kind", "temperature_target")
      .is("org_id", null)
      .order("value", { ascending: true });

    if (error) throw error;
    const out = (data ?? [])
      .map((r: { value: string | null }) => (r.value ?? "").trim())
      .filter(Boolean);
    return out.length ? out : ["Fridge", "Freezer", "Cook", "Hot hold"];
  } catch {
    return ["Fridge", "Freezer", "Cook", "Hot hold"];
  }
}

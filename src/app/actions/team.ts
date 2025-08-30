// src/app/actions/team.ts
"use server";
// --- at top of src/app/actions/team.ts ---
import { cookies as nextCookies } from "next/headers";
import { supabaseServer } from "@/lib/supabase";

// Type for cookie options we pass to next/headers cookies().set(...)
type CookieSetOpts = Partial<{
  domain: string;
  path: string;
  sameSite: "lax" | "strict" | "none";
  httpOnly: boolean;
  secure: boolean;
  maxAge: number;
  expires: Date;
}>;

type CookieNameValue = { name: string; value: string };

// Build a server client with a typed cookie adapter (no `any`)
async function sb() {
  const store = await nextCookies();

  const adapter = {
    get: (name: string) => store.get(name)?.value,
    getAll: (): CookieNameValue[] => store.getAll().map(c => ({ name: c.name, value: c.value })),
    set: (name: string, value: string, options: CookieSetOpts) => {
      store.set(name, value, options);
    },
    remove: (name: string, options: CookieSetOpts) => {
      store.set(name, "", { ...options, maxAge: 0 });
    },
  };

  return supabaseServer(adapter);
}

import { cookies as nextCookies } from "next/headers";
import { supabaseServer, type ServerCookieAdapter } from "@/lib/supabase";

/* ----------------------------- Shared row types ----------------------------- */

export type StaffRow = {
  id: string;
  org_id: string | null;
  full_name: string;
  initials: string | null;
  email: string | null;
  phone: string | null;
  created_at: string;
};

export type TrainingTypeRow = {
  id: string;
  org_id: string | null;
  name: string;
};

export type StaffTrainingRow = {
  id: string;
  org_id: string | null;
  staff_id: string;
  training_type_id: string | null;
  issued_on: string | null;
  expires_on: string | null;
  certificate_url: string | null;
  notes: string | null;
};

/* --------------------------------- Helpers --------------------------------- */

/** Build an authenticated Supabase server client (Next 15 cookies API). */
async function sb() {
  const jar = await nextCookies();
  const adapter: ServerCookieAdapter = {
    get: (name: string) => jar.get(name)?.value,
    set: (name: string, value: string, options) => jar.set(name, value, options),
    remove: (name: string, options) => jar.set(name, "", { ...options, maxAge: 0 }),
    getAll: () => jar.getAll().map((c) => ({ name: c.name, value: c.value })),
  };
  return supabaseServer(adapter);
}

/** If user+org is available, return it; otherwise null (guest mode). */
async function tryOrg(): Promise<{ sb: Awaited<ReturnType<typeof sb>>; orgId: string } | null> {
  const client = await sb();
  const { data: { user } } = await client.auth.getUser();
  if (!user) return null;

  const { data, error } = await client.from("profiles").select("org_id").eq("id", user.id).single();
  if (error || !data?.org_id) return null;

  return { sb: client, orgId: data.org_id as string };
}

/* --------------------------- Read-only (guest-safe) -------------------------- */

export async function fetchTeam(): Promise<Array<StaffRow & { trainings: StaffTrainingRow[] }>> {
  const org = await tryOrg();
  if (!org) return []; // guest mode → empty list
  const { sb, orgId } = org;

  const { data: staffData, error: staffErr } = await sb
    .from("staff_profiles")
    .select("id, org_id, full_name, initials, email, phone, created_at")
    .eq("org_id", orgId)
    .order("full_name");
  if (staffErr) throw staffErr;
  const staff = (staffData ?? []) as StaffRow[];

  const { data: trainData, error: trainErr } = await sb
    .from("staff_training")
    .select("id, org_id, staff_id, training_type_id, issued_on, expires_on, certificate_url, notes")
    .eq("org_id", orgId)
    .order("issued_on", { ascending: false });
  if (trainErr) throw trainErr;
  const trainings = (trainData ?? []) as StaffTrainingRow[];

  const byStaff = new Map<string, StaffTrainingRow[]>();
  for (const t of trainings) {
    const arr = byStaff.get(t.staff_id) ?? [];
    arr.push(t);
    byStaff.set(t.staff_id, arr);
  }
  return staff.map((s) => ({ ...s, trainings: byStaff.get(s.id) ?? [] }));
}

export async function listTrainingTypes(): Promise<TrainingTypeRow[]> {
  const org = await tryOrg();
  if (!org) return []; // guest mode
  const { sb, orgId } = org;

  const { data, error } = await sb
    .from("training_types")
    .select("id, org_id, name")
    .eq("org_id", orgId)
    .order("name");
  if (error) throw error;
  return (data ?? []) as TrainingTypeRow[];
}

export async function listExpiringWithin(
  days: number
): Promise<Array<{ staffName: string; trainingName: string; expiresOn: string }>> {
  const org = await tryOrg();
  if (!org) return []; // guest mode
  const { sb, orgId } = org;

  const today = new Date().toISOString().slice(0, 10);
  const cutoff = new Date(Date.now() + days * 86400000).toISOString().slice(0, 10);

  // NOTE: Depending on FK setup, PostgREST can return nested objects OR arrays.
  const { data, error } = await sb
    .from("staff_training")
    .select("expires_on, staff_profiles(full_name), training_types(name)")
    .eq("org_id", orgId)
    .gte("expires_on", today)
    .lte("expires_on", cutoff);

  if (error) throw error;

  type MaybeNested = {
    expires_on: string;
    // Could be object, array, or null depending on relationship metadata
    staff_profiles?: { full_name: string } | { full_name: string }[] | null;
    training_types?: { name: string } | { name: string }[] | null;
  };

  const rows = (data ?? []) as MaybeNested[];

  function pickFirst<T extends { [k: string]: any }>(
    v: T | T[] | null | undefined,
    key: keyof T
  ): string | undefined {
    if (!v) return undefined;
    if (Array.isArray(v)) return v[0]?.[key] as string | undefined;
    return v[key] as string | undefined;
  }

  return rows.map((r) => ({
    staffName: pickFirst(r.staff_profiles, "full_name") ?? "—",
    trainingName: pickFirst(r.training_types, "name") ?? "—",
    expiresOn: r.expires_on,
  }));
}


export async function loggingLeaderboard(days = 90): Promise<Array<{ initials: string; count: number }>> {
  const org = await tryOrg();
  if (!org) return []; // guest mode
  const { sb, orgId } = org;

  const since = new Date(Date.now() - days * 86400000).toISOString().slice(0, 10);

  const { data, error } = await sb
    .from("temp_logs")
    .select("staff_initials, recorded_at")
    .eq("org_id", orgId)
    .gte("recorded_at", since);
  if (error) throw error;

  const counts = new Map<string, number>();
  for (const r of (data ?? []) as Array<{ staff_initials: string | null }>) {
    const key = (r.staff_initials ?? "—").toUpperCase();
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return [...counts.entries()].map(([initials, count]) => ({ initials, count }));
}

/* --------------------------- Mutations (auth required) --------------------------- */

export async function upsertStaff(input: Partial<StaffRow> & { full_name: string }): Promise<{ id: string }> {
  const org = await tryOrg();
  if (!org) throw new Error("Not authenticated");
  const { sb, orgId } = org;

  const row = {
    id: input.id ?? undefined,
    org_id: orgId,
    full_name: input.full_name,
    initials: input.initials ?? null,
    email: input.email ?? null,
    phone: input.phone ?? null,
  };

  const { data, error } = await sb
    .from("staff_profiles")
    .upsert(row, { onConflict: "id", ignoreDuplicates: false })
    .select("id")
    .single();
  if (error) throw error;
  return { id: (data as { id: string }).id };
}

export async function deleteStaff(id: string) {
  const org = await tryOrg();
  if (!org) throw new Error("Not authenticated");
  const { sb, orgId } = org;

  await sb.from("staff_training").delete().eq("org_id", orgId).eq("staff_id", id);
  const { error } = await sb.from("staff_profiles").delete().eq("org_id", orgId).eq("id", id);
  if (error) throw error;
}

export async function upsertTrainingType(name: string) {
  const org = await tryOrg();
  if (!org) throw new Error("Not authenticated");
  const { sb, orgId } = org;

  const { error } = await sb
    .from("training_types")
    .upsert({ org_id: orgId, name }, { onConflict: "org_id,name" });
  if (error) throw error;
  return { ok: true as const };
}

export async function deleteTrainingType(name: string) {
  const org = await tryOrg();
  if (!org) throw new Error("Not authenticated");
  const { sb, orgId } = org;

  const { error } = await sb.from("training_types").delete().eq("org_id", orgId).eq("name", name);
  if (error) throw error;
  return { ok: true as const };
}

export async function addStaffTraining(input: {
  staff_id: string;
  training_type_id?: string | null;
  training_type_name?: string | null; // create on the fly if provided and id missing
  issued_on?: string | null;
  expires_on?: string | null;
  certificate_url?: string | null;
  notes?: string | null;
}) {
  const org = await tryOrg();
  if (!org) throw new Error("Not authenticated");
  const { sb, orgId } = org;

  let training_type_id = input.training_type_id ?? null;

  if (!training_type_id && input.training_type_name) {
    const name = input.training_type_name.trim();
    if (name) {
      const { data, error } = await sb
        .from("training_types")
        .upsert({ org_id: orgId, name }, { onConflict: "org_id,name" })
        .select("id")
        .single();
      if (error) throw error;
      training_type_id = (data as { id: string }).id;
    }
  }

  const { error: insertErr } = await sb.from("staff_training").insert({
    org_id: orgId,
    staff_id: input.staff_id,
    training_type_id,
    issued_on: input.issued_on ?? null,
    expires_on: input.expires_on ?? null,
    certificate_url: input.certificate_url ?? null,
    notes: input.notes ?? null,
  });
  if (insertErr) throw insertErr;

  return { ok: true as const };
}

export async function deleteStaffTraining(id: string) {
  const org = await tryOrg();
  if (!org) throw new Error("Not authenticated");
  const { sb, orgId } = org;

  const { error } = await sb.from("staff_training").delete().eq("org_id", orgId).eq("id", id);
  if (error) throw error;
  return { ok: true as const };
}
// Keep backward compatibility for components still importing this name:
export { addStaffTraining as upsertStaffTraining };

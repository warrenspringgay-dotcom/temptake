// src/app/actions/team.ts
"use server";

import { cookies as nextCookies } from "next/headers";
import { supabaseServer } from "@/lib/supabase";
import type { ExpiryStatus } from "@/lib/training"; // types only (helper lives outside server actions)

/* -----------------------------------------------------------------------------
   Types – mirror your Supabase tables
----------------------------------------------------------------------------- */

export type StaffRow = {
  id: string;
  org_id: string | null;
  full_name: string;
  initials: string | null;
  phone: string | null;
  email: string | null;
  notes: string | null;
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
  training_type_id: string;
  obtained_on: string | null; // YYYY-MM-DD
  expires_on: string | null;  // YYYY-MM-DD
  certificate_url: string | null;
  notes: string | null;
};

/* -----------------------------------------------------------------------------
   Helpers
----------------------------------------------------------------------------- */

/** Build an authenticated Supabase server client (Next 15: cookies() must be awaited). */
async function sb() {
  const store = await nextCookies();
  // Cookie adapter shape for your supabaseServer wrapper
  return supabaseServer({
    get: (name: string) => store.get(name)?.value,
    set: (name: string, value: string, options: any) => store.set(name, value, options),
    remove: (name: string, options: any) => store.set(name, "", { ...options, maxAge: 0 }),
    getAll: () =>
      store.getAll().map((c) => ({ name: c.name, value: c.value })) as unknown as {
        name: string;
        value: string;
      }[],
  });
}

/** Get current user org_id (throws if not signed in). */
async function requireOrg() {
  const client = await sb();
  const {
    data: { user },
  } = await client.auth.getUser();

  if (!user) throw new Error("Not authenticated");

  const { data, error } = await client.from("profiles").select("org_id").eq("id", user.id).single();
  if (error) throw error;

  return { sb: client, orgId: (data as { org_id: string | null }).org_id };
}

/* -----------------------------------------------------------------------------
   Staff CRUD
----------------------------------------------------------------------------- */

export async function fetchTeam(): Promise<Array<StaffRow & { trainings: StaffTrainingRow[] }>> {
  const { sb: client, orgId } = await requireOrg();

  const { data: staff, error: staffErr } = await client
    .from("staff_profiles")
    .select("id, org_id, full_name, initials, phone, email, notes, created_at")
    .eq("org_id", orgId)
    .order("full_name");

  if (staffErr) throw staffErr;

  const staffList = (staff ?? []) as StaffRow[];
  if (staffList.length === 0) return [];

  const ids = staffList.map((s) => s.id);
  const { data: training, error: trErr } = await client
    .from("staff_training")
    .select(
      "id, org_id, staff_id, training_type_id, obtained_on, expires_on, certificate_url, notes"
    )
    .in("staff_id", ids);

  if (trErr) throw trErr;

  const byStaff = new Map<string, StaffTrainingRow[]>();
  for (const row of (training ?? []) as StaffTrainingRow[]) {
    const arr = byStaff.get(row.staff_id) ?? [];
    arr.push(row);
    byStaff.set(row.staff_id, arr);
  }

  return staffList.map((s) => ({ ...s, trainings: byStaff.get(s.id) ?? [] }));
}

export async function upsertStaff(
  input: Partial<StaffRow> & { full_name: string }
): Promise<{ id: string }> {
  const { sb: client, orgId } = await requireOrg();
  const row = {
    id: input.id ?? undefined,
    org_id: orgId,
    full_name: input.full_name,
    initials: input.initials ?? null,
    phone: input.phone ?? null,
    email: input.email ?? null,
    notes: input.notes ?? null,
  };

  const { data, error } = await client
    .from("staff_profiles")
    .upsert(row, { onConflict: "id", ignoreDuplicates: false })
    .select("id")
    .single();

  if (error) throw error;
  return data as { id: string };
}

export async function deleteStaff(id: string) {
  const { sb: client, orgId } = await requireOrg();
  await client.from("staff_training").delete().eq("org_id", orgId).eq("staff_id", id);
  const { error } = await client.from("staff_profiles").delete().eq("org_id", orgId).eq("id", id);
  if (error) throw error;
}

/* -----------------------------------------------------------------------------
   Training Types
----------------------------------------------------------------------------- */

export async function listTrainingTypes(): Promise<TrainingTypeRow[]> {
  const { sb: client, orgId } = await requireOrg();
  const { data, error } = await client
    .from("training_types")
    .select("id, org_id, name")
    .eq("org_id", orgId)
    .order("name");
  if (error) throw error;
  return (data ?? []) as TrainingTypeRow[];
}

export async function upsertTrainingType(name: string) {
  const { sb: client, orgId } = await requireOrg();
  const { error } = await client
    .from("training_types")
    .upsert({ org_id: orgId, name }, { onConflict: "org_id,name" });
  if (error) throw error;
  return { ok: true as const };
}

export async function deleteTrainingType(name: string) {
  const { sb: client, orgId } = await requireOrg();
  const { error } = await client.from("training_types").delete().eq("org_id", orgId).eq("name", name);
  if (error) throw error;
  return { ok: true as const };
}

/* -----------------------------------------------------------------------------
   Staff Training
----------------------------------------------------------------------------- */

export async function upsertStaffTraining(input: {
  id?: string;
  staff_id: string;
  training_type_id?: string;
  training_type_name?: string; // convenience: create-on-the-fly
  obtained_on?: string | null;
  expires_on?: string | null;
  certificate_url?: string | null;
  notes?: string | null;
}) {
  const { sb: client, orgId } = await requireOrg();

  // Ensure training type exists (if name provided)
  let training_type_id = input.training_type_id ?? null;
  if (!training_type_id && input.training_type_name) {
    const { data: up, error: upErr } = await client
      .from("training_types")
      .upsert(
        { org_id: orgId, name: input.training_type_name },
        { onConflict: "org_id,name" }
      )
      .select("id")
      .single();
    if (upErr) throw upErr;
    training_type_id = (up as { id: string }).id;
  }

  const row = {
    id: input.id ?? undefined,
    org_id: orgId,
    staff_id: input.staff_id,
    training_type_id: training_type_id!,
    obtained_on: input.obtained_on ?? null,
    expires_on: input.expires_on ?? null,
    certificate_url: input.certificate_url ?? null,
    notes: input.notes ?? null,
  };

  const { error } = await client
    .from("staff_training")
    .upsert(row, { onConflict: "id", ignoreDuplicates: false });
  if (error) throw error;

  return { ok: true as const };
}

export async function deleteStaffTraining(id: string) {
  const { sb: client, orgId } = await requireOrg();
  const { error } = await client.from("staff_training").delete().eq("org_id", orgId).eq("id", id);
  if (error) throw error;
  return { ok: true as const };
}

/* -----------------------------------------------------------------------------
   Reporting helpers (expiry + leaderboard)
----------------------------------------------------------------------------- */

/** List trainings expiring within N days – array-safe mapping of joins */
export async function listExpiringWithin(
  days: number
): Promise<Array<{ staffName: string; trainingName: string; expiresOn: string }>> {
  const { sb: client, orgId } = await requireOrg();

  const start = new Date();
  const end = new Date(start.getTime() + days * 24 * 60 * 60 * 1000);
  const endISO = end.toISOString().slice(0, 10);

  // Join staff_profiles and training_types
  const { data, error } = await client
    .from("staff_training")
    .select(
      `
      expires_on,
      staff_profiles ( full_name ),
      training_types ( name )
    `
    )
    .eq("org_id", orgId)
    .lte("expires_on", endISO)
    .order("expires_on");

  if (error) throw error;

  // Accept arrays or single objects
  const rows = (data ?? []) as Array<{
    expires_on: string;
    staff_profiles: { full_name: string } | { full_name: string }[] | null;
    training_types: { name: string } | { name: string }[] | null;
  }>;

  return rows.map((r) => {
    const sp = Array.isArray(r.staff_profiles) ? r.staff_profiles[0] : r.staff_profiles;
    const tt = Array.isArray(r.training_types) ? r.training_types[0] : r.training_types;
    return {
      staffName: sp?.full_name ?? "",
      trainingName: tt?.name ?? "",
      expiresOn: r.expires_on,
    };
  });
}

/** Simple leaderboard: count logs per staff initials in last N days */
export type LeaderboardRow = { initials: string; count: number };

export async function loggingLeaderboard(days = 90): Promise<LeaderboardRow[]> {
  const { sb: client, orgId } = await requireOrg();

  const start = new Date();
  start.setDate(start.getDate() - days);
  const startISO = start.toISOString().slice(0, 10);

  const { data, error } = await client
    .from("temp_logs")
    .select("staff_initials, recorded_at")
    .eq("org_id", orgId)
    .gte("recorded_at", startISO);

  if (error) throw error;

  const counts = new Map<string, number>();
  for (const r of (data ?? []) as Array<{ staff_initials: string | null }>) {
    const key = (r.staff_initials ?? "").trim();
    if (!key) continue;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }

  return Array.from(counts.entries())
    .map(([initials, count]) => ({ initials, count }))
    .sort((a, b) => b.count - a.count);
}

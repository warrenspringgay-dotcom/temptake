// src/app/actions/team.ts
import { cookies as nextCookies } from "next/headers";
import { supabaseServer } from "@/lib/supabase";
import type { CookieOptions } from "@supabase/ssr";

/* Types */
export type StaffRow = {
  id: string;
  org_id: string;
  full_name: string;
  initials: string | null;
  job_title: string | null;
  phone: string | null;
  email: string | null;
  active: boolean;
  notes: string | null;
};

export type TrainingTypeRow = {
  id: string;
  org_id: string;
  name: string;
};

export type StaffTrainingRow = {
  id: string;
  org_id: string;
  staff_id: string;
  training_type_id: string;
  awarded_on: string;
  expires_on: string;
  certificate_url: string | null;
  notes: string | null;
  training_name?: string;
};

export type LeaderboardRow = {
  user_id: string;
  name: string;
  count: number;
};

/* Helpers */
async function sbServer() {
  const store = await nextCookies();
  return supabaseServer({
    get: (n: string) => store.get(n)?.value ?? null,
    getAll: () => store.getAll().map((c) => ({ name: c.name, value: c.value })),
    set: (n: string, v: string, o: CookieOptions) => { void n; void v; void o; },
    remove: (n: string, o: CookieOptions) => { void n; void o; },
  });
}
async function requireOrg() {
  const sb = await sbServer();
  const { data: auth } = await sb.auth.getUser();
  if (!auth?.user) throw new Error("Not signed in");
  const { data: profile } = await sb.from("profiles").select("org_id, email").eq("id", auth.user.id).maybeSingle();
  if (!profile?.org_id) throw new Error("Profile/org missing");
  return { sb, orgId: profile.org_id as string, userId: auth.user.id as string, email: (profile?.email as string | null) ?? null };
}
function first<T>(v: T | T[] | null): T | null {
  return Array.isArray(v) ? (v[0] ?? null) : v;
}

/* Staff CRUD */
export async function fetchTeam(): Promise<Array<StaffRow & { trainings: Array<StaffTrainingRow> }>> {
  "use server";
  const { sb, orgId } = await requireOrg();

  const { data: staffData, error: staffErr } = await sb
    .from("staff_profiles")
    .select("id, org_id, full_name, initials, job_title, phone, email, active, notes")
    .eq("org_id", orgId)
    .order("full_name", { ascending: true });
  if (staffErr) throw staffErr;

  const staff = (staffData ?? []) as StaffRow[];
  if (!staff.length) return [];

  const staffIds = staff.map((s) => s.id);

  const { data: trnData, error: trnErr } = await sb
    .from("staff_training")
    .select(`
      id, org_id, staff_id, training_type_id, awarded_on, expires_on, certificate_url, notes,
      training_types ( id, name )
    `)
    .eq("org_id", orgId)
    .in("staff_id", staffIds)
    .order("expires_on", { ascending: true });
  if (trnErr) throw trnErr;

  type Raw = StaffTrainingRow & {
    training_types: { id: string; name: string }[] | { id: string; name: string } | null;
  };

  const trainingsByStaff = new Map<string, StaffTrainingRow[]>();
  for (const r of (trnData ?? []) as Raw[]) {
    const tt = first(r.training_types);
    const normalized: StaffTrainingRow = {
      id: r.id,
      org_id: r.org_id,
      staff_id: r.staff_id,
      training_type_id: r.training_type_id,
      awarded_on: r.awarded_on,
      expires_on: r.expires_on,
      certificate_url: r.certificate_url ?? null,
      notes: r.notes ?? null,
      training_name: tt?.name ?? undefined,
    };
    const arr = trainingsByStaff.get(r.staff_id) ?? [];
    arr.push(normalized);
    trainingsByStaff.set(r.staff_id, arr);
  }

  return staff.map((s) => ({
    ...s,
    trainings: (trainingsByStaff.get(s.id) ?? []).sort((a, b) => a.expires_on.localeCompare(b.expires_on)),
  }));
}

export async function upsertStaff(input: Partial<StaffRow> & { full_name: string }): Promise<{ id: string }> {
  "use server";
  const { sb, orgId } = await requireOrg();
  const row = {
    id: input.id ?? undefined,
    org_id: orgId,
    full_name: input.full_name,
    initials: input.initials ?? null,
    job_title: input.job_title ?? null,
    phone: input.phone ?? null,
    email: input.email ?? null,
    active: input.active ?? true,
    notes: input.notes ?? null,
  };
  const { data, error } = await sb.from("staff_profiles").upsert(row).select("id").maybeSingle();
  if (error) throw error;
  return { id: (data?.id as string) ?? "" };
}

export async function deleteStaff(id: string) {
  "use server";
  const { sb, orgId } = await requireOrg();
  await sb.from("staff_training").delete().eq("org_id", orgId).eq("staff_id", id);
  const { error } = await sb.from("staff_profiles").delete().eq("org_id", orgId).eq("id", id);
  if (error) throw error;
  return { ok: true as const };
}

/* Training types */
export async function listTrainingTypes(): Promise<TrainingTypeRow[]> {
  "use server";
  const { sb, orgId } = await requireOrg();
  const { data, error } = await sb.from("training_types").select("id, org_id, name").eq("org_id", orgId).order("name");
  if (error) throw error;
  return (data ?? []) as TrainingTypeRow[];
}
export async function upsertTrainingType(name: string) {
  "use server";
  const { sb, orgId } = await requireOrg();
  const { error } = await sb.from("training_types").upsert({ org_id: orgId, name }, { onConflict: "org_id,name" });
  if (error) throw error;
  return { ok: true as const };
}
export async function deleteTrainingType(name: string) {
  "use server";
  const { sb, orgId } = await requireOrg();
  const { error } = await sb.from("training_types").delete().eq("org_id", orgId).eq("name", name);
  if (error) throw error;
  return { ok: true as const };
}

/* Staff training */
export async function upsertStaffTraining(input: {
  id?: string;
  staff_id: string;
  training_type_id?: string;
  training_type_name?: string;
  awarded_on: string;
  expires_on: string;
  certificate_url?: string | null;
  notes?: string | null;
}) {
  "use server";
  const { sb, orgId } = await requireOrg();

  let training_type_id = input.training_type_id ?? null;
  if (!training_type_id && input.training_type_name) {
    const { data: found } = await sb
      .from("training_types")
      .select("id")
      .eq("org_id", orgId)
      .eq("name", input.training_type_name)
      .maybeSingle();
    if (found?.id) {
      training_type_id = found.id;
    } else {
      const { data: created, error: err } = await sb
        .from("training_types")
        .insert({ org_id: orgId, name: input.training_type_name })
        .select("id")
        .maybeSingle();
      if (err) throw err;
      training_type_id = created?.id ?? null;
    }
  }
  if (!training_type_id) throw new Error("training_type_id or training_type_name is required");

  const row = {
    id: input.id ?? undefined,
    org_id: orgId,
    staff_id: input.staff_id,
    training_type_id,
    awarded_on: input.awarded_on,
    expires_on: input.expires_on,
    certificate_url: input.certificate_url ?? null,
    notes: input.notes ?? null,
  };
  const { error } = await sb.from("staff_training").upsert(row);
  if (error) throw error;
  return { ok: true as const };
}
export async function deleteStaffTraining(id: string) {
  "use server";
  const { sb, orgId } = await requireOrg();
  const { error } = await sb.from("staff_training").delete().eq("org_id", orgId).eq("id", id);
  if (error) throw error;
  return { ok: true as const };
}

/* Reporting */
export async function listExpiringWithin(days: number): Promise<Array<{ staffName: string; trainingName: string; expiresOn: string }>> {
  "use server";
  const { sb, orgId } = await requireOrg();

  const start = new Date();
  const end = new Date();
  end.setUTCDate(end.getUTCDate() + Math.max(1, days));
  const startISO = start.toISOString().slice(0, 10);
  const endISO = end.toISOString().slice(0, 10);

  const { data, error } = await sb
    .from("staff_training")
    .select(`
      expires_on,
      staff_profiles!inner ( full_name, org_id ),
      training_types!inner ( name, org_id )
    `)
    .eq("staff_profiles.org_id", orgId)
    .eq("training_types.org_id", orgId)
    .gte("expires_on", startISO)
    .lte("expires_on", endISO)
    .order("expires_on", { ascending: true });

  if (error) throw error;

  type RowRaw = {
    expires_on: string;
    staff_profiles: { full_name: string }[] | { full_name: string } | null;
    training_types: { name: string }[] | { name: string } | null;
  };

  const rows = (data ?? []) as RowRaw[];
  return rows.map((r) => {
    const staffP = first<{ full_name: string }>(r.staff_profiles);
    const ttype = first<{ name: string }>(r.training_types);
    return {
      staffName: staffP?.full_name ?? "Staff",
      trainingName: ttype?.name ?? "Training",
      expiresOn: r.expires_on,
    };
  });
}

export async function loggingLeaderboard(days = 90): Promise<LeaderboardRow[]> {
  "use server";
  const { sb, orgId } = await requireOrg();

  const start = new Date();
  start.setUTCDate(start.getUTCDate() - Math.max(1, days));
  const startISO = start.toISOString().slice(0, 10);

  const { data: logs, error } = await sb
    .from("temp_logs")
    .select("created_by, time_iso")
    .eq("org_id", orgId)
    .gte("time_iso", `${startISO}T00:00:00Z`);
  if (error) throw error;

  const counts = new Map<string, number>();
  for (const row of (logs ?? []) as Array<{ created_by: string | null }>) {
    const uid = row.created_by ?? "";
    if (!uid) continue;
    counts.set(uid, (counts.get(uid) ?? 0) + 1);
  }

  const ids = Array.from(counts.keys());
  if (!ids.length) return [];

  const { data: staff } = await sb
    .from("staff_profiles")
    .select("user_id, full_name")
    .eq("org_id", orgId)
    .in("user_id", ids);

  const staffName = new Map<string, string>();
  for (const s of (staff ?? []) as Array<{ user_id: string | null; full_name: string | null }>) {
    if (s.user_id && s.full_name) staffName.set(s.user_id, s.full_name);
  }

  const missing = ids.filter((id) => !staffName.has(id));
  const { data: profs } = await sb.from("profiles").select("id, email").in("id", missing);

  const profEmail = new Map<string, string>();
  for (const p of (profs ?? []) as Array<{ id: string; email: string | null }>) {
    if (p.email) profEmail.set(p.id, p.email);
  }

  const rows: LeaderboardRow[] = ids.map((uid) => ({
    user_id: uid,
    name: staffName.get(uid) || profEmail.get(uid) || "User",
    count: counts.get(uid) ?? 0,
  }));

  rows.sort((a, b) => b.count - a.count);
  return rows;
}

"use server";

import { getServerSupabase } from "@/lib/supabaseServer";
import { requireUser } from "@/lib/requireUser";
import { getOrgId } from "@/lib/org";

/* =========================
   Types
========================= */
export type TeamMember = {
  id?: string;
  org_id?: string | null;
  name: string;
  role?: string | null;
  email?: string | null;
  phone?: string | null;
  notes?: string | null;
  active: boolean;
  initials?: string | null;
};

export type TrainingRow = {
  id: string;
  type: string | null;
  awarded_on: string | null; // yyyy-mm-dd
  expires_on: string | null; // yyyy-mm-dd
  certificate_url?: string | null;
  notes?: string | null;
};

/* =========================
   Team members
========================= */

export async function listTeam(): Promise<TeamMember[]> {
  await requireUser();
  const orgId = await getOrgId();

  const sb = await getServerSupabase();
  const { data, error } = await sb
    .from("team_members")
    .select("*")
    .eq("org_id", orgId)
    .order("created_at", { ascending: true });

  if (error) throw new Error(error.message);
  return (data ?? []) as TeamMember[];
}

/** Create or update. Always pins org_id to caller’s org. */
export async function upsertTeamMember(payload: Partial<TeamMember>) {
  await requireUser();
  const orgId = await getOrgId();

  const row: Partial<TeamMember> = {
    id: payload.id,
    org_id: orgId,
    name: (payload.name ?? "").trim(),
    role: payload.role ?? null,
    email: payload.email ?? null,
    phone: payload.phone ?? null,
    notes: payload.notes ?? null,
    active: payload.active ?? true,
    initials: (payload.initials ?? "").trim() || null,
  };

  if (!row.name) throw new Error("Name is required");

  const sb = await getServerSupabase();
  const { error } = await sb.from("team_members").upsert(row).select("id").single();
  if (error) throw new Error(error.message);
}

export async function deleteTeamMember(id: string) {
  await requireUser();
  const orgId = await getOrgId();

  const sb = await getServerSupabase();
  const { error } = await sb.from("team_members").delete().eq("id", id).eq("org_id", orgId);
  if (error) throw new Error(error.message);
}

/* =========================
   Staff + Trainings
========================= */

export async function ensureStaffByInitials(initials: string, fallbackName?: string): Promise<string> {
  await requireUser();
  const orgId = await getOrgId();

  const ini = initials.trim().toUpperCase();
  if (!ini) throw new Error("Missing initials");

  const sb = await getServerSupabase();

  const { data: existing, error: selErr } = await sb
    .from("staff")
    .select("id")
    .eq("org_id", orgId)
    .eq("initials", ini)
    .maybeSingle();

  if (selErr) throw new Error(selErr.message);
  if (existing?.id) return existing.id as string;

  const { data: created, error: insErr } = await sb
    .from("staff")
    .insert({ org_id: orgId, initials: ini, name: fallbackName ?? ini })
    .select("id")
    .single();

  if (insErr) throw new Error(insErr.message);
  return created.id as string;
}

export async function listTrainingsForStaff(staffId: string): Promise<TrainingRow[]> {
  await requireUser();
  const orgId = await getOrgId();

  const sb = await getServerSupabase();

  // Ensure staff belongs to org
  const { data: staff, error: staffErr } = await sb
    .from("staff")
    .select("id")
    .eq("id", staffId)
    .eq("org_id", orgId)
    .maybeSingle();

  if (staffErr) throw new Error(staffErr.message);
  if (!staff?.id) throw new Error("Forbidden");

  const { data, error } = await sb
    .from("trainings")
    .select("id,type,awarded_on,expires_on,certificate_url,notes")
    .eq("staff_id", staffId)
    .order("awarded_on", { ascending: false });

  if (error) throw new Error(error.message);
  return (data ?? []) as TrainingRow[];
}

export async function insertTraining(
  staffId: string,
  input: { type: string; awarded_on: string; expires_on: string }
) {
  await requireUser();
  const orgId = await getOrgId();

  const sb = await getServerSupabase();

  // Ensure staff belongs to org
  const { data: staff, error: staffErr } = await sb
    .from("staff")
    .select("id")
    .eq("id", staffId)
    .eq("org_id", orgId)
    .maybeSingle();

  if (staffErr) throw new Error(staffErr.message);
  if (!staff?.id) throw new Error("Forbidden");

  const { error } = await sb.from("trainings").insert({
    staff_id: staffId,
    type: input.type,
    awarded_on: input.awarded_on,
    expires_on: input.expires_on,
  });

  if (error) throw new Error(error.message);
}

/* =========================
   ✅ Staff initials list (for temp logger, etc.)
========================= */

/**
 * Returns a simple list of staff initials for the current org.
 * This exists because tempLogs.ts re-exports it.
 */
export async function listStaffInitials(): Promise<string[]> {
  await requireUser();
  const orgId = await getOrgId();

  const sb = await getServerSupabase();
  const { data, error } = await sb
    .from("staff")
    .select("initials")
    .eq("org_id", orgId)
    .order("initials", { ascending: true });

  if (error) throw new Error(error.message);

  const initials = (data ?? [])
    .map((r: any) => (r.initials ?? "").toString().trim().toUpperCase())
    .filter(Boolean);

  // de-dupe
  return Array.from(new Set(initials));
}

/* =========================
   Staff QC Reviews
========================= */

export type StaffQcReviewRow = {
  id: string;
  reviewed_on: string; // yyyy-mm-dd
  score: number; // 1..5
  notes: string | null;
  manager_initials: string | null;
  manager_name: string | null;
};

export async function listStaffQcReviewsForStaff(staffId: string): Promise<StaffQcReviewRow[]> {
  await requireUser();
  const orgId = await getOrgId();

  const sb = await getServerSupabase();

  // Ensure staff belongs to org
  const { data: staff, error: staffErr } = await sb
    .from("staff")
    .select("id")
    .eq("id", staffId)
    .eq("org_id", orgId)
    .maybeSingle();

  if (staffErr) throw new Error(staffErr.message);
  if (!staff?.id) throw new Error("Forbidden");

  const { data, error } = await sb
    .from("staff_qc_reviews")
    .select("id,reviewed_on,score,notes,manager:staff!staff_qc_reviews_manager_fkey(initials,name)")
    .eq("org_id", orgId)
    .eq("staff_id", staffId)
    .order("reviewed_on", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(100);

  if (error) throw new Error(error.message);

  return (data ?? []).map((r: any) => ({
    id: String(r.id),
    reviewed_on: String(r.reviewed_on),
    score: Number(r.score),
    notes: r.notes ?? null,
    manager_initials: r.manager?.initials ?? null,
    manager_name: r.manager?.name ?? null,
  })) as StaffQcReviewRow[];
}

export async function insertStaffQcReview(
  staffId: string,
  input: {
    manager_initials: string;
    reviewed_on: string; // yyyy-mm-dd
    score: number; // 1..5
    notes?: string | null;
    location_id?: string | null;
  }
) {
  await requireUser();
  const orgId = await getOrgId();

  const sb = await getServerSupabase();

  // Ensure staff belongs to org
  const { data: staff, error: staffErr } = await sb
    .from("staff")
    .select("id")
    .eq("id", staffId)
    .eq("org_id", orgId)
    .maybeSingle();

  if (staffErr) throw new Error(staffErr.message);
  if (!staff?.id) throw new Error("Forbidden");

  const managerId = await ensureStaffByInitials(
    input.manager_initials,
    input.manager_initials.trim().toUpperCase()
  );

  const score = Number(input.score);
  if (!Number.isFinite(score) || score < 1 || score > 5) {
    throw new Error("Score must be between 1 and 5");
  }

  const { error } = await sb.from("staff_qc_reviews").insert({
    org_id: orgId,
    staff_id: staffId,
    manager_id: managerId,
    location_id: input.location_id ?? null,
    reviewed_on: input.reviewed_on,
    score,
    notes: (input.notes ?? null) as any,
  });

  if (error) throw new Error(error.message);
}

export async function deleteStaffQcReview(reviewId: string) {
  await requireUser();
  const orgId = await getOrgId();

  const sb = await getServerSupabase();
  const { error } = await sb
    .from("staff_qc_reviews")
    .delete()
    .eq("id", reviewId)
    .eq("org_id", orgId);

  if (error) throw new Error(error.message);
}

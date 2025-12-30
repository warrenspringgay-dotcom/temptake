'use server';

import { getServerSupabase } from '@/lib/supabaseServer';
import { requireUser } from '@/lib/requireUser';

/** If you store org in user metadata, adjust this helper. */
function getOrgIdFromUser(user: { user_metadata?: any; app_metadata?: any; id: string }) {
  // Prefer a claim like user_metadata.org_id; fall back to user.id if your app is single-tenant.
  return user.user_metadata?.org_id ?? user.app_metadata?.org_id ?? user.id;
}

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
  const user = await requireUser();
  const orgId = getOrgIdFromUser(user);

  const sb = await getServerSupabase();
  const { data, error } = await sb
    .from('team_members')
    .select('*')
    .eq('org_id', orgId)
    .order('created_at', { ascending: true });

  if (error) throw new Error(error.message);
  return (data ?? []) as TeamMember[];
}

/** Create or update. Always pins org_id to caller’s org. */
export async function upsertTeamMember(payload: Partial<TeamMember>) {
  const user = await requireUser();
  const orgId = getOrgIdFromUser(user);

  // Clean + force org
  const row: Partial<TeamMember> = {
    id: payload.id,
    org_id: orgId,
    name: (payload.name ?? '').trim(),
    role: payload.role ?? null,
    email: payload.email ?? null,
    phone: payload.phone ?? null,
    notes: payload.notes ?? null,
    active: payload.active ?? true,
    initials: (payload.initials ?? '').trim() || null,
  };

  if (!row.name) throw new Error('Name is required');

  const sb = await getServerSupabase();
  const { error } = await sb.from('team_members').upsert(row).select('id').single();
  if (error) throw new Error(error.message);
}

export async function deleteTeamMember(id: string) {
  const user = await requireUser();
  const orgId = getOrgIdFromUser(user);

  const sb = await getServerSupabase();
  const { error } = await sb
    .from('team_members')
    .delete()
    .eq('id', id)
    .eq('org_id', orgId); // guard by org
  if (error) throw new Error(error.message);
}

/* =========================
   Staff + Trainings
========================= */

export async function ensureStaffByInitials(
  initials: string,
  fallbackName?: string
): Promise<string> {
  const user = await requireUser();
  const orgId = getOrgIdFromUser(user);
  const ini = initials.trim().toUpperCase();
  if (!ini) throw new Error('Missing initials');

  const sb = await getServerSupabase();

  // scope by org
  const { data: existing, error: selErr } = await sb
    .from('staff')
    .select('id')
    .eq('org_id', orgId)
    .eq('initials', ini)
    .maybeSingle();

  if (selErr) throw new Error(selErr.message);
  if (existing?.id) return existing.id;

  const { data: created, error: insErr } = await sb
    .from('staff')
    .insert({ org_id: orgId, initials: ini, name: fallbackName ?? ini })
    .select('id')
    .single();

  if (insErr) throw new Error(insErr.message);
  return created.id as string;
}

export async function listTrainingsForStaff(staffId: string): Promise<TrainingRow[]> {
  const user = await requireUser();
  const orgId = getOrgIdFromUser(user);

  const sb = await getServerSupabase();
  // Ensure staff belongs to org (cheap guard — optional but safer)
  const { data: staff, error: staffErr } = await sb
    .from('staff')
    .select('id')
    .eq('id', staffId)
    .eq('org_id', orgId)
    .maybeSingle();
  if (staffErr) throw new Error(staffErr.message);
  if (!staff?.id) throw new Error('Forbidden');

  const { data, error } = await sb
    .from('trainings')
    .select('id,type,awarded_on,expires_on,certificate_url,notes')
    .eq('staff_id', staffId)
    .order('awarded_on', { ascending: false });

  if (error) throw new Error(error.message);
  return (data ?? []) as TrainingRow[];
}

export async function insertTraining(
  staffId: string,
  input: { type: string; awarded_on: string; expires_on: string }
) {
  const user = await requireUser();
  const orgId = getOrgIdFromUser(user);

  const sb = await getServerSupabase();

  // Ensure staff belongs to org
  const { data: staff, error: staffErr } = await sb
    .from('staff')
    .select('id')
    .eq('id', staffId)
    .eq('org_id', orgId)
    .maybeSingle();
  if (staffErr) throw new Error(staffErr.message);
  if (!staff?.id) throw new Error('Forbidden');

  const { error } = await sb.from('trainings').insert({
    staff_id: staffId,
    type: input.type,
    awarded_on: input.awarded_on,
    expires_on: input.expires_on,
  });

  if (error) throw new Error(error.message);
}

/* =========================
   Convenience exports
========================= */

/**
 * Used by other action modules that need an org-scoped list of staff initials.
 * Returns uppercased, deduped initials sorted A→Z.
 */
export async function listStaffInitials(): Promise<string[]> {
  const user = await requireUser();
  const orgId = getOrgIdFromUser(user);

  const sb = await getServerSupabase();

  const { data, error } = await sb
    .from('staff')
    .select('initials')
    .eq('org_id', orgId)
    .order('initials', { ascending: true });

  if (error) throw new Error(error.message);

  const vals = (data ?? [])
    .map((r: any) => (r.initials ?? '').toString().trim().toUpperCase())
    .filter((v: string) => v.length > 0);

  return Array.from(new Set(vals));
}

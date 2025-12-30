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
  awarded_on: string | null;  // yyyy-mm-dd
  expires_on: string | null;  // yyyy-mm-dd
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
   Setup banner support
========================= */

/**
 * Returns which ACTIVE team members are missing training expiry setup.
 * A member is "set" if:
 * - has matching staff row by initials, AND
 * - has at least one training row with a non-null expires_on
 *
 * This does NOT create staff rows (no side effects).
 */
export async function getTrainingSetupStatus(): Promise<{
  totalActive: number;
  missingCount: number;
  missingInitials: string[];
}> {
  const user = await requireUser();
  const orgId = getOrgIdFromUser(user);
  const sb = await getServerSupabase();

  // 1) Active team members (must have initials to map reliably)
  const { data: members, error: memErr } = await sb
    .from('team_members')
    .select('initials,active')
    .eq('org_id', orgId)
    .eq('active', true);

  if (memErr) throw new Error(memErr.message);

  const initials = (members ?? [])
    .map((m: any) => String(m.initials ?? '').trim().toUpperCase())
    .filter((x) => x.length > 0);

  const uniqueInitials = Array.from(new Set(initials));
  const totalActive = uniqueInitials.length;

  if (totalActive === 0) {
    return { totalActive: 0, missingCount: 0, missingInitials: [] };
  }

  // 2) Staff rows for those initials
  const { data: staffRows, error: staffErr } = await sb
    .from('staff')
    .select('id,initials')
    .eq('org_id', orgId)
    .in('initials', uniqueInitials);

  if (staffErr) throw new Error(staffErr.message);

  const staffByInitials = new Map<string, string>();
  (staffRows ?? []).forEach((s: any) => {
    const ini = String(s.initials ?? '').trim().toUpperCase();
    const id = String(s.id ?? '').trim();
    if (ini && id) staffByInitials.set(ini, id);
  });

  // Any team initials with no staff record are missing setup
  const initialsWithoutStaff = uniqueInitials.filter((ini) => !staffByInitials.has(ini));

  // 3) Trainings that have expires_on (the thing your banner is complaining about)
  const staffIds = Array.from(staffByInitials.values());
  let trainedStaff = new Set<string>();

  if (staffIds.length > 0) {
    const { data: trainings, error: trErr } = await sb
      .from('trainings')
      .select('staff_id,expires_on')
      .in('staff_id', staffIds)
      .not('expires_on', 'is', null);

    if (trErr) throw new Error(trErr.message);

    trainedStaff = new Set(
      (trainings ?? [])
        .map((t: any) => String(t.staff_id ?? '').trim())
        .filter(Boolean)
    );
  }

  // Translate “trained staff ids” back to initials
  const initialsWithExpiry = new Set<string>();
  for (const [ini, staffId] of staffByInitials.entries()) {
    if (trainedStaff.has(staffId)) initialsWithExpiry.add(ini);
  }

  const initialsMissingExpiry = uniqueInitials.filter((ini) => !initialsWithExpiry.has(ini));

  // Combine both missing cases (no staff row OR no training expiry)
  const missingSet = new Set<string>([...initialsWithoutStaff, ...initialsMissingExpiry]);

  const missingInitials = Array.from(missingSet);
  return {
    totalActive,
    missingCount: missingInitials.length,
    missingInitials,
  };
}

// src/app/actions/team.ts
"use server";

import { getServerSupabase } from "@/lib/supabaseServer";
import { getActiveOrgIdServer } from "@/lib/orgServer";

export type TeamMemberInput = {
  id?: string;
  name: string;
  initials: string;
  role: string;
  phone?: string | null;
  email?: string | null;
  active?: boolean;
  notes?: string | null;
  training_expires_on?: string | null;
  allergen_review_due_on?: string | null;
};

export async function saveTeamMember(input: TeamMemberInput) {
  const supabase = await getServerSupabase();
  const orgId = await getActiveOrgIdServer();

  if (!orgId) {
    throw new Error("No organisation found for current user.");
  }

  const payload = {
    id: input.id,
    org_id: orgId,
    name: input.name,
    initials: input.initials?.toUpperCase(),
    role: input.role,
    phone: input.phone ?? null,
    email: input.email ?? null,
    active: input.active ?? true,
    notes: input.notes ?? null,
    training_expires_on: input.training_expires_on ?? null,
    allergen_review_due_on: input.allergen_review_due_on ?? null,
  };

  const { error } = await supabase
    .from("team_members")
    .upsert(payload, { onConflict: "id" });

  if (error) throw new Error(error.message);
}

export async function listTeamMembers() {
  const supabase = await getServerSupabase();
  const orgId = await getActiveOrgIdServer();

  if (!orgId) return [];

  const { data, error } = await supabase
    .from("team_members")
    .select("*")
    .eq("org_id", orgId)
    .order("name", { ascending: true });

  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function deleteTeamMember(id: string) {
  const supabase = await getServerSupabase();
  const orgId = await getActiveOrgIdServer();

  if (!orgId) throw new Error("No organisation found for current user.");

  const { error } = await supabase
    .from("team_members")
    .delete()
    .eq("id", id)
    .eq("org_id", orgId);

  if (error) throw new Error(error.message);
}

/** Return a deduped, UPPERCASE list of initials for the active org. */
export async function listStaffInitials(): Promise<string[]> {
  const supabase = await getServerSupabase();
  let orgId: string | null = null;

  try {
    orgId = await getActiveOrgIdServer();
  } catch {
    // fall back to no org filter if we fail to get one
  }

  let query = supabase
    .from("team_members")
    .select("initials,name,email")
    .order("name", { ascending: true });

  if (orgId) query = query.eq("org_id", orgId);

  const { data, error } = await query;
  if (error) throw new Error(error.message);

  const vals = (data ?? []).map((r: any) => {
    const fromInitials =
      r.initials && String(r.initials).trim().toUpperCase();
    const fromName =
      !fromInitials && r.name
        ? String(r.name).trim().slice(0, 1).toUpperCase()
        : null;
    const fromEmail =
      !fromInitials && !fromName && r.email
        ? String(r.email).trim().slice(0, 1).toUpperCase()
        : null;

    return fromInitials || fromName || fromEmail || null;
  });

  // de-dupe + drop nulls
  return Array.from(new Set(vals.filter(Boolean) as string[]));
}

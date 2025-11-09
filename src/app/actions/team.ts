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

/**
 * Helper: ensure the current user is an OWNER in the active org.
 * Throws if not.
 */
async function requireOwnerOrg() {
  const supabase = await getServerSupabase();

  const orgId = await getActiveOrgIdServer();
  if (!orgId) {
    throw new Error("No active organisation found.");
  }

  const {
    data: { user },
    error: userErr,
  } = await supabase.auth.getUser();

  if (userErr || !user || !user.email) {
    throw new Error("You must be signed in to manage the team.");
  }

  const { data: member, error: memberErr } = await supabase
    .from("team_members")
    .select("id, role")
    .eq("org_id", orgId)
    .eq("email", user.email)
    .maybeSingle();

  if (memberErr || !member) {
    throw new Error("You are not a member of this organisation.");
  }

  if ((member.role ?? "").toLowerCase() !== "owner") {
    throw new Error("Only organisation owners can manage the team.");
  }

  return { orgId, userId: user.id, memberId: member.id };
}

/* ------------------- Mutations (owner only) ------------------- */

export async function saveTeamMember(input: TeamMemberInput) {
  const supabase = await getServerSupabase();
  const { orgId } = await requireOwnerOrg();

  if (!input.name?.trim()) {
    throw new Error("Name is required");
  }

  const payload = {
    initials: input.initials?.trim().toUpperCase() || null,
    name: input.name.trim(),
    role: input.role?.trim() || null,
    phone: input.phone ?? null,
    email: input.email ?? null,
    active: input.active ?? true,
    notes: input.notes ?? null,
    training_expires_on: input.training_expires_on ?? null,
    allergen_review_due_on: input.allergen_review_due_on ?? null,
  };

  if (input.id) {
    // Update existing row, scoped by org
    const { error } = await supabase
      .from("team_members")
      .update(payload)
      .eq("id", input.id)
      .eq("org_id", orgId);

    if (error) throw new Error(error.message);
  } else {
    // Insert new row
    const { error } = await supabase.from("team_members").insert({
      ...payload,
      org_id: orgId,
    });

    if (error) throw new Error(error.message);
  }
}

export async function deleteTeamMember(id: string) {
  const supabase = await getServerSupabase();
  const { orgId } = await requireOwnerOrg();

  const { error } = await supabase
    .from("team_members")
    .delete()
    .eq("id", id)
    .eq("org_id", orgId);

  if (error) throw new Error(error.message);
}

/* --------------------- Queries (read) --------------------- */

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

/**
 * Staff initials helper for FoodTempLogger etc.
 * Returns a deduped, UPPERCASE list of initials for the active org.
 */
export async function listStaffInitials(): Promise<string[]> {
  const supabase = await getServerSupabase();

  let orgId: string | null = null;
  try {
    orgId = await getActiveOrgIdServer();
  } catch {
    // ignore – will just fall back to no org filter
  }

  let query = supabase
    .from("team_members")
    .select("initials,name,email")
    .order("name", { ascending: true });

  if (orgId) {
    query = query.eq("org_id", orgId);
  }

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

  return Array.from(new Set(vals.filter(Boolean) as string[]));
}

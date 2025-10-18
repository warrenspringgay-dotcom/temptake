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
  // add this:
  notes?: string | null;
  // if you also track these dates, keep them, otherwise remove:
  training_expires_on?: string | null;
  allergen_review_due_on?: string | null;
};

export async function saveTeamMember(input: TeamMemberInput) {
  const supabase = await getServerSupabase();

  const payload = {
    id: input.id,
    name: input.name,
    initials: input.initials?.toUpperCase(),
    role: input.role,
    phone: input.phone ?? null,
    email: input.email ?? null,
    active: input.active ?? true,
    // include notes in the payload
    notes: input.notes ?? null,
    // include dates only if your table has these columns
    training_expires_on: input.training_expires_on ?? null,
    allergen_review_due_on: input.allergen_review_due_on ?? null,
  };

  const { error } = await supabase.from("team_members").upsert(payload, { onConflict: "id" });
  if (error) throw new Error(error.message);
}

export async function listTeamMembers() {
  const supabase = await getServerSupabase();
  const { data, error } = await supabase
    .from("team_members")
    .select("*")
    .order("name", { ascending: true });
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function deleteTeamMember(id: string) {
  const supabase = await getServerSupabase();
  const { error } = await supabase.from("team_members").delete().eq("id", id);
  if (error) throw new Error(error.message);
}
// --- staff initials helper for FoodTempLogger ---


/** Return a deduped, UPPERCASE list of initials for the active org. */
export async function listStaffInitials(): Promise<string[]> {
  const supabase = await getServerSupabase();

  // Scope by org if available
  let orgId: string | null = null;
  try {
    orgId = await getActiveOrgIdServer();
  } catch {
    // ignore – fall back to no org filter
  }

  const query = supabase
    .from("team_members")
    .select("initials,name,email")
    .order("name", { ascending: true });

  const { data, error } = await (orgId ? query.eq("org_id", orgId) : query);
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

  // de-dupe + clean
  return Array.from(new Set(vals.filter(Boolean) as string[]));
}

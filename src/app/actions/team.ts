// src/app/actions/team.ts
"use server";

import { getServerSupabase } from "@/lib/supabaseServer";
import { getActiveOrgIdServer } from "@/lib/orgServer";

export type TeamMemberInput = {
  id?: string;
  initials?: string;
  name?: string;
  role?: string | null;
  phone?: string | null;
  email?: string | null;
  notes?: string | null;
  active?: boolean;
};



export async function saveTeamMemberServer(input: TeamMemberInput) {
  const supabase = await getServerSupabase();
  const org_id = await getActiveOrgIdServer();
  if (!org_id) throw new Error("No org_id for current user.");

  const payload = {
    id: input.id,
    org_id,
    initials: (input.initials ?? "").toUpperCase(),
    name: input.name ?? null,
    role: input.role ?? null,
    phone: input.phone ?? null,
    email: input.email ?? null,
    notes: input.notes ?? null,
    active: input.active ?? true,
  };

  const { data, error } = await supabase
    .from("team_members")
    .upsert(payload, { onConflict: "id" })
    .select("id")
    .single();

  if (error) throw new Error(`[team_members.upsert] ${error.message}`);
  return { id: data.id as string };
}

export async function deleteTeamMemberServer(id: string) {
  const supabase = await getServerSupabase();
  const org_id = await getActiveOrgIdServer();
  if (!org_id) throw new Error("No org_id for current user.");

  const { error } = await supabase
    .from("team_members")
    .delete()
    .eq("id", id)
    .eq("org_id", org_id);

  if (error) throw new Error(`[team_members.delete] ${error.message}`);
}

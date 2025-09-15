// src/app/actions/team.ts
"use server";

import { revalidatePath } from "next/cache";
import { supabaseServer } from "@/lib/supabase-server";
import { requireOrgId } from "@/app/actions/auth";

export type TeamMemberRow = {
  id: string;
  org_id: string;
  name: string;
  role: string | null;
  email: string | null;
  phone: string | null;
  notes: string | null;
  initials: string | null;
  active: boolean;
  status: string | null;
  created_at?: string;
};

export type TeamMemberInput = {
  id?: string;
  name: string;
  role?: string | null;
  email?: string | null;
  phone?: string | null;
  notes?: string | null;
  initials?: string | null;
  active?: boolean;
  status?: string | null;
};

export async function listTeamMembersAction(): Promise<TeamMemberRow[]> {
  const orgId = await requireOrgId();
  const supabase = await supabaseServer();

  const { data, error } = await supabase
    .from("team_members")
    .select("*")
    .eq("org_id", orgId)
    .order("created_at", { ascending: false });

  if (error || !data) return [];
  return data as TeamMemberRow[];
}

export async function upsertTeamMemberAction(input: TeamMemberInput): Promise<{ ok: true; id: string } | { ok: false; message: string }> {
  const orgId = await requireOrgId();
  const supabase = await supabaseServer();

  const payload = {
    id: input.id ?? undefined,
    org_id: orgId,
    name: input.name.trim(),
    role: (input.role ?? null) || null,
    email: (input.email ?? null) || null,
    phone: (input.phone ?? null) || null,
    notes: (input.notes ?? null) || null,
    initials: (input.initials ?? null) || null,
    active: input.active ?? true,
    status: (input.status ?? null) || null,
  };

  const { data, error } = await supabase
    .from("team_members")
    .upsert(payload)
    .select("id")
    .single();

  if (error) return { ok: false, message: error.message };
  revalidatePath("/team");
  return { ok: true, id: data!.id as string };
}

export async function deleteTeamMemberAction(id: string) {
  const orgId = await requireOrgId();
  const supabase = await supabaseServer();

  const { error } = await supabase
    .from("team_members")
    .delete()
    .eq("org_id", orgId)
    .eq("id", id);

  if (error) return { ok: false as const, message: error.message };
  revalidatePath("/team");
  return { ok: true as const };
}

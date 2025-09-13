// src/app/actions/team.ts
"use server";

import { createClient } from "@/utils/supabase/server";

/** Detect missing column or PostgREST cache issues. */
function isMissingColumn(e: unknown) {
  const code = (e as any)?.code;
  return code === "42703" || code === "PGRST204";
}

/** Resolve org_id from session → profiles → DEFAULT_ORG_ID. */
async function getOrgId(): Promise<string> {
  const supabase = await createClient();

  const { data, error } = await supabase.auth.getUser();
  if (error) throw error;

  const user = data?.user ?? null;
  if (!user) {
    const fallback = process.env.DEFAULT_ORG_ID;
    if (fallback) return fallback;
    throw new Error("Not signed in and DEFAULT_ORG_ID not set");
  }

  const metaOrg = (user.user_metadata as any)?.org_id as string | undefined;
  if (metaOrg) return metaOrg;

  const { data: profile, error: pErr } = await supabase
    .from("profiles")
    .select("org_id")
    .eq("id", user.id)
    .maybeSingle();

  if (pErr) throw pErr;
  if (profile?.org_id) return profile.org_id;

  const fallback = process.env.DEFAULT_ORG_ID;
  if (fallback) return fallback;

  throw new Error("Missing org_id on user/profile and DEFAULT_ORG_ID not set");
}

/** Prefer team_members; fall back to team. */
async function detectTeamTable(supabase: any): Promise<"team_members" | "team"> {
  try {
    const { error } = await supabase.from("team_members").select("id").limit(1);
    if (!error) return "team_members";
  } catch {}
  return "team";
}

function deriveInitials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return ((parts[0][0] ?? "") + (parts.at(-1)?.[0] ?? "")).toUpperCase();
}

/** ===================== Public API ===================== */

export type TeamUpsert = {
  id?: string;
  name: string;          // display name
  role?: string | null;
  email?: string | null;
  phone?: string | null;
  notes?: string | null;
  active?: boolean | null;
};

export async function listTeamMembers() {
  const supabase = await createClient();
  const orgId = await getOrgId();
  const table = await detectTeamTable(supabase);

  // Attempt: explicit columns
  try {
    const { data, error } = await supabase
      .from(table)
      .select("id, org_id, name, role, email, phone, notes, active")
      .eq("org_id", orgId)
      .order("name", { ascending: true });

    if (error) throw error;

    return (data ?? []).map((r: any) => {
      const nm =
        r.name ??
        r.display_name ??
        r.full_name ??
        r.title ??
        r.username ??
        "";
      const active = typeof r.active === "boolean" ? r.active : true;
      return {
        id: r.id,
        name: nm,
        role: r.role ?? null,
        email: r.email ?? null,
        phone: r.phone ?? null,
        notes: r.notes ?? null,
        active,
        initials: deriveInitials(nm),
        status: active ? "OK" : "Inactive",
      };
    });
  } catch (e) {
    if (!isMissingColumn(e)) throw e;
  }

  // Fallback: wildcard select
  const { data, error } = await supabase
    .from(table)
    .select("*")
    .eq("org_id", orgId)
    .order("created_at", { ascending: true });

  if (error) throw error;

  return (data ?? []).map((r: any) => {
    const nm =
      r.name ?? r.display_name ?? r.full_name ?? r.title ?? r.username ?? "";
    const active = typeof r.active === "boolean" ? r.active : true;
    return {
      id: r.id,
      name: nm,
      role: r.role ?? null,
      email: r.email ?? null,
      phone: r.phone ?? null,
      notes: r.notes ?? null,
      active,
      initials: deriveInitials(nm),
      status: active ? "OK" : "Inactive",
    };
  });
}

export async function upsertTeamMember(input: TeamUpsert) {
  const supabase = await createClient();
  const orgId = await getOrgId();
  const table = await detectTeamTable(supabase);

  const payload: any = {
    id: input.id,
    org_id: orgId,
    name: input.name?.trim() ?? null,
    role: input.role?.trim?.() || null,
    email: input.email?.trim?.() || null,
    phone: input.phone?.trim?.() || null,
    notes: input.notes?.trim?.() || null,
    active: typeof input.active === "boolean" ? input.active : true,
  };

  // Try column-safe select
  try {
    const { data, error } = await supabase
      .from(table)
      .upsert(payload, { onConflict: "id" })
      .select("id, org_id, name, role, email, phone, notes, active")
      .single();

    if (error) throw error;

    const nm = (data as any).name ?? "";
    const active = typeof (data as any).active === "boolean" ? (data as any).active : true;

    return {
      id: (data as any).id,
      name: nm,
      role: (data as any).role ?? null,
      email: (data as any).email ?? null,
      phone: (data as any).phone ?? null,
      notes: (data as any).notes ?? null,
      active,
      initials: deriveInitials(nm),
      status: active ? "OK" : "Inactive",
    };
  } catch (e) {
    if (!isMissingColumn(e)) throw e;
  }

  // Fallback wildcard
  const { data, error } = await supabase
    .from(table)
    .upsert(payload, { onConflict: "id" })
    .select("*")
    .single();

  if (error) throw error;

  const nm =
    (data as any).name ??
    (data as any).display_name ??
    (data as any).full_name ??
    (data as any).title ??
    (data as any).username ??
    "";
  const active =
    typeof (data as any).active === "boolean" ? (data as any).active : true;

  return {
    id: (data as any).id,
    name: nm,
    role: (data as any).role ?? null,
    email: (data as any).email ?? null,
    phone: (data as any).phone ?? null,
    notes: (data as any).notes ?? null,
    active,
    initials: deriveInitials(nm),
    status: active ? "OK" : "Inactive",
  };
}

export async function deleteTeamMember(id: string) {
  const supabase = await createClient();
  const orgId = await getOrgId();
  const table = await detectTeamTable(supabase);

  const { error } = await supabase
    .from(table)
    .delete()
    .eq("id", id)
    .eq("org_id", orgId);

  if (error) throw error;
}

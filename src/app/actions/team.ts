"use server";

import { createClient } from "@supabase/supabase-js";
import { getServerSupabase } from "@/lib/supabaseServer";
import { getActiveOrgIdServer } from "@/lib/orgServer";
import { getActiveLocationIdServer } from "@/lib/locationServer";

/* ============================================================
   Admin client (service role) for invites
============================================================ */

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);

/* ============================================================
   Shared types
============================================================ */

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
  location_id?: string | null; // ✅ allow explicit location control if you want
};

export type TeamMember = {
  id?: string;
  org_id?: string;
  location_id?: string | null;
  initials?: string | null;
  name?: string | null;
  role?: string | null;
  phone?: string | null;
  email?: string | null;
  active?: boolean | null;
  notes?: string | null;
  training_expires_on?: string | null;
  allergen_review_due_on?: string | null;
  user_id?: string | null;
  login_enabled?: boolean | null;
};

export type TrainingRow = {
  id: string;
  staff_id: string;
  type: string | null;
  awarded_on: string | null;
  expires_on: string | null;
};

type TrainingInput = {
  type: string;
  awarded_on: string;
  expires_on: string;
};

/* ============================================================
   Role utilities
============================================================ */

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function rolePriority(role: any) {
  const r = String(role ?? "").toLowerCase();
  if (r === "owner") return 0;
  if (r === "manager") return 1;
  if (r === "admin") return 2;
  return 3; // staff/other
}

function isOwnerOrAdmin(role: any) {
  const r = String(role ?? "").toLowerCase();
  return r === "owner" || r === "admin";
}

/* ============================================================
   Helper: require the current user to be OWNER/ADMIN in active org
   (multi-location safe)
============================================================ */

async function requireOwnerOrg() {
  const supabase = await getServerSupabase();

  const orgId = await getActiveOrgIdServer();
  if (!orgId) throw new Error("No active organisation found.");

  const activeLocationId = await getActiveLocationIdServer().catch(() => null);

  const {
    data: { user },
    error: userErr,
  } = await supabase.auth.getUser();

  if (userErr || !user || !user.email) {
    throw new Error("You must be signed in to manage the team.");
  }

  const email = normalizeEmail(user.email);

  // ✅ Fetch all matching rows in the org for this user/email (multi-location)
  const { data: rows, error: memberErr } = await supabase
    .from("team_members")
    .select("id, role, location_id, email, user_id")
    .eq("org_id", orgId)
    .ilike("email", email)
    .limit(50);

  if (memberErr) throw new Error(memberErr.message);
  if (!rows || rows.length === 0) throw new Error("You are not a member of this organisation.");

  // ✅ Prefer active location row, otherwise highest role across org
  const preferred =
    (activeLocationId
      ? rows.filter((r: any) => String(r.location_id ?? "") === String(activeLocationId))
      : rows) as any[];

  const pick = [...preferred, ...rows]
    .filter(Boolean)
    .sort((a, b) => rolePriority(a.role) - rolePriority(b.role))[0];

  if (!pick) throw new Error("You are not a member of this organisation.");

  if (!isOwnerOrAdmin(pick.role)) {
    throw new Error("Only organisation owners/admins can manage the team.");
  }

  return {
    orgId,
    userId: user.id,
    memberId: String(pick.id),
    activeLocationId: activeLocationId ? String(activeLocationId) : null,
    email,
  };
}

/* ============================================================
   Core mutations (original API)
============================================================ */

export async function saveTeamMember(input: TeamMemberInput) {
  const supabase = await getServerSupabase();
  const { orgId, activeLocationId } = await requireOwnerOrg();

  if (!input.name?.trim()) throw new Error("Name is required");

  // ✅ location: explicit input wins, else active location, else null
  const location_id = (input.location_id ?? activeLocationId ?? null) as string | null;

  const payload = {
    location_id,
    initials: input.initials?.trim().toUpperCase() || null,
    name: input.name.trim(),
    role: input.role?.trim().toLowerCase() || null,
    phone: input.phone ?? null,
    email: input.email ? normalizeEmail(input.email) : null,
    active: input.active ?? true,
    notes: input.notes ?? null,
    training_expires_on: input.training_expires_on ?? null,
    allergen_review_due_on: input.allergen_review_due_on ?? null,
  };

  if (input.id) {
    const { error } = await supabase
      .from("team_members")
      .update(payload)
      .eq("id", input.id)
      .eq("org_id", orgId);

    if (error) throw new Error(error.message);
  } else {
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

/* ============================================================
   Core queries (original API)
============================================================ */

export async function listTeamMembers(): Promise<TeamMember[]> {
  const supabase = await getServerSupabase();
  const orgId = await getActiveOrgIdServer();
  const locationId = await getActiveLocationIdServer().catch(() => null);

  if (!orgId) return [];

  let q = supabase
    .from("team_members")
    .select("*")
    .eq("org_id", orgId)
    .order("name", { ascending: true });

  // ✅ If you want the default “active location only” behaviour server-side:
  if (locationId) q = q.eq("location_id", locationId);

  const { data, error } = await q;
  if (error) throw new Error(error.message);

  return (data ?? []) as TeamMember[];
}

export async function listStaffInitials(): Promise<string[]> {
  const supabase = await getServerSupabase();

  let orgId: string | null = null;
  try {
    orgId = await getActiveOrgIdServer();
  } catch {}

  let query = supabase
    .from("team_members")
    .select("initials,name,email")
    .order("name", { ascending: true });

  if (orgId) query = query.eq("org_id", orgId);

  const { data, error } = await query;
  if (error) throw new Error(error.message);

  const vals = (data ?? []).map((r: any) => {
    const fromInitials = r.initials && String(r.initials).trim().toUpperCase();
    const fromName =
      !fromInitials && r.name ? String(r.name).trim().slice(0, 1).toUpperCase() : null;
    const fromEmail =
      !fromInitials && !fromName && r.email ? String(r.email).trim().slice(0, 1).toUpperCase() : null;

    return fromInitials || fromName || fromEmail || null;
  });

  return Array.from(new Set(vals.filter(Boolean) as string[]));
}

/* ============================================================
   New API used by TeamManager.tsx
============================================================ */

export async function listTeam(): Promise<TeamMember[]> {
  return listTeamMembers();
}

export async function upsertTeamMember(input: Partial<TeamMember>): Promise<void> {
  if (!input.name?.trim()) throw new Error("Name is required");

  const payload: TeamMemberInput = {
    id: input.id,
    name: input.name.trim(),
    initials: (input.initials ?? "").toString(),
    role: (input.role ?? "").toString(),
    phone: input.phone ?? null,
    email: input.email ?? null,
    active: input.active ?? true,
    notes: input.notes ?? null,
    training_expires_on: input.training_expires_on ?? null,
    allergen_review_due_on: input.allergen_review_due_on ?? null,
    location_id: input.location_id ?? null,
  };

  await saveTeamMember(payload);
}

/* ============================================================
   Invite flow using Supabase Admin API
   ✅ now location-aware + multi-location compatible
============================================================ */

export type InviteTeamMemberResult = {
  ok: boolean;
  message?: string;
};

export async function inviteTeamMemberServer(args: {
  email: string;
  role?: string;
  name?: string;
  initials?: string;
}): Promise<InviteTeamMemberResult> {
  const { orgId, activeLocationId } = await requireOwnerOrg();
  const db = await getServerSupabase();

  const email = normalizeEmail(args.email);
  if (!email) return { ok: false, message: "Email is required." };

  const name = (args.name ?? "").trim() || email;
  const role = (args.role ?? "staff").trim().toLowerCase() || "staff";

  const initialsRaw =
    args.initials ||
    name
      .split(/[@\s.]+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((p) => p[0])
      .join("");
  const initials = initialsRaw.toUpperCase().slice(0, 4);

  const location_id = activeLocationId ?? null;

  const origin =
    process.env.NEXT_PUBLIC_SITE_URL ||
    (process.env.NEXT_PUBLIC_VERCEL_URL?.startsWith("http")
      ? process.env.NEXT_PUBLIC_VERCEL_URL
      : process.env.NEXT_PUBLIC_VERCEL_URL
      ? `https://${process.env.NEXT_PUBLIC_VERCEL_URL}`
      : "https://temptake.com");

  const redirectTo = `${origin}/invite/accept`;

  // 1) Create user + send invite email
  const { data, error } = await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
    redirectTo,
    data: { name },
  });

  if (error) return { ok: false, message: error.message };

  const user = data?.user ?? null;

  // 2) Upsert into team_members (multi-location safe)
  // ✅ Requires DB unique index/constraint on (org_id, location_id, email)
  const { error: tmErr } = await db.from("team_members").upsert(
    {
      org_id: orgId,
      location_id,
      user_id: user?.id ?? null,
      email,
      name,
      initials,
      role,
      active: true,
      login_enabled: true,
    },
    {
      onConflict: "org_id,location_id,email",
    }
  );

  if (tmErr) return { ok: false, message: tmErr.message };

  return { ok: true };
}

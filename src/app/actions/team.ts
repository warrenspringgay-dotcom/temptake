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
   Helper: require the current user to be OWNER/ADMIN in active org
   ✅ Multi-location safe: does NOT assume one row per email.
============================================================ */

async function requireOwnerOrg() {
  const supabase = await getServerSupabase();

  const orgId = await getActiveOrgIdServer();
  if (!orgId) throw new Error("No active organisation found.");

  const {
    data: { user },
    error: userErr,
  } = await supabase.auth.getUser();

  if (userErr || !user) throw new Error("You must be signed in to manage the team.");

  const userId = user.id ?? null;
  const email = (user.email ?? "").trim().toLowerCase();

  if (!userId && !email) throw new Error("You must be signed in to manage the team.");

  // Pull ALL matching rows within org (multi-location safe)
  // Prefer user_id match; fallback to email match.
  let q = supabase
    .from("team_members")
    .select("id, role, user_id, email, org_id, location_id")
    .eq("org_id", orgId)
    .limit(100);

  if (userId) {
    q = q.eq("user_id", userId);
  } else {
    q = q.ilike("email", email);
  }

  const { data: rows, error } = await q;

  if (error || !Array.isArray(rows) || rows.length === 0) {
    throw new Error("You are not a member of this organisation.");
  }

  const roleAllows = (role: any) => {
    const r = String(role ?? "").toLowerCase();
    return r === "owner" || r === "admin";
  };

  if (!rows.some((r: any) => roleAllows(r?.role))) {
    throw new Error("Only organisation owners can manage the team.");
  }

  // Pick any stable memberId (doesn't matter, it's just a marker)
  return { orgId, userId: userId ?? null, memberId: String((rows[0] as any).id) };
}

/* ============================================================
   Core mutations (original API)
   ✅ Now location-aware: uses active location for create/update
============================================================ */

export async function saveTeamMember(input: TeamMemberInput) {
  const supabase = await getServerSupabase();
  const { orgId } = await requireOwnerOrg();

  const locationId = await getActiveLocationIdServer();
  if (!locationId) throw new Error("No active location selected.");

  if (!input.name?.trim()) throw new Error("Name is required");

  const payload = {
    location_id: locationId,
    initials: input.initials?.trim().toUpperCase() || null,
    name: input.name.trim(),
    role: input.role?.trim().toLowerCase() || null,
    phone: input.phone ?? null,
    email: input.email ? input.email.trim().toLowerCase() : null,
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
   ✅ Now location-aware: returns active location only (if set)
============================================================ */

export async function listTeamMembers(): Promise<TeamMember[]> {
  const supabase = await getServerSupabase();
  const orgId = await getActiveOrgIdServer();
  if (!orgId) return [];

  const locationId = await getActiveLocationIdServer().catch(() => null);

  let q = supabase
    .from("team_members")
    .select("*")
    .eq("org_id", orgId)
    .order("name", { ascending: true });

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
  } catch {
    // ignore
  }

  const locationId = await getActiveLocationIdServer().catch(() => null);

  let query = supabase
    .from("team_members")
    .select("initials,name,email,org_id,location_id")
    .order("name", { ascending: true });

  if (orgId) query = query.eq("org_id", orgId);
  if (locationId) query = query.eq("location_id", locationId);

  const { data, error } = await query;
  if (error) throw new Error(error.message);

  const vals = (data ?? []).map((r: any) => {
    const fromInitials = r.initials && String(r.initials).trim().toUpperCase();
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
  };

  await saveTeamMember(payload);
}

export async function ensureStaffByInitials(initials: string, name: string): Promise<string> {
  const supabase = await getServerSupabase();
  const orgId = await getActiveOrgIdServer();
  if (!orgId) throw new Error("No active organisation found.");

  const cleanInitials = initials.trim().toUpperCase();
  const displayName = name?.trim() || cleanInitials;

  const { data: existing, error: findError } = await supabase
    .from("staff")
    .select("id")
    .eq("org_id", orgId)
    .eq("initials", cleanInitials)
    .maybeSingle();

  if (findError) throw new Error(findError.message);

  if (existing?.id) return String(existing.id);

  const { data: created, error: insertError } = await supabase
    .from("staff")
    .insert({
      org_id: orgId,
      initials: cleanInitials,
      name: displayName,
    })
    .select("id")
    .single();

  if (insertError) throw new Error(insertError.message);
  return String(created.id);
}

export async function listTrainingsForStaff(staffId: string): Promise<TrainingRow[]> {
  const supabase = await getServerSupabase();

  const { data, error } = await supabase
    .from("trainings")
    .select("id,staff_id,type,awarded_on,expires_on")
    .eq("staff_id", staffId)
    .order("awarded_on", { ascending: false });

  if (error) throw new Error(error.message);
  return (data ?? []) as TrainingRow[];
}

export async function insertTraining(staffId: string, input: TrainingInput): Promise<void> {
  const supabase = await getServerSupabase();

  const { error } = await supabase.from("trainings").insert({
    staff_id: staffId,
    type: input.type,
    awarded_on: input.awarded_on,
    expires_on: input.expires_on,
  });

  if (error) throw new Error(error.message);
}

/* ============================================================
   Invite flow using Supabase Admin API
   ✅ Now location-aware:
   - attaches invited user to ACTIVE location
   - upserts by (org_id, location_id, email)
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
  const { orgId } = await requireOwnerOrg();
  const db = await getServerSupabase();

  const locationId = await getActiveLocationIdServer();
  if (!locationId) return { ok: false, message: "No active location selected." };

  const email = (args.email ?? "").trim().toLowerCase();
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

  // 2) Upsert into team_members for THIS location
  // IMPORTANT: your DB must support this with a unique index:
  // (org_id, location_id, lower(email))
  const { error: tmErr } = await db.from("team_members").upsert(
    {
      org_id: orgId,
      location_id: locationId,
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

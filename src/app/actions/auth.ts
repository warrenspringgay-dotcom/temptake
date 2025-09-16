// src/app/actions/auth.ts
"use server";

import { redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabase-server";

/** Minimal shape we return to the UI */
export type SessionShape = {
  user: { id: string; email: string | null } | null;
  role: "owner" | "manager" | "staff" | null;
};

/** Sign in with email/password (called from <form action={signInAction}>) */
export async function signInAction(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  const supabase = await supabaseServer();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    return { ok: false as const, message: error.message };
  }
  return { ok: true as const };
}

/** Sign out (must match the Next form action signature -> returns void) */
export async function signOutAction(_formData?: FormData): Promise<void> {
  const supabase = await supabaseServer();
  await supabase.auth.signOut();
  // Don’t redirect automatically; NavTabs just needs the action to complete.
}

/** Get current user + role in one go (safe for RSC) */
export async function getSession(): Promise<SessionShape> {
  const supabase = await supabaseServer();
  const { data: { user } } = await supabase.auth.getUser();

  // Default role null until we find one
  let role: SessionShape["role"] = null;

  if (user) {
    // Try to read role from a 'profiles' table if present
    // profiles: id (uuid, PK) | role (text) | org_id (uuid) ...
    const { data: prof } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();

    const r = (prof?.role ?? "").toLowerCase();
    if (r === "owner" || r === "manager" || r === "staff") role = r as SessionShape["role"];
  }

  return {
    user: user ? { id: user.id, email: user.email ?? null } : null,
    role,
  };
}

/** Convenience: just the role */
export async function getRole(): Promise<SessionShape["role"]> {
  const { role } = await getSession();
  return role;
}

/** Simple role check */
export async function hasRole(allowed: Array<NonNullable<SessionShape["role"]>>): Promise<boolean> {
  const role = await getRole();
  return !!role && allowed.includes(role);
}

/** Get the user's org_id (null if none). If you *require* an org, use requireOrgId instead. */
export async function getOrgId(): Promise<string | null> {
  const supabase = await supabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from("profiles")
    .select("org_id")
    .eq("id", user.id)
    .maybeSingle();

  return (data?.org_id as string | null) ?? null;
}

/** Require a logged-in user, else redirect to /login */
export async function requireUser() {
  const supabase = await supabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  return user;
}

/** Require an org_id, redirect to /login if no session; throw if no org_id */
export async function requireOrgId(): Promise<string> {
  const user = await requireUser();
  const supabase = await supabaseServer();

  const { data, error } = await supabase
    .from("profiles")
    .select("org_id")
    .eq("id", user.id)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to load org: ${error.message}`);
  }
  const orgId = data?.org_id as string | null;
  if (!orgId) {
    throw new Error("No organisation associated with this user.");
  }
  return orgId;
}

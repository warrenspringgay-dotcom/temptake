// src/app/actions/auth.ts
"use server";

import { redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabase-server";

export type AuthResult =
  | { ok: true }
  | { ok: false; message: string };

type SessionUser = { id: string; email: string | null };

/** Basic session snapshot for server components */
export async function getSession(): Promise<{ user: SessionUser | null; role: "owner" | "manager" | "staff" | null; orgId: string | null; }> {
  const supabase = await supabaseServer();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { user: null, role: null, orgId: null };

  // Get profile/org/role. Adjust table/columns to yours.
  const { data: profile } = await supabase
    .from("profiles")
    .select("org_id, role")
    .eq("id", user.id)
    .maybeSingle();

  const role = (profile?.role as "owner" | "manager" | "staff" | null) ?? null;
  const orgId = (profile?.org_id as string | null) ?? null;

  return { user: { id: user.id, email: user.email ?? null }, role, orgId };
}

/** Role helper: owner > manager > staff */
export async function hasRole(allowed: Array<"owner" | "manager" | "staff">): Promise<boolean> {
  const { role } = await getSession();
  if (!role) return false;
  if (allowed.includes("owner") && role === "owner") return true;
  if (allowed.includes("manager") && (role === "manager" || role === "owner")) return true;
  if (allowed.includes("staff")) return true; // everyone has staff or above if logged in
  return false;
}

/** Get org id or null (never throws) */
export async function getOrgIdSafe(): Promise<string | null> {
  const { orgId } = await getSession();
  return orgId ?? null;
}

/** Require a session */
export async function requireSession() {
  const { user } = await getSession();
  if (!user) redirect(`/login?redirect=${encodeURIComponent("/")}`);
  return user!;
}

/** Require org id (used by org-scoped data) */
export async function requireOrgId(): Promise<string> {
  const orgId = await getOrgIdSafe();
  if (!orgId) {
    // If your RLS grants access without org, you can loosen this.
    throw new Error("No organization for current user.");
  }
  return orgId;
}

/** Sign in with email/password */
export async function signInAction(formData: FormData): Promise<AuthResult> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  if (!email || !password) return { ok: false, message: "Email and password required." };

  const supabase = await supabaseServer();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return { ok: false, message: error.message };
  return { ok: true };
}

/** Sign out */
export async function signOutAction() {
  const supabase = await supabaseServer();
  await supabase.auth.signOut();
  redirect("/login");
}

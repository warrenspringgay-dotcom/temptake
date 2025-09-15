"use server";

import { redirect } from "next/navigation";
import { getServerSupabase } from "@/lib/supabase-server";

export type Role = "owner" | "manager" | "staff";
type SessionResult = {
  user: { id: string; email: string | null } | null;
  role: Role | null;
};

/** Read the current session (safe for Server Components) */
export async function getSession(): Promise<SessionResult> {
  const supabase = await getServerSupabase();
  const { data } = await supabase.auth.getUser();
  const user = data.user ?? null;

  const role = await getRole(); // reads from metadata if present
  return {
    user: user ? { id: user.id, email: user.email ?? null } : null,
    role,
  };
}

/** Derive an app role from user metadata (customize as you like) */
export async function getRole(): Promise<Role | null> {
  const supabase = await getServerSupabase();
  const { data } = await supabase.auth.getUser();
  const user = data.user;
  if (!user) return null;

  // Common patterns:
  // 1) user.user_metadata.role
  // 2) app_metadata.claims.role
  const metaRole =
    (user.user_metadata?.role as Role | undefined) ??
    (user.app_metadata?.role as Role | undefined);

  // Clamp to one of our known roles
  return metaRole === "owner" || metaRole === "manager" || metaRole === "staff"
    ? metaRole
    : "staff"; // default to "staff" if you want
}

/** Require a session or bounce to /login (optionally with ?redirect=) */
export async function requireSession(redirectTo?: string) {
  const supabase = await getServerSupabase();
  const { data } = await supabase.auth.getUser();
  if (!data.user) {
    redirect(`/login${redirectTo ? `?redirect=${encodeURIComponent(redirectTo)}` : ""}`);
  }
}

/** Simple role guard: allow if user has ANY of the roles */
export async function hasRole(allowed: Role[] = ["staff"]) {
  const role = await getRole();
  return role ? allowed.includes(role) : false;
}

/** Email/password sign-in via a <form> (Server Action) */
export async function signInAction(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  const supabase = await getServerSupabase();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    // You can return an object if your client expects it, or redirect with a flash param.
    return { ok: false as const, message: error.message };
  }
  return { ok: true as const };
}

/** Optional: sign-up (email/password) */
export async function signUpAction(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  const supabase = await getServerSupabase();
  const { error } = await supabase.auth.signUp({ email, password });
  if (error) {
    return { ok: false as const, message: error.message };
  }
  return { ok: true as const };
}

/** Sign out for <form action={...}> – must resolve to void to satisfy types */
export async function signOutAction(): Promise<void> {
  const supabase = await getServerSupabase();
  await supabase.auth.signOut();
  // Either redirect (throws) or just return void and let the page refresh with a client router action.
  // redirect("/login");
}

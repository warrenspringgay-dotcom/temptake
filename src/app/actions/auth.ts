// src/app/actions/auth.ts
"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";   // ✅ from next/cache
import { createServerClient } from "@/lib/supabaseServer";


export type SessionUser = { id: string; email: string | null };

/** Get current session user (server) */
export async function getSession(): Promise<{ user: SessionUser | null }> {
  const supabase = await createServerClient();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) return { user: null };
  return { user: { id: data.user.id, email: data.user.email ?? null } };
}

/** Require user or redirect to /login */
export async function requireUser(): Promise<SessionUser> {
  const { user } = await getSession();
  if (!user) redirect("/login");
  return user;
}

/** Sign in with email/password from the login form */
export async function signInAction(
  _prev: { ok: boolean; message?: string; redirect?: string } | null,
  formData: FormData
) {
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");
  const redirectTo = String(formData.get("redirectTo") ?? "/");

  const supabase = await createServerClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return { ok: false, message: error.message };

  // session cookie is set by @supabase/ssr via our cookie adapter
  revalidatePath("/");
  return { ok: true, redirect: redirectTo };
}

/** Sign out */
export async function signOutAction() {
  const supabase = await createServerClient();
  await supabase.auth.signOut();
  revalidatePath("/");
  redirect("/login");
}

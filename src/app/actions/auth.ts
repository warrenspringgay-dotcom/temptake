// src/app/actions/auth.ts
"use server";

import { getServerSupabase } from "@/lib/supabaseServer";

/** Read the current session (used by layouts, etc.) */
export async function getSession() {
  const supabase = await getServerSupabase();
  const { data: { session } } = await supabase.auth.getSession();
  return session;
}

type AuthResult = { ok: boolean; message?: string; redirect?: string };

/** Server Action for the login form (useActionState) */
export async function signInAction(
  _prevState: AuthResult,
  formData: FormData
): Promise<AuthResult> {
  const email = String(formData.get("email") || "");
  const password = String(formData.get("password") || "");
  const redirectTo = String(formData.get("redirectTo") || "/");

  if (!email || !password) {
    return { ok: false, message: "Email and password are required." };
  }

  const supabase = await getServerSupabase();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    return { ok: false, message: error.message };
  }
  return { ok: true, redirect: redirectTo };
}

/** Server Action for the Sign Out button */
export async function signOutAndRedirect(redirectTo = "/login") {
  const supabase = await getServerSupabase();
  await supabase.auth.signOut();
  return { ok: true as const, redirect: redirectTo };
}

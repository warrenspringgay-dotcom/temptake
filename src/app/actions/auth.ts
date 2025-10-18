// src/app/actions/auth.ts
"use server";

import { redirect } from "next/navigation";
import { getServerSupabase } from "@/lib/supabaseServer";

/** Return the current Supabase auth session (or null). */
export async function getSession() {
  const supabase = await getServerSupabase();
  const { data: { session } } = await supabase.auth.getSession();
  return session; // Session | null
}

/** Server action used by the sign-out form. Accepts FormData. */
export async function signOutAndRedirect(formData: FormData) {
  const supabase = await getServerSupabase();
  await supabase.auth.signOut();
  const to = (formData.get("redirectTo") as string) || "/login";
  redirect(to);
}

/** Shape expected by useActionState in LoginClient */
type AuthResult = { ok: boolean; message?: string; redirect?: string };

/** Server action for email+password sign-in used by LoginClient. */
export async function signInAction(
  _prevState: AuthResult,
  formData: FormData
): Promise<AuthResult> {
  const supabase = await getServerSupabase();

  const email = String(formData.get("email") || "").trim();
  const password = String(formData.get("password") || "");
  const redirectTo = (formData.get("redirectTo") as string) || "/";

  if (!email || !password) {
    return { ok: false, message: "Email and password are required." };
  }

  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    return { ok: false, message: error.message || "Sign-in failed." };
  }

  return { ok: true, redirect: redirectTo };
}

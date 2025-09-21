// src/app/actions/auth.ts
"use server";

import { supabaseServer } from "@/lib/supabase-server";


// …existing imports…
import { redirect } from "next/navigation";


// ✅ make this a valid form action: (formData) => Promise<void>
export async function signOutAction(_formData: FormData) {
  const supabase = await supabaseServer();
  await supabase.auth.signOut();
  redirect("/login"); // never returns
}



/** Minimal shape we pass around */
export type SessionUser = { id: string; email: string | null };

/** Server-side helper to read the current user */
export async function getSession(): Promise<{ user: SessionUser | null }> {
  const supabase = await supabaseServer();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data?.user) return { user: null };
  return { user: { id: data.user.id, email: data.user.email ?? null } };
}
export async function hasRole(user: SessionUser | null, role?: string): Promise<boolean> {
  if (!user) return false;
  // TODO: plug in your real role logic later
  return role ? false : true;
/** (Optional) simple role check. Adjust to your app’s role model if needed. */
}

/** Sign-in action for <LoginClient /> (expects email/password fields in FormData) */
export async function signInAction(
  _prevState: { ok: boolean; message?: string; redirect?: string } | null,
  formData: FormData
) {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  if (!email || !password) {
    return { ok: false, message: "Email and password are required." };
  }

  const supabase = await supabaseServer();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) return { ok: false, message: error.message };
  return { ok: true, redirect: "/" };
}

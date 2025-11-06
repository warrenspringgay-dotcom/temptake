"use server";

import { redirect } from "next/navigation";
import { getServerSupabase, getServerSupabaseAction } from "@/lib/supabaseServer";



export async function signOut() {
  const supabase = await getServerSupabaseAction();
  await supabase.auth.signOut();
  redirect("/login");
}


// ——— Queries ———
export async function getUserOrNull() {
  const supabase = await getServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  return user ?? null;
}

export async function getSessionOrNull() {
  const supabase = await getServerSupabase();
  const { data: { session } } = await supabase.auth.getSession();
  return session ?? null;
}

/** Use when a server component absolutely needs a user. Redirects if none. */
export async function requireUser(next?: string) {
  const user = await getUserOrNull();
  if (!user) redirect(`/login${next ? `?next=${encodeURIComponent(next)}` : ""}`);
  return user;
}

// ——— Mutations ———
export type AuthResult = { ok: boolean; message?: string; redirect?: string };


export async function signInAction(_: AuthResult, formData: FormData): Promise<AuthResult> {
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");
  const next = String(formData.get("next") ?? "") || "/dashboard";

  if (!email || !password) return { ok: false, message: "Email and password required." };

  const supabase = await getServerSupabaseAction();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return { ok: false, message: error.message };

  return { ok: true, redirect: next };
}

export async function signOutAction(): Promise<void> {
  const supabase = await getServerSupabaseAction();
  await supabase.auth.signOut();
  redirect("/login");
}

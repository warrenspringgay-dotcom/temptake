// src/app/actions/auth.ts
"use server";

import { redirect } from "next/navigation";
import { getServerSupabase, getServerSupabaseAction } from "@/lib/supabaseServer";

export type AuthResult = { ok: boolean; message?: string; redirect?: string };

/** Server Component helper (read-only). */
export async function getUser() {
  const supabase = await getServerSupabase();
  const { data, error } = await supabase.auth.getUser();
  if (error) return null;
  return data.user ?? null;
}

/** Server Action used with useActionState in the Login client. */
export async function signInAction(
  _prevState: AuthResult,
  formData: FormData
): Promise<AuthResult> {
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");

  if (!email || !password) {
    return { ok: false, message: "Email and password are required." };
  }

  const supabase = await getServerSupabaseAction();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    return { ok: false, message: error.message };
  }
  return { ok: true, redirect: "/dashboard" };
}

/** Log out via Server Action (use it as a <form action={...}>). */
export async function signOutAndRedirect() {
  const supabase = await getServerSupabaseAction();
  await supabase.auth.signOut();
  redirect("/login");
}

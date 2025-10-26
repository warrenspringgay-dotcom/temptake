// src/app/actions/auth.ts
"use server";

import { redirect } from "next/navigation";
import {
  getServerSupabase,
  getServerSupabaseAction,
} from "@/lib/supabaseServer";

export type AuthResult = { ok: boolean; message?: string; redirect?: string };

export async function getSession() {
  const supabase = await getServerSupabase();
  const { data } = await supabase.auth.getSession();
  return data.session ?? null;
}

export async function getUser() {
  const supabase = await getServerSupabase();
  const { data } = await supabase.auth.getUser();
  return data.user ?? null;
}

export async function signInAction(
  _prev: AuthResult,
  formData: FormData
): Promise<AuthResult> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  if (!email || !password) return { ok: false, message: "Email and password are required." };

  const supabase = await getServerSupabaseAction();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return { ok: false, message: error.message };

  return { ok: true, redirect: "/dashboard" };
}

/**
 * ✔ Correct shape for <form action={...}>:
 * Bind the first arg (redirect target) from the client:
 * const action = signOutAction.bind(null, "/login")
 */
export async function signOutAction(
  redirectTo: string,
  _formData: FormData
): Promise<void> {
  const supabase = await getServerSupabaseAction();
  await supabase.auth.signOut();
  redirect(redirectTo || "/login");
}

/** Optional helper you can still call imperatively from a client via fetch/action */
export async function signOutAndRedirect(
  redirectTo: string = "/login"
): Promise<AuthResult> {
  const supabase = await getServerSupabaseAction();
  const { error } = await supabase.auth.signOut();
  if (error) return { ok: false, message: error.message };
  return { ok: true, redirect: redirectTo };
}

// src/app/actions/auth.ts
"use server";

import { redirect } from "next/navigation";
import { getServerSupabase } from "@/lib/supabaseServer";

/** Return authenticated user (or null) + role if you store it in app_metadata */
export async function getSession() {
  const supabase = await getServerSupabase();
  const { data } = await supabase.auth.getUser();
  const user = data.user ?? null;

  let role: "staff" | "manager" | "admin" | null = null;
  try {
    role = (user?.app_metadata?.role as typeof role) ?? null;
  } catch {
    role = null;
  }
  return { user, role };
}

/** Redirect to /login if no user */
export async function requireUser(redirectTo: string = "/") {
  const supabase = await getServerSupabase();
  const { data } = await supabase.auth.getUser();
  const user = data.user;
  if (!user) {
    redirect(`/login?redirect=${encodeURIComponent(redirectTo)}`);
  }
  return user;
}

/** Sign out WITHOUT redirect (plain action) */
export async function signOut() {
  const supabase = await getServerSupabase();
  await supabase.auth.signOut();
  return { ok: true };
}

/** Sign out AND redirect to login page */
export async function signOutAndRedirect() {
  const supabase = await getServerSupabase();
  await supabase.auth.signOut();
  redirect("/login");
}

// src/app/actions/auth.ts
"use server";

import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import type { Role } from "@/lib/roles";

/**
 * Returns a tiny session object used by AuthGate and menus.
 * { user: { id, email } | null, role: Role | null }
 */
export async function getSession(): Promise<{
  user: { id: string; email: string | null } | null;
  role: Role | null;
}> {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { user: null, role: null };

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  const role = (profile?.role ?? "staff") as Role;

  return {
    user: { id: user.id, email: user.email ?? null },
    role,
  };
}

/** Programmatic sign-out for server code */
export async function signOut() {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();
}

/**
 * Action for <form action={signOutAction}> in Server Components.
 * Logs out and redirects to /login.
 */
export async function signOutAction() {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();
  redirect("/login");
}

/**
 * Email/password sign-in server action.
 * Expects fields: email, password, and optional redirect (path).
 */
export async function signInAction(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const redirectTo = String(formData.get("redirect") ?? "/");

  if (!email || !password) {
    // You can surface this to the client with useFormState, but a simple bounce works.
    redirect(`/login?error=missing_fields&redirect=${encodeURIComponent(redirectTo)}`);
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    redirect(`/login?error=${encodeURIComponent(error.message)}&redirect=${encodeURIComponent(redirectTo)}`);
  }

  redirect(redirectTo || "/");
}

/** Small helper if you just need the user id */
export async function getUserId(): Promise<string | null> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user?.id ?? null;
}

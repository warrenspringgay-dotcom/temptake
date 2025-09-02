// src/app/actions/auth.ts
"use server";

import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import type { Role } from "@/lib/roles";

async function ensureProfile(userId: string) {
  const supabase = await createSupabaseServerClient();
  // Try fetch profile; if missing, create one with default role 'staff'
  const { data: profile } = await supabase.from("profiles").select("id").eq("id", userId).single();

  if (!profile) {
    // Allow insert via RLS policy: (id = auth.uid())
    await supabase.from("profiles").insert({ id: userId, role: "staff" });
  }
}

/**
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

  // Create profile if missing (first login, etc.)
  await ensureProfile(user.id);

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

/** Log out (for server code) */
export async function signOut() {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();
}

/** Log out (for forms in Server/Client components) */
export async function signOutAction() {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();
  redirect("/login");
}

/** Email/password sign-in */
export async function signInAction(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const redirectTo = String(formData.get("redirect") ?? "/");

  if (!email || !password) {
    redirect(`/login?error=Enter email and password&redirect=${encodeURIComponent(redirectTo)}`);
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    redirect(`/login?error=${encodeURIComponent(error.message)}&redirect=${encodeURIComponent(redirectTo)}`);
  }

  redirect(redirectTo || "/");
}

/** Email/password sign-up */
export async function signUpAction(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const redirectTo = String(formData.get("redirect") ?? "/");

  if (!email || !password) {
    redirect(`/login?tab=signup&error=Enter email and password&redirect=${encodeURIComponent(redirectTo)}`);
  }

  const supabase = await createSupabaseServerClient();

  // If email confirmations are ON, Supabase won’t give a session here.
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    // Optionally set an email confirmation redirect:
    // options: { emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL ?? ""}/login` },
  });

  if (error) {
    redirect(`/login?tab=signup&error=${encodeURIComponent(error.message)}&redirect=${encodeURIComponent(redirectTo)}`);
  }

  // If confirmations are disabled, we’ll have a session and can move on.
  // If confirmations are enabled, guide user to check email.
  if (!data.session) {
    redirect(`/login?tab=signin&notice=${encodeURIComponent("Check your email to confirm your account.")}`);
  }

  // With a session present, ensure a profile row exists
  if (data.user?.id) {
    await ensureProfile(data.user.id);
  }

  redirect(redirectTo || "/");
}

/** Just the id */
export async function getUserId(): Promise<string | null> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user?.id ?? null;
}

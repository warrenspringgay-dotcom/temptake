// src/app/actions/auth.ts
"use server";

import { redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabase-server";

export type Role = "staff" | "manager" | "owner";

export type AuthResult =
  | { ok: true }
  | { ok: false; message: string };

/**
 * Sign in with email/password (expects a single FormData from a client form).
 * Form fields: email, password
 */
export async function signInAction(formData: FormData): Promise<AuthResult> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!email || !password) {
    return { ok: false, message: "Email and password are required." };
  }

  const supabase = await supabaseServer();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) return { ok: false, message: error.message };

  // Optionally redirect after login:
  // redirect("/dashboard");
  return { ok: true };
}

/**
 * Sign up with email/password (expects a single FormData from a client form).
 * Form fields: email, password, name (optional)
 */
export async function signUpAction(formData: FormData): Promise<AuthResult> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const name = String(formData.get("name") ?? "").trim() || null;

  if (!email || !password) {
    return { ok: false, message: "Email and password are required." };
  }

  const supabase = await supabaseServer();
  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: name ? { name } : undefined,
      emailRedirectTo: process.env.NEXT_PUBLIC_SITE_URL
        ? `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback`
        : undefined,
    },
  });

  if (error) return { ok: false, message: error.message };

  // redirect("/dashboard"); // optional
  return { ok: true };
}

/**
 * Server action for <form action={signOutAction}>.
 * Must return void | Promise<void>.
 */
export async function signOutAction(): Promise<void> {
  const supabase = await supabaseServer();
  await supabase.auth.signOut();
  // Optionally redirect after sign-out:
  // redirect("/login");
}

/**
 * Minimal session getter usable by server components.
 * Expand this to include org/role lookup if/when you store it.
 */
export async function getSession() {
  const supabase = await supabaseServer();
  const { data, error } = await supabase.auth.getSession();
  return {
    user: data?.session?.user ?? null,
    role: null as Role | null, // TODO: load from DB/JWT when available
    error: error ?? null,
  };
}

/**
 * Placeholder role check so imports won’t break while auth/roles are being wired.
 * Replace with a real org/role policy when your schema is ready.
 */
export async function hasRole(_roles: Role[] = []) {
  // TODO: lookup user/org roles
  return true;
}

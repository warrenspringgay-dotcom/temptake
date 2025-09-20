// src/app/actions/auth.ts
"use server";

import { supabaseServer } from "@/lib/supabase-server";

export type AuthResult = {
  ok: boolean;
  message?: string;
  redirect?: string;
};

export async function signInAction(
  _prevState: AuthResult,              // <- required by useActionState
  formData: FormData
): Promise<AuthResult> {
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");

  if (!email || !password) {
    return { ok: false, message: "Please enter email and password." };
  }

  const supabase = await supabaseServer();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) return { ok: false, message: error.message };
  return { ok: true, redirect: "/" };
}

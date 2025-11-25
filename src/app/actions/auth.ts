// src/app/actions/auth.ts
"use server";

import { redirect } from "next/navigation";
import {
  getServerSupabase,
  getServerSupabaseAction,
} from "@/lib/supabaseServer";

export type AuthResult = {
  ok: boolean;
  message?: string;
  redirect?: string;
};

//
// --------------------------------------------------
// UTILITY HELPERS
// --------------------------------------------------
//

export async function signOut() {
  const supabase = await getServerSupabaseAction();
  await supabase.auth.signOut();
  redirect("/login");
}

export async function getUserOrNull() {
  const supabase = await getServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user ?? null;
}

export async function getSessionOrNull() {
  const supabase = await getServerSupabase();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  return session ?? null;
}

/** Require a logged-in user on server side */
export async function requireUser(next?: string) {
  const user = await getUserOrNull();
  if (!user) {
    redirect(`/login${next ? `?next=${encodeURIComponent(next)}` : ""}`);
  }
  return user;
}

//
// --------------------------------------------------
// LOGIN
// --------------------------------------------------
//

export async function signInAction(
  _: AuthResult,
  formData: FormData
): Promise<AuthResult> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const next = String(formData.get("next") ?? "/dashboard");

  if (!email || !password) {
    return { ok: false, message: "Email and password required." };
  }

  const supabase = await getServerSupabaseAction();
  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    return { ok: false, message: error.message };
  }

  return { ok: true, redirect: next };
}

//
// --------------------------------------------------
// SIGN UP — FULL ORG CREATION FLOW
// --------------------------------------------------
//

export async function signUpAction(
  _: AuthResult,
  formData: FormData
): Promise<AuthResult> {
  const name = String(formData.get("name") ?? "").trim();
  const orgName = String(formData.get("orgName") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const initials = String(formData.get("initials") ?? "")
    .trim()
    .toUpperCase();
  const next = String(formData.get("next") ?? "/dashboard");

  if (!name || !orgName || !email || !password) {
    return { ok: false, message: "Missing required signup fields." };
  }

  const supabase = await getServerSupabaseAction();

  //
  // 1) Create auth user
  //
  const { data: signUpData, error: signUpErr } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { full_name: name } },
  });

  if (signUpErr) {
    return { ok: false, message: signUpErr.message };
  }

  const user = signUpData.user;

  // If email confirmation is enabled — user is null until confirmed
  if (!user) {
    return {
      ok: true,
      message: "Account created. Check your email to confirm before continuing.",
    };
  }

  const userId = user.id;

  //
  // 2) Create org
  //
  const { data: orgRow, error: orgErr } = await supabase
    .from("orgs")
    .insert({ name: orgName })
    .select("id")
    .single();

  if (orgErr || !orgRow) {
    return { ok: false, message: "Could not create organisation." };
  }

  const orgId = orgRow.id as string;

  //
  // 3) Create default location = business name
  //
  const { data: locRow, error: locErr } = await supabase
    .from("locations")
    .insert({
      org_id: orgId,
      name: orgName,
      active: true,
    })
    .select("id")
    .single();

  if (locErr || !locRow) {
    return { ok: false, message: "Could not create default location." };
  }

  const locationId = String(locRow.id);

  // NOTE:
  // Client is responsible for storing active location in localStorage
  // using setActiveLocationIdClient()

  //
  // 4) Save profile
  //
  const { error: profileErr } = await supabase.from("profiles").upsert({
    id: userId,
    full_name: name,
    email,
    org_id: orgId,
  });

  if (profileErr) {
    return { ok: false, message: "Could not save profile." };
  }

  //
  // 5) Add them to team_members as OWNER
  //
  const { error: teamErr } = await supabase.from("team_members").upsert(
    {
      org_id: orgId,
      user_id: userId,
      name,
      email,
      initials,
      role: "owner",
      active: true,
    },
    { onConflict: "org_id,email" }
  );

  if (teamErr) {
    return { ok: false, message: "Could not create team owner record." };
  }

  //
  // 6) Redirect
  //
  return {
    ok: true,
    redirect: next,
  };
}

//
// --------------------------------------------------
// SIGN OUT
// --------------------------------------------------
//

export async function signOutAction(): Promise<void> {
  const supabase = await getServerSupabaseAction();
  await supabase.auth.signOut();
  redirect("/login");
}

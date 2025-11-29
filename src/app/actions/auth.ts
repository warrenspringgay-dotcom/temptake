// src/app/actions/auth.ts
"use server";

import { redirect } from "next/navigation";
import {
  getServerSupabase,
  getServerSupabaseAction,
} from "@/lib/supabaseServer";
import { createClient } from "@supabase/supabase-js";

export type AuthResult = {
  ok: boolean;
  message?: string;
  redirect?: string;
  orgId?: string;
  locationId?: string;
};

//
// --------------------------------------------------
// ADMIN (service-role) CLIENT – bypasses RLS for server-only work
// --------------------------------------------------
//

function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  if (!url || !serviceKey) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY env vars"
    );
  }

  return createClient(url, serviceKey, {
    auth: { persistSession: false },
  });
}

//
// --------------------------------------------------
// BASIC HELPERS
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

  // anon client for auth + RLS-aware stuff
  const supabase = await getServerSupabaseAction();
  // admin client for org/profile/location writes (bypass RLS)
  const admin = getAdminClient();

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
      message:
        "Account created. Check your email to confirm before continuing.",
    };
  }

  const userId = user.id;

  //
  // 2) Create org (admin client – ignores RLS)
  //
  const { data: orgRow, error: orgErr } = await admin
    .from("orgs")
    .insert({ name: orgName })
    .select("id")
    .single();

  if (orgErr || !orgRow) {
    console.error("Org insert failed:", orgErr);
    return {
      ok: false,
      message: `Could not create organisation: ${orgErr?.message ?? ""}`,
    };
  }

  const orgId = orgRow.id as string;

  //
  // 3) Create default location = business name (admin client)
  //
  const { data: locRow, error: locErr } = await admin
    .from("locations")
    .insert({
      org_id: orgId,
      name: orgName,
      active: true,
    })
    .select("id")
    .single();

  if (locErr || !locRow) {
    console.error("Location insert failed:", locErr);
    return {
      ok: false,
      message: `Could not create default location: ${locErr?.message ?? ""}`,
    };
  }

  const locationId = String(locRow.id);

  //
  // 4) Save profile (admin client – satisfies NOT NULL role)
  //
  const { error: profileErr } = await admin.from("profiles").upsert({
    id: userId,
    full_name: name,
    email,
    org_id: orgId,
    role: "owner",
  });

  if (profileErr) {
    console.error("Profile upsert failed:", profileErr);
    return {
      ok: false,
      message: `Could not save profile: ${profileErr.message}`,
    };
  }

  //
  // 5) Add them to team_members as OWNER
  //    IMPORTANT: use the *normal* authed client here so your RLS /
  //    helper functions see the real user, not the service_role token.
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
    console.error("Team upsert failed:", teamErr);
    return {
      ok: false,
      message: `Could not create team owner record: ${teamErr.message}`,
    };
  }

  //
  // 6) Redirect
  //
  return {
    ok: true,
    redirect: next,
    orgId,
    locationId,
  };
}

//
// --------------------------------------------------
// SIGN OUT (alt helper)
// --------------------------------------------------
//

export async function signOutAction(): Promise<void> {
  const supabase = await getServerSupabaseAction();
  await supabase.auth.signOut();
  redirect("/login");
}

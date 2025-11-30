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

  // anon client for auth
  const supabase = await getServerSupabaseAction();
  // admin client for org/profile/team writes (bypass RLS)
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
      message: "Could not create organisation.",
    };
  }

  const orgId = orgRow.id as string;

  //
  // 3) Create default location = business name
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
      message: "Could not create default location.",
    };
  }

  const locationId = String(locRow.id);
  // (locationId is for client use; RLS doesn't care here)

  //
  // 4) Save profile  ✅ includes role: "owner"
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
      message: "Could not save profile.",
    };
  }

  //
  // 5) Map user -> org in user_orgs  ✅ important for RLS helpers
  //
  const { error: userOrgErr } = await admin.from("user_orgs").upsert(
    {
      user_id: userId,
      org_id: orgId,
      is_default: true,
    },
    { onConflict: "user_id,org_id" }
  );

  if (userOrgErr) {
    console.error("user_orgs upsert failed:", userOrgErr);
    // not fatal, but log it; many RLS helpers rely on this
  }

  //
  // 6) Add them to team_members as OWNER  ✅ via service role, so RLS won't block
  //
  const { data: teamData, error: teamErr, status: teamStatus } = await admin
  .from("team_members")
  .insert({
    org_id: orgId,
    user_id: userId,
    name,
    email,
    initials: initials || (name[0]?.toUpperCase() ?? ""),
    role: "owner",
    active: true,
  })
  .select();

if (teamErr) {
  console.error("TEAM OWNER INSERT FAILED:");
  console.error("Status:", teamStatus);
  console.error("Error:", teamErr);
  console.error("Payload sent:", {
    org_id: orgId,
    user_id: userId,
    name,
    email,
    initials: initials || (name[0]?.toUpperCase() ?? ""),
    role: "owner",
    active: true,
  });

  return {
    ok: false,
    message: `Team owner insert failed: ${teamErr.message}`,
  };
}


  //
  // 7) Redirect
  //
  return {
    ok: true,
    redirect: next,
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

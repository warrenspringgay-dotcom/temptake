"use server";

import { getServerSupabase } from "@/lib/supabase-server";

/** Get a cookie-aware Supabase server client */
export async function db() {
  return await getServerSupabase();
}

/** Convenience: current Supabase user (or null) */
export async function getUser() {
  const supabase = await getServerSupabase();
  const { data } = await supabase.auth.getUser();
  return data.user ?? null;
}

/** Ensure there is a session and return the user id (throws otherwise) */
export async function requireUserId(): Promise<string> {
  const user = await getUser();
  if (!user) throw new Error("No active session");
  return user.id;
}

/** Read org id from user metadata if available (null if missing) */
export async function getOrgIdSafe(): Promise<string | null> {
  const user = await getUser();
  if (!user) return null;

  // Common places people store org/tenant ids
  const orgId =
    (user.user_metadata?.org_id as string | undefined) ??
    (user.app_metadata?.org_id as string | undefined) ??
    null;

  return orgId ?? null;
}

/** Same as above but throws if missing */
export async function getOrgIdStrict(): Promise<string> {
  const org = await getOrgIdSafe();
  if (!org) throw new Error("Missing org id");
  return org;
}

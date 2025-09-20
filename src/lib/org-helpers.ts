// src/lib/org-helpers.ts
"use server";

import { supabaseServer } from "@/lib/supabase-server";

/**
 * Returns the active org_id for the signed-in user.
 * Throws if no session or membership.
 */
export async function getOrgId(): Promise<string> {
  const supabase = await supabaseServer();

  // Who am I?
  const { data: userData, error: userErr } = await supabase.auth.getUser();
  if (userErr) throw userErr;
  const user = userData.user;
  if (!user) throw new Error("No session");

  // Find a membership
  const { data: membership, error: memErr } = await supabase
    .from("user_orgs")
    .select("org_id")
    .eq("user_id", user.id)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (memErr) throw memErr;
  if (!membership?.org_id) {
    throw new Error("No organisation membership for current user");
  }

  return membership.org_id as string;
}

/** Same as getOrgId but with a friendlier message */
export async function requireOrgId(): Promise<string> {
  const orgId = await getOrgId();
  if (!orgId) throw new Error("No organisation found for current user");
  return orgId;
}

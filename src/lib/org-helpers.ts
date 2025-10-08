// src/lib/org-helpers.ts
"use server";

import { createServerClient } from "@/lib/supabaseServer";
import { getSession } from "@/app/actions/auth";

/**
 * Try to find the current user's org id. Returns null if not found/signed-in.
 * - Looks in profiles(org_id) by user.id
 * - Falls back to first orgs.id where the user is a member (if you later add a members table)
 */
export async function getOrgId(): Promise<string | null> {
  const { user } = await getSession();
  if (!user) return null;

  const supabase = await createServerClient();

  // 1) profiles.org_id (most common)
  const { data: profRows, error: profErr } = await supabase
    .from("profiles")
    .select("org_id")
    .eq("id", user.id)
    .limit(1);

  if (!profErr) {
    const orgId = profRows?.[0]?.org_id ?? null;
    if (orgId) return orgId;
  }

  // 2) (optional) fallback: if you have orgs_members with (user_id, org_id)
  // const { data: memRows, error: memErr } = await supabase
  //   .from("orgs_members")
  //   .select("org_id")
  //   .eq("user_id", user.id)
  //   .limit(1);
  // if (!memErr && memRows?.[0]?.org_id) return memRows[0].org_id;

  // No org found yet
  return null;
}

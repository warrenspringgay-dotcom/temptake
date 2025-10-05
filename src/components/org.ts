// src/components/org.ts
"use server";

import { createServerClient } from "@/lib/supabaseServer";

/**
 * Tries to determine the active org_id for the signed-in user.
 * Priority:
 * 1) team_members (org_id or owner_id) by user_id/user_uid
 * 2) user metadata/app_metadata org_id
 * 3) user_orgs mapping table
 * 4) null if not found
 */
export async function getActiveOrgId(): Promise<string | null> {
  const supabase = await createServerClient();

  const {
    data: { user },
    error: userErr,
  } = await supabase.auth.getUser();
  if (userErr || !user) return null;

  const uid = user.id;

  // 1) team_members (support either user_id or user_uid columns)
  try {
    const { data: tm } = await supabase
      .from("team_members")
      .select("org_id, owner_id, user_id, user_uid")
      .or(`user_id.eq.${uid},user_uid.eq.${uid}`)
      .limit(1)
      .maybeSingle();

    if (tm?.org_id) return String(tm.org_id);
    if (tm?.owner_id) return String(tm.owner_id);
  } catch {
    // ignore and continue fallbacks
  }

  // 2) user metadata/app_metadata
  try {
    const meta =
      (user.user_metadata as any) ?? (user.app_metadata as any) ?? null;
    const metaOrg =
      meta?.org_id ?? meta?.organization_id ?? meta?.organisation_id ?? null;
    if (metaOrg) return String(metaOrg);
  } catch {
    // ignore
  }

  // 3) user_orgs mapping table (if present)
  try {
    const { data: uo } = await supabase
      .from("user_orgs")
      .select("org_id")
      .eq("user_id", uid)
      .limit(1)
      .maybeSingle();
    if (uo?.org_id) return String(uo.org_id);
  } catch {
    // ignore
  }

  // 4) none found
  return null;
}

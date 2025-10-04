// src/lib/org-utils.ts
import { createServerClient } from "@/lib/supabaseServer";

/**
 * Resolve the caller's org_id on the server.
 * Tries team_members first, then user metadata.
 */
export async function getOrgIdServer(): Promise<string | null> {
  const supabase = await createServerClient();

  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    const uid = user?.id;
    if (!uid) return null;

    // team_members
    const { data: tm } = await supabase
      .from("team_members")
      .select("org_id, owner_id")
      .eq("uid", uid)
      .maybeSingle();

    if (tm?.org_id) return String(tm.org_id);
    if (tm?.owner_id) return String(tm.owner_id);

    // user metadata fallback
    const metaOrg =
      (user?.user_metadata as any)?.org_id ??
      (user?.app_metadata as any)?.org_id ??
      null;

    return metaOrg ? String(metaOrg) : null;
  } catch {
    return null;
  }
}

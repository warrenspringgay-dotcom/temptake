// src/lib/org-helpers.ts

import { getServerSupabase } from "@/lib/supabaseServer";

/**
 * Resolve the active org_id for the currently authenticated user.
 * Order of precedence:
 * 1) JWT user_metadata.org_id
 * 2) profiles.org_id
 * 3) user_orgs(org link table).org_id
 */
export async function getOrgId(): Promise<string | null> {
  const supabase = await getServerSupabase();

  // Get the signed-in user (server-safe)
  const {
    data: { user },
    error: userErr,
  } = await supabase.auth.getUser();

  if (userErr) {
    console.warn("[getOrgId] auth.getUser error:", userErr.message);
  }
  if (!user) return null;

  // 1) Try JWT metadata
  const md = (user.user_metadata ?? {}) as Record<string, unknown>;
  const fromJwt = (md.org_id as string) || null;
  if (fromJwt) return fromJwt;

  // 2) Try profiles.org_id
  const { data: prof, error: profErr } = await supabase
    .from("profiles")
    .select("org_id")
    .eq("id", user.id)
    .maybeSingle();

  if (profErr) {
    console.warn("[getOrgId] profiles lookup error:", profErr.message);
  }
  if (prof?.org_id) return prof.org_id as string;

  // 3) Try user_orgs(org link table).org_id
  const { data: uo, error: uoErr } = await supabase
    .from("user_orgs")
    .select("org_id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (uoErr) {
    console.warn("[getOrgId] user_orgs lookup error:", uoErr.message);
  }
  return (uo?.org_id as string) ?? null;
}

/** Alias for clarity where you only call this server-side. */
export const getActiveOrgIdServer = getOrgId;

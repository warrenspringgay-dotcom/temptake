// src/lib/orgClient.ts
import { supabase as browserClient } from "@/lib/supabaseBrowser";

/**
 * Client-only: get org_id for the current user.
 *
 * Priority:
 *  1) user_orgs.active = true
 *  2) first user_orgs row (if any)
 *  3) user_metadata.org_id (legacy)
 *  4) profiles.org_id (legacy)
 */
export async function getActiveOrgIdClient(): Promise<string | null> {
  // 0) Get current session
  const {
    data: { session },
  } = await browserClient.auth.getSession();

  const user = session?.user;
  if (!user) return null;

  const userId = user.id;

  // 1) Try user_orgs (new, correct way)
  try {
    // Prefer active = true, otherwise just take the first mapping
    const { data: orgLinks, error: orgLinksError } = await browserClient
      .from("user_orgs")
      .select("org_id, active, created_at")
      .eq("user_id", userId)
      .order("active", { ascending: false }) // active=true first
      .order("created_at", { ascending: true })
      .limit(1);

    if (!orgLinksError && orgLinks && orgLinks.length > 0) {
      const orgId = orgLinks[0].org_id as string | null;
      if (orgId) return orgId;
    }
  } catch {
    // swallow and fall through to legacy behaviour
  }

  // 2) Legacy fallback: org_id stored in JWT metadata
  const md = (user.user_metadata ?? {}) as Record<string, any>;
  const orgFromJwt = (md.org_id as string) || null;
  if (orgFromJwt) return orgFromJwt;

  // 3) Legacy fallback: org_id on profiles table
  try {
    const { data: profile, error: profileError } = await browserClient
      .from("profiles")
      .select("org_id")
      .eq("id", userId)
      .maybeSingle();

    if (!profileError && profile?.org_id) {
      return profile.org_id as string;
    }
  } catch {
    // ignore
  }

  return null;
}

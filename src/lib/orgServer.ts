// src/lib/orgServer.ts
import { getServerSupabase } from "@/lib/supabaseServer";

/**
 * Server-side helper to read the active org id for the current authed user.
 * IMPORTANT: This should NOT attempt to create orgs or mutate membership.
 * Org bootstrapping must happen via POST /api/org/ensure (service role).
 */
export async function getActiveOrgIdServer(): Promise<string | null> {
  const supabase = await getServerSupabase();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) return null;

  const { data, error } = await supabase
    .from("profiles")
    .select("org_id")
    .eq("id", user.id)
    .maybeSingle();

  if (error) return null;

  return data?.org_id ? String(data.org_id) : null;
}

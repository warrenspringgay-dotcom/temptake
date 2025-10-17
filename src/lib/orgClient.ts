// src/lib/orgClient.ts
import { supabase as browserClient } from "@/lib/supabaseBrowser";

/** Client-only: get org_id for the current user. */
export async function getActiveOrgIdClient(): Promise<string | null> {
  const { data: { session } } = await browserClient.auth.getSession();

  const md = session?.user?.user_metadata ?? {};
  const orgFromJwt = (md.org_id as string) || null;
  if (orgFromJwt) return orgFromJwt;

  const userId = session?.user?.id;
  if (!userId) return null;

  const { data } = await browserClient
    .from("profiles")
    .select("org_id")
    .eq("id", userId)
    .maybeSingle();

  return (data?.org_id as string) ?? null;
}

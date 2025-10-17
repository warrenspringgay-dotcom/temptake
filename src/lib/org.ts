// Works in both Client and Server contexts.
import { getServerSupabase } from "@/lib/supabaseServer";
import { supabase as browserClient } from "@/lib/supabaseBrowser";

/** Get org_id for the current user (tries JWT metadata first, then profiles). */
export async function getActiveOrgId(opts?: { server?: boolean }): Promise<string | null> {
  if (opts?.server) {
    const supabase = await getServerSupabase();
    const { data: { session } } = await supabase.auth.getSession();
    const md = session?.user?.user_metadata ?? {};
    const orgFromJwt = (md.org_id as string) || null;
    if (orgFromJwt) return orgFromJwt;

    const userId = session?.user?.id;
    if (!userId) return null;
    const { data } = await supabase.from("profiles").select("org_id").eq("id", userId).maybeSingle();
    return (data?.org_id as string) ?? null;
  }

  // client
  const { data: { session } } = await browserClient.auth.getSession();
  const md = session?.user?.user_metadata ?? {};
  const orgFromJwt = (md.org_id as string) || null;
  if (orgFromJwt) return orgFromJwt;
  const userId = session?.user?.id;
  if (!userId) return null;
  const { data } = await browserClient.from("profiles").select("org_id").eq("id", userId).maybeSingle();
  return (data?.org_id as string) ?? null;
}
// src/lib/org.ts
export { getActiveOrgIdServer as getOrgId, getActiveOrgIdServer } from "./orgServer";
export { getActiveOrgIdClient } from "./orgClient";

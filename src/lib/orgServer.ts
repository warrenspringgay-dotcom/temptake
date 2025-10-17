// src/lib/orgServer.ts
import { getServerSupabase } from "@/lib/supabaseServer";

/** Server-only: get org_id for the current user. */
export async function getActiveOrgIdServer(): Promise<string | null> {
  const supabase = await getServerSupabase();
  const { data: { session } } = await supabase.auth.getSession();

  const md = session?.user?.user_metadata ?? {};
  const orgFromJwt = (md.org_id as string) || null;
  if (orgFromJwt) return orgFromJwt;

  const userId = session?.user?.id;
  if (!userId) return null;

  const { data } = await supabase
    .from("profiles")
    .select("org_id")
    .eq("id", userId)
    .maybeSingle();

  return (data?.org_id as string) ?? null;
}

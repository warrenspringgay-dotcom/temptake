// src/lib/orgServer.ts
// Server-only helper to get the active org_id
import { getServerSupabase } from "@/lib/supabaseServer";

export async function getActiveOrgIdServer(): Promise<string | null> {
  const supabase = await getServerSupabase();

  const { data: { session } } = await supabase.auth.getSession();

  // Try org_id from JWT first
  const fromJwt = (session?.user?.user_metadata?.org_id as string) || null;
  if (fromJwt) return fromJwt;

  // Fallback to profiles table
  const uid = session?.user?.id;
  if (!uid) return null;

  const { data, error } = await supabase
    .from("profiles")
    .select("org_id")
    .eq("id", uid)
    .maybeSingle();

  if (error) return null;
  return (data?.org_id as string) ?? null;
}

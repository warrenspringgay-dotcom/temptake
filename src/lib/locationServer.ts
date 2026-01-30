// src/lib/locationServer.ts
import { getServerSupabase } from "@/lib/getServerSupabase";

export async function getActiveLocationIdServer(): Promise<string | null> {
  const supabase = await getServerSupabase();
  const { data: userData } = await supabase.auth.getUser();
  const user = userData?.user;
  if (!user) return null;

  const { data, error } = await supabase
    .from("profiles")
    .select("active_location_id")
    .eq("id", user.id)
    .maybeSingle();

  if (error) return null;
  return data?.active_location_id ? String(data.active_location_id) : null;
}

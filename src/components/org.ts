// src/lib/org.ts
import { supabaseServer } from "@/lib/supabase-server";

export async function getActiveOrgId(): Promise<string | null> {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from("profiles")
    .select("default_org_id")
    .eq("id", user.id)
    .maybeSingle();

  return data?.default_org_id ?? null;
}

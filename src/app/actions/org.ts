// src/app/actions/org.ts
"use server";

import { getServerSupabase } from "@/lib/supabaseServer";

export async function getOrgIdOrCreate(): Promise<string> {
  const supabase = await getServerSupabase();
  const { data: { user }, error: userErr } = await supabase.auth.getUser();
  if (userErr) throw userErr;
  if (!user) throw new Error("Not signed in");

  // Call the SQL function we created
  const { data, error } = await supabase.rpc("ensure_org_for_user", { uid: user.id });
  if (error) throw error;
  if (!data) throw new Error("Could not resolve org");
  return data as string;
}

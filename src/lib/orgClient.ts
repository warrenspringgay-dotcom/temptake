// src/lib/orgClient.ts
"use client";

import { supabase } from "@/lib/supabaseBrowser";

/**
 * Returns the active org_id for the current user on the client.
 * Tries profile.org_id first, then user_orgs table.
 */
export async function getActiveOrgIdClient(): Promise<string | null> {
  try {
    const { data: auth } = await supabase.auth.getUser();
    const uid = auth?.user?.id;
    if (!uid) return null;

    // profiles.org_id (if you store it there)
    const { data: prof } = await supabase
      .from("profiles")
      .select("org_id")
      .eq("id", uid)
      .maybeSingle();

    if (prof?.org_id) return prof.org_id as string;

    // fallback: user_orgs(user_id, org_id)
    const { data: uo } = await supabase
      .from("user_orgs")
      .select("org_id")
      .eq("user_id", uid)
      .maybeSingle();

    return (uo?.org_id as string) ?? null;
  } catch {
    return null;
  }
}

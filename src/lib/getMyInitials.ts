// src/lib/getUserInitials.ts
"use client";

import { supabase } from "@/lib/supabaseBrowser";
import { getActiveOrgIdClient } from "@/lib/orgClient";

export async function getLoggedInUserInitials(): Promise<string | null> {
  try {
    const { data: auth, error } = await supabase.auth.getUser();
    if (error || !auth.user) return null;

    const email = auth.user.email ?? "";
    const orgId = await getActiveOrgIdClient();
    if (!orgId || !email) return null;

    const { data: tm } = await supabase
      .from("team_members")
      .select("initials,name")
      .eq("org_id", orgId)
      .eq("email", email)
      .limit(1);

    if (!tm || tm.length === 0) return null;

    const row = tm[0];

    // priority = initials → name initials → email first letter
    const raw =
      row.initials?.trim() ||
      row.name
        ?.trim()
        .split(/\s+/)
        .map((p: string) => p[0] ?? "")
        .join("") ||
      email[0] ||
      "";

    return raw.toUpperCase().slice(0, 4);
  } catch {
    return null;
  }
}

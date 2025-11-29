// src/lib/orgClient.ts
"use client";

import { supabase } from "@/lib/supabaseBrowser";

const LS_ACTIVE_ORG = "tt_active_org";

export async function getActiveOrgIdClient(): Promise<string | null> {
  // 1) Who is logged in?
  const { data: userRes } = await supabase.auth.getUser();
  const user = userRes.user;
  if (!user) return null;

  // 2) Check localStorage first
  if (typeof window !== "undefined") {
    const stored = window.localStorage.getItem(LS_ACTIVE_ORG);
    if (stored) return stored;
  }

  let orgId: string | null = null;

  // 3) Try existing user_orgs mapping
  const { data: uoRow, error: uoErr } = await supabase
    .from("user_orgs")
    .select("org_id")
    .eq("user_id", user.id)
    .order("created_at", { ascending: true })
    .maybeSingle();

  if (!uoErr && uoRow?.org_id) {
    orgId = uoRow.org_id as string;
  }

  // 4) If no mapping yet, try to infer from team_members by email
  if (!orgId && user.email) {
    const email = user.email.toLowerCase();

    const { data: tmRow, error: tmErr } = await supabase
      .from("team_members")
      .select("org_id")
      .eq("email", email)
      .order("created_at", { ascending: true })
      .maybeSingle();

    if (!tmErr && tmRow?.org_id) {
      orgId = tmRow.org_id as string;

      // Create user_orgs mapping so next time is fast & consistent
      await supabase
        .from("user_orgs")
        .upsert(
          {
            user_id: user.id,
            org_id: orgId,
          },
          { onConflict: "user_id,org_id" }
        );
    }
  }

  // 5) Cache in localStorage for the session
  if (orgId && typeof window !== "undefined") {
    window.localStorage.setItem(LS_ACTIVE_ORG, orgId);
  }

  return orgId;
}

/** ✅ NEW: explicitly set the active org ID on the client */
export function setActiveOrgIdClient(orgId: string | null) {
  if (typeof window === "undefined") return;
  try {
    if (orgId) {
      window.localStorage.setItem(LS_ACTIVE_ORG, orgId);
    } else {
      window.localStorage.removeItem(LS_ACTIVE_ORG);
    }
  } catch {
    // ignore
  }
}

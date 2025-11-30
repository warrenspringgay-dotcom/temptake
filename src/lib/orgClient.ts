// src/lib/orgClient.ts
"use client";

import { supabase } from "@/lib/supabaseBrowser";

const LS_ACTIVE_ORG = "tt_active_org";

// What we keep in localStorage now
type OrgCache = {
  user_id: string;
  org_id: string;
};

function readCachedOrg(userId: string): string | null {
  if (typeof window === "undefined") return null;

  const raw = window.localStorage.getItem(LS_ACTIVE_ORG);
  if (!raw) return null;

  // Old format was just a plain org_id string – treat that as invalid
  try {
    const parsed = JSON.parse(raw) as OrgCache;
    if (parsed && parsed.user_id === userId && parsed.org_id) {
      return parsed.org_id;
    }
  } catch {
    // ignore parse errors from old format and fall through
  }

  return null;
}

function writeCachedOrg(userId: string, orgId: string) {
  if (typeof window === "undefined") return;
  try {
    const payload: OrgCache = { user_id: userId, org_id: orgId };
    window.localStorage.setItem(LS_ACTIVE_ORG, JSON.stringify(payload));
  } catch {
    // ignore quota etc.
  }
}

/**
 * Get the active org for the *current logged in user*.
 * Uses localStorage as a per-user cache, then falls back to:
 *   - user_orgs (preferred)
 *   - team_members by email (bootstrap)
 */
export async function getActiveOrgIdClient(): Promise<string | null> {
  // 1) Who is logged in?
  const { data: userRes } = await supabase.auth.getUser();
  const user = userRes.user;
  if (!user) return null;

  const userId = user.id;

  // 2) Per-user localStorage cache
  const cached = readCachedOrg(userId);
  if (cached) return cached;

  let orgId: string | null = null;

  // 3) Try user_orgs mapping
  const { data: uoRow, error: uoErr } = await supabase
    .from("user_orgs")
    .select("org_id")
    .eq("user_id", userId)
    .order("created_at", { ascending: true })
    .maybeSingle();

  if (!uoErr && uoRow?.org_id) {
    orgId = uoRow.org_id as string;
  }

  // 4) If no mapping yet, infer from team_members by email
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

      // Make the mapping so next time is faster
      await supabase
        .from("user_orgs")
        .upsert(
          {
            user_id: userId,
            org_id: orgId,
          },
          { onConflict: "user_id,org_id" }
        );
    }
  }

  // 5) Cache for this specific user
  if (orgId) {
    writeCachedOrg(userId, orgId);
  }

  return orgId;
}

/**
 * Optional helper if you want to explicitly set org after signup / switching org.
 */
export async function setActiveOrgIdClient(orgId: string) {
  const { data: userRes } = await supabase.auth.getUser();
  const user = userRes.user;
  if (!user) return;
  writeCachedOrg(user.id, orgId);
}

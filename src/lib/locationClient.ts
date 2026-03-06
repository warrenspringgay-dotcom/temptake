// src/lib/locationClient.ts
"use client";

import { supabase } from "@/lib/supabaseBrowser";

/**
 * Store active location per-org in localStorage so multi-org users don't cross-contaminate state.
 * We ALSO best-effort mirror to profiles.active_location_id for SSR/server reads,
 * but we do not rely on it as the only source.
 */
function storageKey(orgId: string) {
  return `temptake_active_location_id:${orgId}`;
}

export async function getActiveLocationIdClient(orgId?: string | null): Promise<string | null> {
  // 1) localStorage (per org)
  if (typeof window !== "undefined" && orgId) {
    const raw = localStorage.getItem(storageKey(orgId));
    if (raw && raw.trim()) return raw.trim();
  }

  try {
    const { data: userRes } = await supabase.auth.getUser();
    const user = userRes?.user;
    if (!user) return null;

    // 2) best-effort: profiles.active_location_id
    const { data: profile, error: profileErr } = await supabase
      .from("profiles")
      .select("active_location_id")
      .eq("id", user.id)
      .maybeSingle();

    if (!profileErr) {
      const profileLocationId = profile?.active_location_id
        ? String(profile.active_location_id)
        : null;

      if (profileLocationId) {
        if (typeof window !== "undefined" && orgId) {
          localStorage.setItem(storageKey(orgId), profileLocationId);
        }
        return profileLocationId;
      }
    }

    // 3) fallback: team_members.location_id for this signed-in user
    let tmQuery = supabase
      .from("team_members")
      .select("location_id")
      .eq("user_id", user.id)
      .eq("active", true)
      .limit(1);

    if (orgId) {
      tmQuery = tmQuery.eq("org_id", orgId);
    }

    const { data: tmRows, error: tmErr } = await tmQuery;

    if (tmErr) return null;

    const tmLocationId =
      tmRows && tmRows.length > 0 && tmRows[0]?.location_id
        ? String(tmRows[0].location_id)
        : null;

    if (tmLocationId && typeof window !== "undefined" && orgId) {
      localStorage.setItem(storageKey(orgId), tmLocationId);
    }

    return tmLocationId;
  } catch {
    return null;
  }
}

export async function setActiveLocationIdClient(
  locationId: string,
  orgId?: string | null
): Promise<void> {
  const id = (locationId ?? "").trim();
  if (!id) return;

  // 1) localStorage per org
  if (typeof window !== "undefined" && orgId) {
    localStorage.setItem(storageKey(orgId), id);
  }

  // 2) best-effort mirror to profile for SSR/server usage
  try {
    const { data: userRes } = await supabase.auth.getUser();
    const user = userRes?.user;
    if (!user) return;

    await supabase.from("profiles").update({ active_location_id: id }).eq("id", user.id);
  } catch {
    // swallow: UI must not break if this fails
  }
}

/** Optional helper if you ever need to clear per-org stored location */
export function clearActiveLocationIdClient(orgId: string) {
  if (typeof window === "undefined") return;
  localStorage.removeItem(storageKey(orgId));
}
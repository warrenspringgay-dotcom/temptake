// src/lib/locationClient.ts
"use client";

import { supabase } from "@/lib/supabaseBrowser";
import { getActiveOrgIdClient } from "@/lib/orgClient";

const LS_ACTIVE_LOCATION = "tt_active_location_id";

/**
 * Get the currently active location ID.
 *
 * Priority:
 * 1) localStorage (fast)
 * 2) If not set, pick the first active location for the user's active org,
 *    cache it in localStorage, and return it.
 */
export async function getActiveLocationIdClient(): Promise<string | null> {
  // SSR safety
  if (typeof window === "undefined") return null;

  // 1) Try localStorage
  try {
    const v = window.localStorage.getItem(LS_ACTIVE_LOCATION);
    if (v) return v;
  } catch {
    // ignore localStorage errors
  }

  // 2) Fallback: find first active location for the current org
  const orgId = await getActiveOrgIdClient();
  if (!orgId) return null;

  const { data, error } = await supabase
    .from("locations")
    .select("id")
    .eq("org_id", orgId)
    .eq("active", true)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (error || !data?.id) {
    console.warn("getActiveLocationIdClient: no active locations found", {
      error,
      orgId,
    });
    return null;
  }

  const locId = String(data.id);

  // Cache in localStorage for future calls
  try {
    window.localStorage.setItem(LS_ACTIVE_LOCATION, locId);
  } catch {
    // ignore
  }

  return locId;
}

/**
 * Set the active location ID in localStorage (client only).
 */
export function setActiveLocationIdClient(id: string) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(LS_ACTIVE_LOCATION, id);
  } catch {
    // ignore
  }
}

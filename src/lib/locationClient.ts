"use client";

import { supabase } from "@/lib/supabaseBrowser";
import { getActiveOrgIdClient } from "@/lib/orgClient";

const LS_ACTIVE_LOCATION = "tt_active_location_id";

let inFlight: Promise<string | null> | null = null;
let warnedNoLocations = false;

export async function getActiveLocationIdClient(): Promise<string | null> {
  if (typeof window === "undefined") return null;

  try {
    const v = window.localStorage.getItem(LS_ACTIVE_LOCATION);
    if (v) return v;
  } catch {}

  if (inFlight) return inFlight;

  inFlight = (async () => {
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
      if (!warnedNoLocations) {
        warnedNoLocations = true;
        console.warn("getActiveLocationIdClient: no active locations found", { error, orgId });
      }
      return null;
    }

    const locId = String(data.id);

    try {
      window.localStorage.setItem(LS_ACTIVE_LOCATION, locId);
    } catch {}

    return locId;
  })().finally(() => {
    inFlight = null;
  });

  return inFlight;
}

export function setActiveLocationIdClient(id: string) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(LS_ACTIVE_LOCATION, id);
  } catch {}
}

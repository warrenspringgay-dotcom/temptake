// src/lib/locationClient.ts
"use client";

const LS_ACTIVE_LOCATION = "tt_active_location_id";

/**
 * Read the currently active location ID from localStorage (client only).
 */
export async function getActiveLocationIdClient(): Promise<string | null> {
  if (typeof window === "undefined") return null;
  try {
    const v = window.localStorage.getItem(LS_ACTIVE_LOCATION);
    return v || null;
  } catch {
    return null;
  }
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

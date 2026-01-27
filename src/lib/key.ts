// src/lib/locationClient.ts
"use client";

const LS_ACTIVE_LOCATION = "tt_active_location_id";

/**
 * Server is source of truth (profiles.active_location_id).
 * We also keep a localStorage fallback so the UI doesn't collapse if API fails.
 */

export async function getActiveLocationIdClient(): Promise<string | null> {
  // 1) Try server
  try {
    const res = await fetch("/api/location/active", { method: "GET", credentials: "include" });
    if (res.ok) {
      const data = await res.json();
      const id = typeof data?.activeLocationId === "string" ? data.activeLocationId : null;

      // mirror into localStorage
      try {
        if (id) localStorage.setItem(LS_ACTIVE_LOCATION, id);
      } catch {}

      return id;
    }
  } catch {
    // ignore, fallback below
  }

  // 2) Fallback localStorage
  try {
    return localStorage.getItem(LS_ACTIVE_LOCATION);
  } catch {
    return null;
  }
}

export async function setActiveLocationIdClient(locationId: string | null): Promise<void> {
  // optimistic local storage
  try {
    if (locationId) localStorage.setItem(LS_ACTIVE_LOCATION, locationId);
    else localStorage.removeItem(LS_ACTIVE_LOCATION);
  } catch {}

  // server update
  try {
    await fetch("/api/location/active", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ activeLocationId: locationId }),
    });
  } catch {
    // if server fails, localStorage still carries state
  }
}

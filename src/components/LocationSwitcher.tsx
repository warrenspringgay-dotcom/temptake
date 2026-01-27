// src/components/LocationSwitcher.tsx
"use client";

import React, { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseBrowser";
import { getActiveOrgIdClient } from "@/lib/orgClient";
import {
  getActiveLocationIdClient,
  setActiveLocationIdClient,
} from "@/lib/locationClient";

type LocationRow = {
  id: string;
  name: string;
};

export default function LocationSwitcher() {
  const [locations, setLocations] = useState<LocationRow[]>([]);
  const [activeId, setActiveId] = useState<string>("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;

    (async () => {
      try {
        setLoading(true);

        const orgId = await getActiveOrgIdClient();
        if (!orgId) {
          if (!alive) return;
          setLocations([]);
          setActiveId("");
          return;
        }

        const { data, error } = await supabase
          .from("locations")
          .select("id,name,active")
          .eq("org_id", orgId)
          .eq("active", true)
          .order("name", { ascending: true });

        if (error) throw error;

        const locs: LocationRow[] =
          data?.map((r: any) => ({
            id: String(r.id),
            name: (r.name ?? "Unnamed").toString(),
          })) ?? [];

        if (!alive) return;

        setLocations(locs);

        const stored = await getActiveLocationIdClient();
        const storedIsValid = !!stored && locs.some((l) => l.id === stored);

        let chosen = "";
        if (storedIsValid) {
          chosen = stored as string;
        } else if (locs[0]) {
          chosen = locs[0].id;
          await setActiveLocationIdClient(chosen);
        }

        setActiveId(chosen);
      } catch (e) {
        console.error("[LocationSwitcher] load failed", e);
        if (alive) {
          setLocations([]);
          setActiveId("");
        }
      } finally {
        if (alive) setLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, []);

  async function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const id = e.target.value;
    setActiveId(id);

    try {
      await setActiveLocationIdClient(id);
    } finally {
      // simplest way to ensure all screens reload scoped data
      if (typeof window !== "undefined") window.location.reload();
    }
  }

  // Keep the header clean: don't render filler UI.
  if (loading) return null;

  // Nothing to switch
  if (locations.length <= 1) return null;

  return (
    <select
      value={activeId}
      onChange={handleChange}
      className="h-9 max-w-[180px] truncate rounded-full border border-emerald-200 bg-emerald-50 px-3 text-xs font-semibold text-emerald-900 shadow-sm hover:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 md:max-w-[220px]"
      title="Switch location"
      aria-label="Switch location"
    >
      {locations.map((loc) => (
        <option key={loc.id} value={loc.id}>
          {loc.name}
        </option>
      ))}
    </select>
  );
}

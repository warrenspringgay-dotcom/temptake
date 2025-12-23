// src/components/LocationSwitcher.tsx
"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
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
  const router = useRouter();

  const [locations, setLocations] = useState<LocationRow[]>([]);
  const [activeId, setActiveId] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        setErr(null);

        const orgId = await getActiveOrgIdClient();
        if (!orgId) {
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
          (data ?? []).map((r: any) => ({
            id: String(r.id),
            name: (r.name ?? "Unnamed").toString(),
          })) || [];

        setLocations(locs);

        // figure out initial active location
        const stored = await getActiveLocationIdClient();
        const storedIsValid = stored && locs.some((l) => l.id === stored);

        let chosen = "";
        if (storedIsValid) {
          chosen = stored!;
        } else if (locs[0]) {
          chosen = locs[0].id;
          await setActiveLocationIdClient(chosen);
        }

        setActiveId(chosen);
      } catch (e) {
        console.error("Location switcher error", e);
        setErr("Locations unavailable");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // Ensure single location is persisted as active, but do it in an effect
  useEffect(() => {
    (async () => {
      if (!loading && locations.length === 1) {
        const only = locations[0];
        if (only && only.id !== activeId) {
          setActiveId(only.id);
          await setActiveLocationIdClient(only.id);
        }
      }
    })();
  }, [loading, locations, activeId]);

  if (loading) {
    return (
      <span className="hidden text-xs text-slate-400 md:inline">
        Loading sites…
      </span>
    );
  }

  // Error or no locations
  if (err || locations.length === 0) {
    const msg: string = err ?? "No locations set";

    return (
      <span className="hidden max-w-[140px] truncate text-xs text-slate-400 md:inline">
        {msg}
      </span>
    );
  }

  // Single location: hide the dropdown, we already show org / context elsewhere
  if (locations.length === 1) {
    return null;
  }

  // Multi-location selector
  async function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const id = e.target.value;
    setActiveId(id);
    await setActiveLocationIdClient(id);
    router.refresh(); // refresh server components for new location
  }

  return (
    <div className="flex items-center">
      <select
        value={activeId}
        onChange={handleChange}
        className="h-8 max-w-[180px] truncate rounded-xl border border-slate-200 bg-slate-50 px-2 text-xs font-medium text-slate-700 shadow-sm hover:bg:white focus:outline-none focus:ring-2 focus:ring-emerald-500 md:max-w-[220px]"
        title="Switch location"
      >
        {locations.map((loc) => (
          <option key={loc.id} value={loc.id}>
            {loc.name}
          </option>
        ))}
      </select>
    </div>
  );
}

// src/components/LocationSwitcher.tsx
"use client";

import React, { useEffect, useMemo, useState } from "react";
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

type Props = {
  /** show the current-site pill even if there is only one location */
  showWhenSingle?: boolean;
  /** if true, reload the page after switching (keeps your current “simple” behaviour) */
  reloadOnChange?: boolean;
  /** optional extra classes for the wrapper */
  className?: string;
};

const cls = (...parts: Array<string | false | null | undefined>) =>
  parts.filter(Boolean).join(" ");

export default function LocationSwitcher({
  showWhenSingle = true,
  reloadOnChange = true,
  className,
}: Props) {
  const [locations, setLocations] = useState<LocationRow[]>([]);
  const [activeId, setActiveId] = useState<string>("");
  const [loading, setLoading] = useState(true);

  const activeName = useMemo(() => {
    return locations.find((l) => l.id === activeId)?.name ?? "";
  }, [locations, activeId]);

  const multi = locations.length > 1;

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

        // pick active: stored -> first
        const stored = await getActiveLocationIdClient();
        const storedIsValid = !!stored && locs.some((l) => l.id === stored);

        let chosen = "";
        if (storedIsValid) chosen = stored as string;
        else if (locs[0]) {
          chosen = locs[0].id;
          setActiveLocationIdClient(chosen);
        }

        setActiveId(chosen);
      } catch (e) {
        console.error("[LocationSwitcher] load failed", e);
        if (!alive) return;
        setLocations([]);
        setActiveId("");
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
    setActiveLocationIdClient(id);

    if (reloadOnChange && typeof window !== "undefined") {
      window.location.reload();
    }
  }

  // Keep header clean: no filler while loading
  if (loading) return null;

  // Nothing available
  if (locations.length === 0 || !activeId) return null;

  // If single-location and caller doesn’t want it, hide entirely
  if (!multi && !showWhenSingle) return null;

  return (
    <div className={cls("hidden items-center gap-2 md:flex", className)}>
      {/* Current site pill (always) */}
      <span
        className="max-w-[180px] truncate rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-900 shadow-sm md:max-w-[220px]"
        title={activeName || "—"}
      >
        {activeName || "—"}
      </span>

      {/* Dropdown only if multiple sites */}
      {multi && (
        <select
          value={activeId}
          onChange={handleChange}
          className="h-9 max-w-[180px] truncate rounded-full border border-slate-200 bg-white px-3 text-xs font-medium text-slate-700 shadow-sm hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-emerald-500 md:max-w-[220px]"
          title="Switch location"
          aria-label="Switch location"
        >
          {locations.map((loc) => (
            <option key={loc.id} value={loc.id}>
              {loc.name}
            </option>
          ))}
        </select>
      )}
    </div>
  );
}

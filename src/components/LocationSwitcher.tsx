// src/components/LocationSwitcher.tsx
"use client";

import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseBrowser";
import { getActiveOrgIdClient } from "@/lib/orgClient";
import { getActiveLocationIdClient, setActiveLocationIdClient } from "@/lib/locationClient";

type LocationRow = {
  id: string;
  name: string;
};

const cls = (...parts: Array<string | false | null | undefined>) =>
  parts.filter(Boolean).join(" ");

export default function LocationSwitcher() {
  const [locations, setLocations] = useState<LocationRow[]>([]);
  const [activeId, setActiveId] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const activeName = useMemo(() => {
    return locations.find((l) => l.id === activeId)?.name ?? "";
  }, [locations, activeId]);

  useEffect(() => {
    let alive = true;

    (async () => {
      try {
        setLoading(true);
        setErr(null);

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

        // Determine active location:
        // 1) server/localStorage helper
        // 2) fallback to first location
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
        console.error("[LocationSwitcher] error loading locations", e);
        if (alive) setErr("Locations unavailable");
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
    await setActiveLocationIdClient(id);

    // simplest way to ensure all screens reload scoped data
    if (typeof window !== "undefined") window.location.reload();
  }

  if (loading) {
    return (
      <div className="hidden items-center gap-2 md:flex">
        <span className="text-[11px] uppercase tracking-wide text-slate-500">Current site</span>
        <span className="rounded-full bg-slate-100 px-2 py-1 text-xs text-slate-600">
          Loading…
        </span>
      </div>
    );
  }

  if (err || locations.length === 0) {
    return (
      <div className="hidden items-center gap-2 md:flex">
        <span className="text-[11px] uppercase tracking-wide text-slate-500">Current site</span>
        <span className="rounded-full bg-slate-100 px-2 py-1 text-xs text-slate-600">
          {err ?? "None"}
        </span>
      </div>
    );
  }

  const multi = locations.length > 1;

  return (
    <div className="hidden items-center gap-2 md:flex">
      <span className="text-[11px] uppercase tracking-wide text-slate-500">Current site</span>

      {/* Clear indicator */}
      <span
        className={cls(
          "max-w-[220px] truncate rounded-full px-2 py-1 text-xs font-semibold shadow-sm",
          "bg-emerald-50 text-emerald-800 border border-emerald-200"
        )}
        title={activeName || "—"}
      >
        {activeName || "—"}
      </span>

      {/* Selector only when needed */}
      {multi && (
        <select
          value={activeId}
          onChange={handleChange}
          className="h-8 max-w-[180px] truncate rounded-xl border border-slate-200 bg-slate-50 px-2 text-xs font-medium text-slate-700 shadow-sm hover:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 md:max-w-[220px]"
          title="Switch site"
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

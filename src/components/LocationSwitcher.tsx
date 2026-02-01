// src/components/LocationSwitcher.tsx
"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
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

  // Keep orgId around for realtime filter + reloads
  const orgIdRef = useRef<string | null>(null);

  const activeName = useMemo(() => {
    return locations.find((l) => l.id === activeId)?.name ?? "";
  }, [locations, activeId]);

  const multi = locations.length > 1;

  const loadLocations = useCallback(async () => {
    try {
      setLoading(true);

      const orgId = await getActiveOrgIdClient();
      orgIdRef.current = orgId || null;

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
        data?.map((r: any) => ({
          id: String(r.id),
          name: (r.name ?? "Unnamed").toString(),
        })) ?? [];

      setLocations(locs);

      // pick active: stored -> first
      const stored = await getActiveLocationIdClient();
      const storedIsValid = !!stored && locs.some((l) => l.id === stored);

      let chosen = "";
      if (storedIsValid) chosen = stored as string;
      else if (locs[0]) {
        chosen = locs[0].id;
        await setActiveLocationIdClient(chosen);
      }

      setActiveId(chosen);
    } catch (e) {
      console.error("[LocationSwitcher] load failed", e);
      setLocations([]);
      setActiveId("");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let alive = true;

    (async () => {
      if (!alive) return;
      await loadLocations();
    })();

    return () => {
      alive = false;
    };
  }, [loadLocations]);

  // ✅ Realtime: when locations change for this org, refresh the list
  useEffect(() => {
    let channel: ReturnType<typeof supabase.channel> | null = null;
    let cancelled = false;

    (async () => {
      // Ensure we have orgId
      if (!orgIdRef.current) {
        const orgId = await getActiveOrgIdClient();
        orgIdRef.current = orgId || null;
      }

      const orgId = orgIdRef.current;
      if (!orgId || cancelled) return;

      // Subscribe to changes in locations for this org
      channel = supabase
        .channel(`locations-switcher-${orgId}`)
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "locations",
            filter: `org_id=eq.${orgId}`,
          },
          async () => {
            // reload list and keep active selection valid
            await loadLocations();
          }
        )
        .subscribe();

      // Also reload when tab regains focus (covers no-realtime setups)
      const onFocus = async () => {
        await loadLocations();
      };
      window.addEventListener("focus", onFocus);

      // Optional: allow other components to force refresh
      const onManualRefresh = async () => {
        await loadLocations();
      };
      window.addEventListener("temptake:locations-updated", onManualRefresh);

      return () => {
        window.removeEventListener("focus", onFocus);
        window.removeEventListener("temptake:locations-updated", onManualRefresh);
      };
    })();

    return () => {
      cancelled = true;
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, [loadLocations]);

  async function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const id = e.target.value;
    setActiveId(id);

    // ✅ make sure it's persisted before any reload/refresh
    await setActiveLocationIdClient(id);

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

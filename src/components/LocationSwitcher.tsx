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
  /** optional extra classes for the wrapper */
  className?: string;
  /** if true, reload the page after switching (keeps your current “simple” behaviour) */
  reloadOnChange?: boolean;
};

const cls = (...parts: Array<string | false | null | undefined>) =>
  parts.filter(Boolean).join(" ");

export default function LocationSwitcher({
  className,
  reloadOnChange = true,
}: Props) {
  const [locations, setLocations] = useState<LocationRow[]>([]);
  const [activeId, setActiveId] = useState<string>("");
  const [loading, setLoading] = useState(true);

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

  useEffect(() => {
    let channel: ReturnType<typeof supabase.channel> | null = null;
    let cancelled = false;

    (async () => {
      if (!orgIdRef.current) {
        const orgId = await getActiveOrgIdClient();
        orgIdRef.current = orgId || null;
      }

      const orgId = orgIdRef.current;
      if (!orgId || cancelled) return;

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
            await loadLocations();
          }
        )
        .subscribe();

      const onFocus = async () => {
        await loadLocations();
      };
      window.addEventListener("focus", onFocus);

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
      if (channel) supabase.removeChannel(channel);
    };
  }, [loadLocations]);

  async function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const id = e.target.value;
    setActiveId(id);
    await setActiveLocationIdClient(id);

    if (reloadOnChange && typeof window !== "undefined") {
      window.location.reload();
    }
  }

  if (loading) return null;
  if (locations.length === 0 || !activeId) return null;

  return (
    <div className={cls("hidden items-center gap-2 md:flex", className)}>
      {/* ✅ SINGLE location: show ONE pill */}
      {!multi && (
        <span
          className="max-w-[180px] truncate rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-900 shadow-sm md:max-w-[220px]"
          title={activeName || "—"}
        >
          {activeName || "—"}
        </span>
      )}

      {/* ✅ MULTI location: show ONLY the dropdown (no extra pill) */}
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

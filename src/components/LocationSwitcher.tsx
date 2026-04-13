"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown } from "lucide-react";
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
  /** show something even if there is only one location */
  showWhenSingle?: boolean;
  /** if true, refresh the page after switching */
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
  const router = useRouter();

  const [locations, setLocations] = useState<LocationRow[]>([]);
  const [activeId, setActiveId] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [switching, setSwitching] = useState(false);

  const activeName = useMemo(() => {
    return locations.find((l) => l.id === activeId)?.name ?? "";
  }, [locations, activeId]);

  const multi = locations.length > 1;

  async function loadLocations() {
    setLoading(true);

    const orgId = await getActiveOrgIdClient();
    if (!orgId) {
      setLocations([]);
      setActiveId("");
      setLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from("locations")
      .select("id,name,active")
      .eq("org_id", orgId)
      .eq("active", true)
      .order("name", { ascending: true });

    if (error) {
      console.error("[LocationSwitcher] load failed", error);
      setLocations([]);
      setActiveId("");
      setLoading(false);
      return;
    }

    const locs: LocationRow[] =
      data?.map((r: any) => ({
        id: String(r.id),
        name: (r.name ?? "Unnamed").toString(),
      })) ?? [];

    setLocations(locs);

    const stored = await getActiveLocationIdClient(orgId);
    const storedIsValid = !!stored && locs.some((l) => l.id === stored);

    let chosen = "";
    if (storedIsValid) {
      chosen = String(stored);
    } else if (locs[0]) {
      chosen = locs[0].id;
      await setActiveLocationIdClient(chosen, orgId);

      window.dispatchEvent(
        new CustomEvent("tt-location-changed", {
          detail: { orgId, locationId: chosen },
        })
      );
    }

    setActiveId(chosen);
    setLoading(false);
  }

  useEffect(() => {
    let alive = true;

    const safeLoad = async () => {
      if (!alive) return;
      await loadLocations();
    };

    void safeLoad();

    const onFocus = () => void safeLoad();

    const onVisibility = () => {
      if (document.visibilityState === "visible") void safeLoad();
    };

    const onLocationsChanged = () => void safeLoad();

    const onLocationChanged = (event: Event) => {
      const custom = event as CustomEvent<{ orgId?: string; locationId?: string }>;
      const nextId = custom.detail?.locationId;
      if (nextId) setActiveId(String(nextId));
    };

    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("tt-locations-changed", onLocationsChanged as EventListener);
    window.addEventListener("tt-location-changed", onLocationChanged as EventListener);

    return () => {
      alive = false;
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("tt-locations-changed", onLocationsChanged as EventListener);
      window.removeEventListener("tt-location-changed", onLocationChanged as EventListener);
    };
  }, []);

  async function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const id = e.target.value;
    if (!id || id === activeId) return;

    const orgId = await getActiveOrgIdClient();
    if (!orgId) return;

    setSwitching(true);

    try {
      setActiveId(id);
      await setActiveLocationIdClient(id, orgId);

      window.dispatchEvent(
        new CustomEvent("tt-location-changed", {
          detail: { orgId, locationId: id },
        })
      );

      if (reloadOnChange) {
        router.refresh();
      }
    } catch (error) {
      console.error("[LocationSwitcher] failed to switch location", error);
    } finally {
      setSwitching(false);
    }
  }

  if (loading) return null;
  if (locations.length === 0 || !activeId) return null;

  if (!multi && !showWhenSingle) return null;

  return (
    <div className={cls("flex items-center gap-2", className)}>
      {!multi && (
        <span
          className="max-w-[220px] truncate rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-900 shadow-sm"
          title={activeName || "—"}
        >
          {activeName || "—"}
        </span>
      )}

      {multi && (
        <div className="relative">
          <select
            value={activeId}
            onChange={handleChange}
            disabled={switching}
            className="h-9 max-w-[220px] cursor-pointer truncate rounded-full border border-emerald-200 bg-emerald-50 py-0 pl-3 pr-9 text-xs font-semibold text-emerald-900 shadow-sm hover:bg-emerald-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 appearance-none disabled:cursor-wait disabled:opacity-70"
            title="Switch location"
            aria-label="Switch location"
          >
            {locations.map((loc) => (
              <option key={loc.id} value={loc.id}>
                {loc.name}
              </option>
            ))}
          </select>

          <ChevronDown
            className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-emerald-900/70"
            aria-hidden="true"
          />
        </div>
      )}
    </div>
  );
}
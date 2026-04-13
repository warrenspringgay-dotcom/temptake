"use client";

import { useCallback, useEffect, useState } from "react";
import { getActiveOrgIdClient } from "@/lib/orgClient";
import {
  getActiveLocationIdClient,
  setActiveLocationIdClient,
} from "@/lib/locationClient";

type UseActiveLocationResult = {
  orgId: string | null;
  locationId: string | null;
  loading: boolean;
  setLocationId: (nextLocationId: string) => Promise<void>;
  refreshLocation: () => Promise<void>;
};

export function useActiveLocation(): UseActiveLocationResult {
  const [orgId, setOrgId] = useState<string | null>(null);
  const [locationId, setLocationIdState] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshLocation = useCallback(async () => {
    setLoading(true);
    try {
      const activeOrgId = await getActiveOrgIdClient();
      setOrgId(activeOrgId ?? null);

      if (!activeOrgId) {
        setLocationIdState(null);
        return;
      }

      const activeLocationId = await getActiveLocationIdClient(activeOrgId);
      setLocationIdState(activeLocationId ?? null);
    } finally {
      setLoading(false);
    }
  }, []);

  const setLocationId = useCallback(async (nextLocationId: string) => {
    const next = (nextLocationId ?? "").trim();
    if (!next) return;

    const activeOrgId = await getActiveOrgIdClient();
    if (!activeOrgId) return;

    await setActiveLocationIdClient(next, activeOrgId);

    setOrgId(activeOrgId);
    setLocationIdState(next);

    window.dispatchEvent(
      new CustomEvent("tt-location-changed", {
        detail: {
          orgId: activeOrgId,
          locationId: next,
        },
      })
    );
  }, []);

  useEffect(() => {
    void refreshLocation();

    const onLocationChanged = (event: Event) => {
      const custom = event as CustomEvent<{ orgId?: string; locationId?: string }>;
      const nextOrgId = custom.detail?.orgId ?? null;
      const nextLocationId = custom.detail?.locationId ?? null;

      if (nextOrgId) setOrgId(nextOrgId);
      if (nextLocationId) {
        setLocationIdState(nextLocationId);
        setLoading(false);
        return;
      }

      void refreshLocation();
    };

    window.addEventListener("tt-location-changed", onLocationChanged as EventListener);

    return () => {
      window.removeEventListener("tt-location-changed", onLocationChanged as EventListener);
    };
  }, [refreshLocation]);

  return {
    orgId,
    locationId,
    loading,
    setLocationId,
    refreshLocation,
  };
}
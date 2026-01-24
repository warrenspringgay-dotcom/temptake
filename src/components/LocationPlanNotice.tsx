// src/components/LocationPlanNotice.tsx
"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseBrowser";
import { getActiveOrgIdClient } from "@/lib/orgClient";
import { getBillingStatusClient } from "@/lib/billingClient";
import { getMaxLocationsFromPlanName } from "@/lib/billingTiers";


type State = {
  loading: boolean;
  error: string | null;
  planName: string | null;
  status: string | null;
  maxLocations: number | null;
  locationCount: number | null;
};

export default function LocationPlanNotice() {
  const router = useRouter();
  const [state, setState] = useState<State>({
    loading: true,
    error: null,
    planName: null,
    status: null,
    maxLocations: null,
    locationCount: null,
  });

  useEffect(() => {
    (async () => {
      try {
        const orgId = await getActiveOrgIdClient();
        if (!orgId) {
          setState((s) => ({
            ...s,
            loading: false,
            error: "No organisation found for this user.",
          }));
          return;
        }

        const billing = await getBillingStatusClient();
        const maxLocations = getMaxLocationsFromPlanName(
          billing?.plan_name ?? null
        );

        // Count locations for this org
        const { count, error: locErr } = await supabase
          .from("locations")
          .select("id", { count: "exact", head: true })
          .eq("org_id", orgId);

        if (locErr) {
          throw locErr;
        }

        setState({
          loading: false,
          error: null,
          planName: billing?.plan_name ?? null,
          status: billing?.status ?? null,
          maxLocations,
          locationCount: count ?? 0,
        });
      } catch (err: any) {
        console.error("[LocationPlanNotice] error", err);
        setState((s) => ({
          ...s,
          loading: false,
          error: err?.message || "Failed to load plan information.",
        }));
      }
    })();
  }, []);

  if (state.loading) return null;

  const { error, planName, status, maxLocations, locationCount } = state;

  if (error) {
    return (
      <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
        {error}
      </div>
    );
  }

  // No plan at all
  if (!status || status === "canceled") {
    return (
      <div className="mb-4 flex flex-col gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-900 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="font-semibold">No active plan.</div>
          <div>
            You can&apos;t add new locations until you start a free trial or
            choose a plan.
          </div>
        </div>
        <button
          type="button"
          onClick={() => router.push("/billing")}
          className="mt-1 inline-flex items-center justify-center rounded-md bg-red-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-red-700 sm:mt-0"
        >
          Go to billing
        </button>
      </div>
    );
  }

  // Active or trialing with no explicit limit → nothing special
  if (maxLocations === null) {
    return (
      <div className="mb-4 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-700">
        Plan:{" "}
        <span className="font-semibold">{planName ?? "Custom / legacy"}</span>
        . Locations are not capped on this plan.
      </div>
    );
  }

  const used = locationCount ?? 0;
  const remaining = Math.max(maxLocations - used, 0);
  const atOrOverLimit = used >= maxLocations;

  if (!atOrOverLimit) {
    return (
      <div className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-900">
        <div className="font-semibold">
          You&apos;re using {used} of {maxLocations} allowed locations.
        </div>
        <div className="mt-1">
          You can add{" "}
          <span className="font-semibold">
            {remaining} more location{remaining === 1 ? "" : "s"}
          </span>{" "}
          on your current plan.
        </div>
      </div>
    );
  }

  // At or over limit
  return (
    <div className="mb-4 flex flex-col gap-2 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-900 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <div className="font-semibold">
          You&apos;ve reached your locations limit.
        </div>
        <div className="mt-1">
          Your plan (<span className="font-semibold">{planName}</span>) allows up
          to <span className="font-semibold">{maxLocations}</span>{" "}
          location{maxLocations === 1 ? "" : "s"}. You&apos;re currently using{" "}
          <span className="font-semibold">{used}</span>.
        </div>
        <div className="mt-1">
          To add more sites, upgrade your plan on the billing page.
        </div>
      </div>
      <form method="POST" action="/billing">
  <button
    type="submit"
    className="rounded-md bg-amber-600 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-700"
  >
    Upgrade plan
  </button>
</form>

    </div>
  );
}

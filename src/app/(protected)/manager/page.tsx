// src/app/(protected)/manager/page.tsx
"use client";

import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseBrowser";
import { getActiveOrgIdClient } from "@/lib/orgClient";
import { getActiveLocationIdClient } from "@/lib/locationClient";

import Button from "@/components/ui/button";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";

type LocationOption = {
  id: string;
  name: string;
};

type TempStats = {
  total: number;
  fails: number;
  locations: number;
  lastEntryAt: string | null; // ISO
  lastFailAt: string | null; // ISO
};

type CleaningStats = {
  total: number;
};

type TrainingStats = {
  dueSoon: number; // 0–30 days
  overdue: number; // < 0 days
};

type AllergenStats = {
  lastReviewed: string | null; // ISO
  nextDue: string | null; // ISO
  daysUntil: number | null;
  reviewer: string | null;
  isOverdue: boolean;
};

function startOfTodayISO() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

function endOfTodayISO() {
  const d = new Date();
  d.setHours(23, 59, 59, 999);
  return d.toISOString();
}

function formatISOToUK(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
}

function formatTimeHM(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return `${hh}:${mm}`;
}

export default function ManagerPage() {
  const [orgId, setOrgId] = useState<string | null>(null);

  const [locations, setLocations] = useState<LocationOption[]>([]);
  const [locationFilter, setLocationFilter] = useState<"all" | string>("all");

  const [tempStats, setTempStats] = useState<TempStats | null>(null);
  const [cleaningStats, setCleaningStats] = useState<CleaningStats | null>(
    null
  );
  const [trainingStats, setTrainingStats] = useState<TrainingStats | null>(
    null
  );
  const [allergenStats, setAllergenStats] = useState<AllergenStats | null>(
    null
  );

  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const currentLocationLabel = useMemo(() => {
    if (locationFilter === "all") return "All locations";
    const loc = locations.find((l) => l.id === locationFilter);
    return loc?.name ?? "This location";
  }, [locationFilter, locations]);

  /* ---------- boot: org + locations ---------- */

  useEffect(() => {
    (async () => {
      const id = await getActiveOrgIdClient();
      setOrgId(id ?? null);
      if (!id) return;

      // Load locations for org
      const { data, error } = await supabase
        .from("locations")
        .select("id, name")
        .eq("org_id", id)
        .order("name");

      if (!error && data) {
        setLocations(
          data.map((r: any) => ({
            id: String(r.id),
            name: r.name ?? "Unnamed",
          }))
        );
      }

      // Default filter to active location if present
      const activeLoc = await getActiveLocationIdClient();
      if (activeLoc) {
        setLocationFilter(activeLoc);
      }
    })();
  }, []);

  /* ---------- data loader ---------- */

  async function loadDashboard(
    orgIdValue: string,
    locationId: string | null
  ) {
    setLoading(true);
    setErr(null);

    const todayStart = startOfTodayISO();
    const todayEnd = endOfTodayISO();

    try {
      // Temps today
      let tempQuery = supabase
        .from("food_temp_logs")
        .select("id,status,at,area,location_id", { count: "exact" })
        .eq("org_id", orgIdValue)
        .gte("at", todayStart)
        .lte("at", todayEnd)
        .order("at", { ascending: false });

      if (locationId) {
        tempQuery = tempQuery.eq("location_id", locationId);
      }

      const { data: tData, error: tErr } = await tempQuery;
      if (tErr) throw tErr;

      const totalTemps = tData?.length ?? 0;
      const fails = (tData ?? []).filter((r: any) => r.status === "fail")
        .length;
      const locationsSet = new Set<string>();
      let lastEntryAt: string | null = null;
      let lastFailAt: string | null = null;

      (tData ?? []).forEach((r: any) => {
        if (r.area) locationsSet.add(String(r.area));
        if (!lastEntryAt) lastEntryAt = r.at as string;
        if (r.status === "fail" && !lastFailAt) {
          lastFailAt = r.at as string;
        }
      });

      setTempStats({
        total: totalTemps,
        fails,
        locations: locationsSet.size,
        lastEntryAt,
        lastFailAt,
      });

      // Cleaning runs today
      let cleaningQuery = supabase
        .from("cleaning_task_runs")
        .select("id", { count: "exact", head: true })
        .eq("org_id", orgIdValue)
        .eq("run_on", todayStart.slice(0, 10)); // yyyy-mm-dd

      if (locationId) {
        cleaningQuery = cleaningQuery.eq("location_id", locationId);
      }

      const { count: cleaningCount, error: cErr } = await cleaningQuery;
      if (cErr) throw cErr;

      setCleaningStats({ total: cleaningCount ?? 0 });

      // Training due (use same logic as reports – training_expires_on / training_expiry)
      const { data: staffData, error: sErr } = await supabase
        .from("staff")
        .select("id, name, training_expires_on, training_expiry")
        .eq("org_id", orgIdValue);

      if (sErr) throw sErr;

      const today0 = new Date();
      today0.setHours(0, 0, 0, 0);

      let dueSoon = 0;
      let overdue = 0;

      (staffData ?? []).forEach((r: any) => {
        const raw = r.training_expires_on ?? r.training_expiry ?? null;
        if (!raw) return;
        const d = new Date(raw);
        if (Number.isNaN(d.getTime())) return;
        d.setHours(0, 0, 0, 0);
        const days = Math.round((d.getTime() - today0.getTime()) / 86400000);
        if (days < 0) overdue += 1;
        else if (days <= 30) dueSoon += 1;
      });

      setTrainingStats({ dueSoon, overdue });

      // Allergen register status (from allergen_review)
      const { data: aData, error: aErr } = await supabase
        .from("allergen_review")
        .select("last_reviewed, interval_days, reviewer")
        .eq("org_id", orgIdValue)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (aErr && aErr.code !== "PGRST116") throw aErr; // ignore "no rows"

      if (!aData) {
        setAllergenStats({
          lastReviewed: null,
          nextDue: null,
          daysUntil: null,
          reviewer: null,
          isOverdue: false,
        });
      } else {
        const lr = aData.last_reviewed
          ? new Date(aData.last_reviewed)
          : null;
        let nextISO: string | null = null;
        let daysUntil: number | null = null;

        if (lr && Number.isFinite(Number(aData.interval_days))) {
          const next = new Date(
            lr.getTime() + Number(aData.interval_days) * 86400000
          );
          nextISO = next.toISOString();

          const today = new Date();
          today.setHours(0, 0, 0, 0);
          next.setHours(0, 0, 0, 0);
          daysUntil = Math.round(
            (next.getTime() - today.getTime()) / 86400000
          );
        }

        setAllergenStats({
          lastReviewed: lr ? lr.toISOString() : null,
          nextDue: nextISO,
          daysUntil,
          reviewer: aData.reviewer ?? null,
          isOverdue: daysUntil != null && daysUntil < 0,
        });
      }
    } catch (e: any) {
      console.error(e);
      setErr(e?.message ?? "Failed to load dashboard.");
      setTempStats(null);
      setCleaningStats(null);
      setTrainingStats(null);
      setAllergenStats(null);
    } finally {
      setLoading(false);
    }
  }

  // Initial + on location change
  useEffect(() => {
    if (!orgId) return;
    const locId =
      locationFilter && locationFilter !== "all" ? locationFilter : null;
    void loadDashboard(orgId, locId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orgId, locationFilter]);

  /* ---------- RENDER ---------- */

  return (
    <div className="mx-auto max-w-6xl space-y-6 rounded-3xl border border-slate-200 bg-white/80 p-4 shadow-sm backdrop-blur sm:p-6">
      <Card className="border-none bg-transparent p-0 shadow-none">
        <CardHeader className="flex flex-row items-center justify-between px-0 pb-3 pt-0">
          <CardTitle className="text-xl font-semibold text-slate-900">
            Manager Dashboard
          </CardTitle>
          <div className="text-xs text-slate-500">
            Today: {formatISOToUK(new Date().toISOString())}
          </div>
        </CardHeader>

        <div className="grid grid-cols-1 gap-3 rounded-2xl border border-slate-200 bg-white/80 p-3 backdrop-blur-sm sm:grid-cols-2 lg:grid-cols-4">
          {/* Location selector */}
          <div className="rounded-2xl border border-slate-100 bg-slate-50/60 p-3">
            <div className="mb-1 text-xs font-medium uppercase tracking-wide text-slate-500">
              Location
            </div>
            <select
              className="mt-1 w-full rounded-xl border border-slate-300 bg-white/80 px-2 py-1.5 text-sm"
              value={locationFilter}
              onChange={(e) =>
                setLocationFilter(e.target.value as "all" | string)
              }
            >
              <option value="all">All locations</option>
              {locations.map((loc) => (
                <option key={loc.id} value={loc.id}>
                  {loc.name}
                </option>
              ))}
            </select>
            <div className="mt-1 text-[11px] text-slate-500">
              Current: {currentLocationLabel}
            </div>
          </div>

          {/* Refresh button */}
          <div className="flex flex-col justify-end gap-2">
            <Button
              onClick={() => {
                if (!orgId) {
                  setErr("No organisation selected.");
                  return;
                }
                const locId =
                  locationFilter && locationFilter !== "all"
                    ? locationFilter
                    : null;
                void loadDashboard(orgId, locId);
              }}
              disabled={loading || !orgId}
              className="w-full rounded-xl bg-emerald-600 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-60"
            >
              {loading ? "Refreshing…" : "Refresh"}
            </Button>
          </div>
        </div>

        {err && (
          <div className="mt-3 rounded-xl border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900">
            {err}
          </div>
        )}
      </Card>

      {/* KPI cards row 1 */}
      <Card className="border-none bg-transparent p-0 shadow-none">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {/* Temps logged */}
          <div className="rounded-2xl border border-slate-200 bg-white/80 p-3">
            <div className="text-xs font-medium uppercase tracking-wide text-slate-500">
              Temps logged today
            </div>
            <div className="mt-1 text-2xl font-semibold text-slate-900">
              {tempStats?.total ?? 0}
            </div>
            <div className="mt-1 text-xs text-slate-500">
              Locations: {tempStats?.locations ?? 0}
            </div>
            <div className="mt-1 text-xs text-slate-500">
              Last entry: {formatTimeHM(tempStats?.lastEntryAt ?? null)}
            </div>
          </div>

          {/* Fails */}
          <div className="rounded-2xl border border-slate-200 bg-white/80 p-3">
            <div className="text-xs font-medium uppercase tracking-wide text-slate-500">
              Temperature fails
            </div>
            <div className="mt-1 text-2xl font-semibold text-red-700">
              {tempStats?.fails ?? 0}
            </div>
            <div className="mt-1 text-xs text-slate-500">
              Last fail: {formatTimeHM(tempStats?.lastFailAt ?? null)}
            </div>
          </div>

          {/* Cleaning logged */}
          <div className="rounded-2xl border border-slate-200 bg-white/80 p-3">
            <div className="text-xs font-medium uppercase tracking-wide text-slate-500">
              Cleaning tasks logged today
            </div>
            <div className="mt-1 text-2xl font-semibold text-slate-900">
              {cleaningStats?.total ?? 0}
            </div>
          </div>

          {/* Training */}
          <div className="rounded-2xl border border-slate-200 bg-white/80 p-3">
            <div className="text-xs font-medium uppercase tracking-wide text-slate-500">
              Training status
            </div>
            <div className="mt-1 text-sm text-slate-900">
              <span className="font-semibold">
                {trainingStats?.overdue ?? 0}
              </span>{" "}
              overdue
            </div>
            <div className="mt-1 text-sm text-slate-900">
              <span className="font-semibold">
                {trainingStats?.dueSoon ?? 0}
              </span>{" "}
              due in 30 days
            </div>
          </div>
        </div>
      </Card>

      {/* Row 2 – Allergen + notes */}
      <Card className="border-none bg-transparent p-0 shadow-none">
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
          {/* Allergen register */}
          <div className="rounded-2xl border border-slate-200 bg-white/90 p-4">
            <div className="text-xs font-medium uppercase tracking-wide text-slate-500">
              Allergen register
            </div>
            <div className="mt-2 text-sm text-slate-900">
              <div>
                Last reviewed:{" "}
                <span className="font-medium">
                  {formatISOToUK(allergenStats?.lastReviewed ?? null)}
                </span>
              </div>
              <div className="mt-1">
                Next due:{" "}
                <span
                  className={
                    allergenStats?.isOverdue
                      ? "font-semibold text-red-700"
                      : "font-medium"
                  }
                >
                  {formatISOToUK(allergenStats?.nextDue ?? null)}
                </span>
              </div>
              <div className="mt-1 text-xs text-slate-600">
                {allergenStats?.daysUntil != null &&
                allergenStats.daysUntil < 0
                  ? `${Math.abs(allergenStats.daysUntil)} day(s) overdue`
                  : allergenStats?.daysUntil != null
                  ? `Due in ${allergenStats.daysUntil} day(s)`
                  : "No schedule set"}
              </div>
              <div className="mt-2 text-xs text-slate-600">
                Reviewer:{" "}
                <span className="font-medium">
                  {allergenStats?.reviewer ?? "—"}
                </span>
              </div>
            </div>
          </div>

          {/* Quick guidance */}
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 lg:col-span-2">
            <div className="text-xs font-medium uppercase tracking-wide text-slate-500">
              Today’s quick checks
            </div>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-800">
              <li>
                If you see <span className="font-semibold">any fails</span>{" "}
                above, make sure corrective action is logged in the temp log.
              </li>
              <li>
                Ensure <span className="font-semibold">cleaning tasks</span>{" "}
                are fully completed before closing.
              </li>
              <li>
                Follow up with staff whose{" "}
                <span className="font-semibold">training is overdue</span> or
                due soon.
              </li>
              <li>
                If the allergen register is overdue, schedule a review today
                and reprint any customer-facing information.
              </li>
            </ul>
          </div>
        </div>
      </Card>
    </div>
  );
}

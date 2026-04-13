// src/components/LocationsManager.tsx
"use client";

import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseBrowser";
import { getActiveOrgIdClient } from "@/lib/orgClient";
import { getBillingStatusClient, type BillingStatus } from "@/lib/billingClient";

type LocationRow = {
  id: string;
  name: string;
  active: boolean;
};

type OpeningDayRow = {
  id?: string;
  org_id: string;
  location_id: string;
  weekday: number;
  is_open: boolean;
  opens_at: string | null;
  closes_at: string | null;
};

type ClosureRow = {
  id: string;
  org_id: string;
  location_id: string;
  date: string;
  reason: string | null;
};

const WEEKDAYS = [
  { value: 1, label: "Monday" },
  { value: 2, label: "Tuesday" },
  { value: 3, label: "Wednesday" },
  { value: 4, label: "Thursday" },
  { value: 5, label: "Friday" },
  { value: 6, label: "Saturday" },
  { value: 7, label: "Sunday" },
] as const;

const cls = (...parts: Array<string | false | null | undefined>) =>
  parts.filter(Boolean).join(" ");

function isoTodayLocal() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function getTodayDow1to7() {
  return ((new Date().getDay() + 6) % 7) + 1;
}

function formatDDMMYYYY(val: string | null | undefined) {
  if (!val) return "—";
  const d = new Date(val);
  if (Number.isNaN(d.getTime())) return "—";
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
}

function prettyTime(t: string | null | undefined) {
  if (!t) return null;
  return String(t).slice(0, 5);
}

function buildDefaultSchedule(orgId: string, locationId: string): OpeningDayRow[] {
  return WEEKDAYS.map((d) => ({
    org_id: orgId,
    location_id: locationId,
    weekday: d.value,
    is_open: d.value <= 6,
    opens_at: d.value <= 6 ? "09:00" : null,
    closes_at: d.value <= 6 ? "17:00" : null,
  }));
}

export default function LocationsManager() {
  const [locations, setLocations] = useState<LocationRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const [orgId, setOrgId] = useState<string | null>(null);

  const [newName, setNewName] = useState("");
  const [savingNew, setSavingNew] = useState(false);
  const [savingId, setSavingId] = useState<string | null>(null);

  const [billingLoading, setBillingLoading] = useState(true);
  const [billing, setBilling] = useState<BillingStatus | null>(null);
  const [maxAllowedLocations, setMaxAllowedLocations] = useState<number>(1);

  const [expandedLocationId, setExpandedLocationId] = useState<string | null>(null);

  const [openingDaysByLocation, setOpeningDaysByLocation] = useState<
    Record<string, OpeningDayRow[]>
  >({});
  const [closuresByLocation, setClosuresByLocation] = useState<Record<string, ClosureRow[]>>({});
  const [opsLoadingByLocation, setOpsLoadingByLocation] = useState<Record<string, boolean>>({});
  const [opsSavingByLocation, setOpsSavingByLocation] = useState<Record<string, boolean>>({});
  const [opsErrorByLocation, setOpsErrorByLocation] = useState<Record<string, string | null>>({});

  const [newClosureDateByLocation, setNewClosureDateByLocation] = useState<Record<string, string>>(
    {}
  );
  const [newClosureReasonByLocation, setNewClosureReasonByLocation] = useState<
    Record<string, string>
  >({});

  async function loadLocations() {
    setLoading(true);
    setErr(null);

    try {
      const resolvedOrgId = await getActiveOrgIdClient();
      setOrgId(resolvedOrgId ?? null);

      if (!resolvedOrgId) {
        setLocations([]);
        setErr("No organisation found for this user.");
        return;
      }

      const { data, error } = await supabase
        .from("locations")
        .select("id,name,active")
        .eq("org_id", resolvedOrgId)
        .order("created_at", { ascending: true });

      if (error) throw error;

      const rows: LocationRow[] =
        (data ?? []).map((r: any) => ({
          id: String(r.id),
          name: (r.name ?? "Unnamed").toString(),
          active: !!r.active,
        })) || [];

      setLocations(rows);
    } catch (e: any) {
      console.error(e);
      setErr(e?.message || "Failed to load locations.");
      setLocations([]);
    } finally {
      setLoading(false);
    }
  }

  async function loadBilling() {
    setBillingLoading(true);
    try {
      const bs = await getBillingStatusClient();
      setBilling(bs);

      if (bs?.status === "trialing") {
        setMaxAllowedLocations(Number.POSITIVE_INFINITY);
        return;
      }

      const max =
        bs && Number.isFinite(Number(bs.maxLocations)) && Number(bs.maxLocations) > 0
          ? Number(bs.maxLocations)
          : 1;

      setMaxAllowedLocations(max);
    } catch (e) {
      console.error("[LocationsManager] billing status failed", e);
      setBilling(null);
      setMaxAllowedLocations(1);
    } finally {
      setBillingLoading(false);
    }
  }

  async function loadLocationOperations(locationId: string) {
    if (!orgId) return;

    setOpsLoadingByLocation((prev) => ({ ...prev, [locationId]: true }));
    setOpsErrorByLocation((prev) => ({ ...prev, [locationId]: null }));

    try {
      const [{ data: openingRows, error: openingErr }, { data: closureRows, error: closureErr }] =
        await Promise.all([
          supabase
            .from("location_opening_days")
            .select("id,org_id,location_id,weekday,is_open,opens_at,closes_at")
            .eq("org_id", orgId)
            .eq("location_id", locationId)
            .order("weekday", { ascending: true }),
          supabase
            .from("location_closures")
            .select("id,org_id,location_id,date,reason")
            .eq("org_id", orgId)
            .eq("location_id", locationId)
            .order("date", { ascending: true }),
        ]);

      if (openingErr) throw openingErr;
      if (closureErr) throw closureErr;

      const openingMapped: OpeningDayRow[] =
        (openingRows ?? []).map((r: any) => ({
          id: String(r.id),
          org_id: String(r.org_id),
          location_id: String(r.location_id),
          weekday: Number(r.weekday),
          is_open: r.is_open !== false,
          opens_at: r.opens_at ? String(r.opens_at).slice(0, 5) : null,
          closes_at: r.closes_at ? String(r.closes_at).slice(0, 5) : null,
        })) || [];

      const fullOpening =
        openingMapped.length > 0
          ? WEEKDAYS.map((d) => {
              const existing = openingMapped.find((x) => x.weekday === d.value);
              return (
                existing ?? {
                  org_id: orgId,
                  location_id: locationId,
                  weekday: d.value,
                  is_open: false,
                  opens_at: null,
                  closes_at: null,
                }
              );
            })
          : buildDefaultSchedule(orgId, locationId);

      const closuresMapped: ClosureRow[] =
        (closureRows ?? []).map((r: any) => ({
          id: String(r.id),
          org_id: String(r.org_id),
          location_id: String(r.location_id),
          date: String(r.date),
          reason: r.reason ? String(r.reason) : null,
        })) || [];

      setOpeningDaysByLocation((prev) => ({ ...prev, [locationId]: fullOpening }));
      setClosuresByLocation((prev) => ({ ...prev, [locationId]: closuresMapped }));
      setNewClosureDateByLocation((prev) => ({
        ...prev,
        [locationId]: prev[locationId] ?? isoTodayLocal(),
      }));
      setNewClosureReasonByLocation((prev) => ({
        ...prev,
        [locationId]: prev[locationId] ?? "",
      }));
    } catch (e: any) {
      console.error(e);
      setOpsErrorByLocation((prev) => ({
        ...prev,
        [locationId]: e?.message || "Failed to load opening days and closures.",
      }));
    } finally {
      setOpsLoadingByLocation((prev) => ({ ...prev, [locationId]: false }));
    }
  }

  useEffect(() => {
    void loadLocations();
    void loadBilling();
  }, []);

  useEffect(() => {
    if (!expandedLocationId || !orgId) return;
    if (openingDaysByLocation[expandedLocationId] && closuresByLocation[expandedLocationId]) return;
    void loadLocationOperations(expandedLocationId);
  }, [expandedLocationId, orgId]);

  const activeCount = useMemo(() => locations.filter((l) => l.active).length, [locations]);

  const billingStatus = billing?.status ?? null;
  const isTrial = billingStatus === "trialing";

  const canAddLocation = useMemo(() => {
    if (billingLoading) return true;
    if (isTrial) return true;
    return activeCount < maxAllowedLocations;
  }, [billingLoading, isTrial, activeCount, maxAllowedLocations]);

  const isAtLimit = useMemo(() => {
    if (billingLoading) return false;
    if (isTrial) return false;
    return activeCount >= maxAllowedLocations;
  }, [billingLoading, isTrial, activeCount, maxAllowedLocations]);

  const desiredLocations = Math.max(1, activeCount + 1);
  const isCustomUpgrade = desiredLocations >= 6;

  async function handleAddLocation(e: React.FormEvent) {
    e.preventDefault();

    if (!canAddLocation) {
      alert("You’ve reached your locations limit. Upgrade your plan to add more sites.");
      return;
    }

    const name = newName.trim();
    if (!name) return;

    setSavingNew(true);
    try {
      const resolvedOrgId = orgId ?? (await getActiveOrgIdClient());
      if (!resolvedOrgId) {
        alert("No organisation found for this user.");
        return;
      }

      const { data, error } = await supabase
        .from("locations")
        .insert({
          org_id: resolvedOrgId,
          name,
          active: true,
        })
        .select("id,name,active")
        .single();

      if (error) throw error;

      const newLocationId = String((data as any).id);

      const { error: openingErr } = await supabase.from("location_opening_days").upsert(
        buildDefaultSchedule(resolvedOrgId, newLocationId).map((row) => ({
          org_id: row.org_id,
          location_id: row.location_id,
          weekday: row.weekday,
          is_open: row.is_open,
          opens_at: row.opens_at,
          closes_at: row.closes_at,
        })),
        { onConflict: "location_id,weekday" }
      );

      if (openingErr) throw openingErr;

      setOrgId(resolvedOrgId);
      setNewName("");
      await loadLocations();
      await loadBilling();
      setExpandedLocationId(newLocationId);
      await loadLocationOperations(newLocationId);
    } catch (e: any) {
      console.error(e);
      alert(e?.message || "Failed to add location.");
    } finally {
      setSavingNew(false);
    }
  }

  async function updateLocation(id: string, patch: Partial<LocationRow>) {
    setSavingId(id);
    try {
      const resolvedOrgId = orgId ?? (await getActiveOrgIdClient());
      if (!resolvedOrgId) {
        alert("No organisation found for this user.");
        return;
      }

      const { error } = await supabase
        .from("locations")
        .update({
          ...(patch.name !== undefined ? { name: patch.name } : {}),
          ...(patch.active !== undefined ? { active: patch.active } : {}),
        })
        .eq("id", id)
        .eq("org_id", resolvedOrgId);

      if (error) throw error;

      await loadLocations();
      await loadBilling();
    } catch (e: any) {
      console.error(e);
      alert(e?.message || "Failed to save changes.");
    } finally {
      setSavingId((prev) => (prev === id ? null : prev));
    }
  }

  function updateOpeningDayDraft(
    locationId: string,
    weekday: number,
    patch: Partial<OpeningDayRow>
  ) {
    if (!orgId) return;

    setOpeningDaysByLocation((prev) => {
      const current = prev[locationId] ?? buildDefaultSchedule(orgId, locationId);
      return {
        ...prev,
        [locationId]: current.map((row) =>
          row.weekday === weekday ? { ...row, ...patch } : row
        ),
      };
    });
  }

  async function saveOpeningDays(locationId: string) {
    if (!orgId) {
      setOpsErrorByLocation((prev) => ({
        ...prev,
        [locationId]: "No organisation found for this user.",
      }));
      return;
    }

    const rows = openingDaysByLocation[locationId] ?? [];
    if (!rows.length) return;

    setOpsSavingByLocation((prev) => ({ ...prev, [locationId]: true }));
    setOpsErrorByLocation((prev) => ({ ...prev, [locationId]: null }));

    try {
      const payload = rows.map((row) => ({
        org_id: orgId,
        location_id: locationId,
        weekday: row.weekday,
        is_open: row.is_open,
        opens_at: row.is_open ? row.opens_at ?? null : null,
        closes_at: row.is_open ? row.closes_at ?? null : null,
      }));

      const { error } = await supabase
        .from("location_opening_days")
        .upsert(payload, { onConflict: "location_id,weekday" });

      if (error) throw error;

      await loadLocationOperations(locationId);
    } catch (e: any) {
      console.error(e);
      setOpsErrorByLocation((prev) => ({
        ...prev,
        [locationId]: e?.message || "Failed to save opening days.",
      }));
    } finally {
      setOpsSavingByLocation((prev) => ({ ...prev, [locationId]: false }));
    }
  }

  async function addClosure(locationId: string) {
    if (!orgId) {
      setOpsErrorByLocation((prev) => ({
        ...prev,
        [locationId]: "No organisation found for this user.",
      }));
      return;
    }

    const date = (newClosureDateByLocation[locationId] ?? "").trim();
    const reason = (newClosureReasonByLocation[locationId] ?? "").trim();

    if (!date) {
      setOpsErrorByLocation((prev) => ({
        ...prev,
        [locationId]: "Pick a closure date first.",
      }));
      return;
    }

    setOpsSavingByLocation((prev) => ({ ...prev, [locationId]: true }));
    setOpsErrorByLocation((prev) => ({ ...prev, [locationId]: null }));

    try {
      const { error } = await supabase.from("location_closures").insert({
        org_id: orgId,
        location_id: locationId,
        date,
        reason: reason || null,
      });

      if (error) throw error;

      setNewClosureReasonByLocation((prev) => ({ ...prev, [locationId]: "" }));
      await loadLocationOperations(locationId);
    } catch (e: any) {
      console.error(e);
      setOpsErrorByLocation((prev) => ({
        ...prev,
        [locationId]: e?.message || "Failed to add closure date.",
      }));
    } finally {
      setOpsSavingByLocation((prev) => ({ ...prev, [locationId]: false }));
    }
  }

  async function deleteClosure(locationId: string, closureId: string) {
    if (!orgId) {
      setOpsErrorByLocation((prev) => ({
        ...prev,
        [locationId]: "No organisation found for this user.",
      }));
      return;
    }

    setOpsSavingByLocation((prev) => ({ ...prev, [locationId]: true }));
    setOpsErrorByLocation((prev) => ({ ...prev, [locationId]: null }));

    try {
      const { error } = await supabase
        .from("location_closures")
        .delete()
        .eq("id", closureId)
        .eq("org_id", orgId)
        .eq("location_id", locationId);

      if (error) throw error;

      await loadLocationOperations(locationId);
    } catch (e: any) {
      console.error(e);
      setOpsErrorByLocation((prev) => ({
        ...prev,
        [locationId]: e?.message || "Failed to delete closure.",
      }));
    } finally {
      setOpsSavingByLocation((prev) => ({ ...prev, [locationId]: false }));
    }
  }

  const upgradeAction = useMemo(() => {
    return `/api/stripe/upgrade-from-limit?desiredLocations=${encodeURIComponent(
      String(desiredLocations)
    )}&returnUrl=${encodeURIComponent("/locations")}`;
  }, [desiredLocations]);

  const planName = billing?.planName ?? null;
  const priceId = billing?.priceId ?? null;

  const limitLabel =
    !billingLoading && !Number.isFinite(maxAllowedLocations)
      ? "Unlimited"
      : String(maxAllowedLocations);

  return (
    <div className="space-y-4">
      {isAtLimit && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 shadow-sm">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="font-semibold">You’ve reached your locations limit.</div>
              <div className="mt-0.5 text-xs text-amber-800">
                Your plan covers up to <strong>{maxAllowedLocations}</strong>{" "}
                location{maxAllowedLocations === 1 ? "" : "s"}. You’re currently
                using <strong>{activeCount}</strong>.
              </div>
            </div>

            {isCustomUpgrade ? (
              <a
                href={`mailto:info@temptake.com?subject=${encodeURIComponent(
                  "TempTake Custom Pricing (6+ Sites)"
                )}&body=${encodeURIComponent(
                  `Hi TempTake,\n\nI’d like pricing for ${desiredLocations} locations.\n\nThanks`
                )}`}
                className="inline-flex h-10 items-center justify-center rounded-xl bg-amber-600 px-4 text-sm font-semibold text-white hover:bg-amber-700"
              >
                Contact for 6+ sites
              </a>
            ) : (
              <form method="POST" action={upgradeAction}>
                <button
                  type="submit"
                  className="inline-flex h-10 items-center justify-center rounded-xl bg-amber-600 px-4 text-sm font-semibold text-white hover:bg-amber-700"
                >
                  Upgrade plan
                </button>
              </form>
            )}
          </div>
        </div>
      )}

      <div className="rounded-2xl border border-white/40 bg-white/80 p-4 text-sm text-slate-700 shadow-sm backdrop-blur">
        <div className="flex flex-wrap items-center gap-2">
          <div className="font-semibold text-slate-900">Locations</div>
          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600">
            Active: {activeCount}
          </span>

          {!billingLoading && (
            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600">
              Limit: {limitLabel}
            </span>
          )}

          {!billingLoading && isTrial && (
            <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-xs text-emerald-700 border border-emerald-200">
              Trial: all features unlocked
            </span>
          )}
        </div>

        <p className="mt-2 text-xs text-slate-500">
          Add one location per site. Expand a location below to manage its weekly opening
          days and one-off closure dates.
        </p>

        {!billingLoading && (
          <p className="mt-2 text-[11px] text-slate-500">
            Billing status: <strong>{billingStatus ?? "none"}</strong>
            {planName ? (
              <>
                {" "}
                • Plan: <strong>{planName}</strong>
              </>
            ) : null}
            {priceId ? (
              <>
                {" "}
                • Price: <strong>{priceId}</strong>
              </>
            ) : null}
          </p>
        )}
      </div>

      <div className="rounded-2xl border border-white/40 bg-white/80 p-4 shadow-sm backdrop-blur">
        <form
          onSubmit={handleAddLocation}
          className="flex flex-col gap-2 sm:flex-row sm:items-end"
        >
          <div className="flex-1">
            <label className="mb-1 block text-xs font-medium text-slate-600">
              New location name
            </label>
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              className="h-10 w-full rounded-xl border border-slate-200 bg-white/90 px-3 text-sm shadow-inner"
              placeholder="e.g. Pier Vista, Kiosk, Upstairs kitchen"
              disabled={!canAddLocation}
            />
          </div>

          <button
            type="submit"
            disabled={!newName.trim() || savingNew || !canAddLocation}
            className={cls(
              "h-10 rounded-2xl px-4 text-sm font-medium text-white shadow-sm shadow-emerald-500/30",
              newName.trim() && !savingNew && canAddLocation
                ? "bg-gradient-to-r from-emerald-500 via-lime-500 to-emerald-500 hover:brightness-105"
                : "bg-slate-400 cursor-not-allowed"
            )}
            title={!canAddLocation ? "Upgrade your plan to add more locations" : undefined}
          >
            {savingNew ? "Adding…" : "Add location"}
          </button>
        </form>

        {!canAddLocation && !billingLoading && !isTrial && (
          <div className="mt-3">
            {isCustomUpgrade ? (
              <a
                href={`mailto:info@temptake.com?subject=${encodeURIComponent(
                  "TempTake Custom Pricing (6+ Sites)"
                )}&body=${encodeURIComponent(
                  `Hi TempTake,\n\nI’d like pricing for ${desiredLocations} locations.\n\nThanks`
                )}`}
                className="inline-flex h-10 items-center justify-center rounded-2xl border border-amber-300 bg-amber-50 px-4 text-sm font-semibold text-amber-900 hover:bg-amber-100"
              >
                Contact for 6+ sites
              </a>
            ) : (
              <form method="POST" action={upgradeAction}>
                <button
                  type="submit"
                  className="inline-flex h-10 items-center justify-center rounded-2xl border border-amber-300 bg-amber-50 px-4 text-sm font-semibold text-amber-900 hover:bg-amber-100"
                >
                  Upgrade plan
                </button>
              </form>
            )}
          </div>
        )}
      </div>

      <div className="rounded-2xl border border-white/40 bg-white/80 p-4 shadow-sm backdrop-blur">
        {loading ? (
          <div className="py-4 text-center text-sm text-slate-500">
            Loading locations…
          </div>
        ) : err ? (
          <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
            {err}
          </div>
        ) : locations.length === 0 ? (
          <div className="rounded-md border border-dashed border-slate-200 bg-slate-50/80 px-3 py-4 text-sm text-slate-500">
            No locations yet. Add your first location above.
          </div>
        ) : (
          <div className="space-y-3">
            {locations.map((loc) => {
              const isSaving = savingId === loc.id;
              const isExpanded = expandedLocationId === loc.id;
              const opsLoading = !!opsLoadingByLocation[loc.id];
              const opsSaving = !!opsSavingByLocation[loc.id];
              const opsError = opsErrorByLocation[loc.id] ?? null;
              const openingDays =
                openingDaysByLocation[loc.id] ??
                (orgId ? buildDefaultSchedule(orgId, loc.id) : []);
              const closures = closuresByLocation[loc.id] ?? [];

              const todayRow =
                openingDays.find((d) => d.weekday === getTodayDow1to7()) ?? null;
              const todayClosure =
                closures.find((c) => c.date === isoTodayLocal()) ?? null;

              const todaySummary = todayClosure
                ? `Closed today${todayClosure.reason ? ` · ${todayClosure.reason}` : ""}`
                : todayRow?.is_open
                ? `Open today${
                    todayRow.opens_at && todayRow.closes_at
                      ? ` · ${prettyTime(todayRow.opens_at)}–${prettyTime(todayRow.closes_at)}`
                      : ""
                  }`
                : "Closed today";

              return (
                <div
                  key={loc.id}
                  className="rounded-xl border border-slate-200 bg-white/80 shadow-sm"
                >
                  <div className="flex flex-col gap-2 px-3 py-3 sm:flex-row sm:items-center">
                    <div className="flex-1">
                      <label className="mb-1 block text-[11px] uppercase tracking-wide text-slate-400">
                        Name
                      </label>
                      <input
                        type="text"
                        defaultValue={loc.name}
                        onBlur={(e) => {
                          const name = e.target.value.trim();
                          if (name && name !== loc.name) {
                            void updateLocation(loc.id, { name });
                          } else {
                            e.target.value = loc.name;
                          }
                        }}
                        className="h-9 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm"
                      />
                    </div>

                    <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                      <span className="rounded-full bg-slate-100 px-2 py-1 text-[11px] font-semibold text-slate-700">
                        {todaySummary}
                      </span>

                      <button
                        type="button"
                        onClick={() => updateLocation(loc.id, { active: !loc.active })}
                        disabled={isSaving}
                        className={cls(
                          "inline-flex items-center rounded-full px-2 py-1 text-xs font-medium shadow-sm border",
                          loc.active
                            ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                            : "bg-slate-100 text-slate-600 border-slate-200"
                        )}
                      >
                        {loc.active ? "Active" : "Inactive"}
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          setExpandedLocationId((prev) => (prev === loc.id ? null : loc.id))
                        }
                        className="inline-flex items-center rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                      >
                        {isExpanded ? "Hide operations" : "Opening days & closures"}
                      </button>

                      {isSaving && (
                        <span className="text-[11px] text-slate-400">Saving…</span>
                      )}
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="border-t border-slate-200 px-3 py-4">
                      {opsError && (
                        <div className="mb-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                          {opsError}
                        </div>
                      )}

                      {opsLoading ? (
                        <div className="py-3 text-sm text-slate-500">
                          Loading opening days and closures…
                        </div>
                      ) : (
                        <div className="grid gap-4 lg:grid-cols-2">
                          <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-3">
                            <div className="mb-2">
                              <div className="text-sm font-semibold text-slate-900">
                                Weekly opening days
                              </div>
                              <div className="text-xs text-slate-500">
                                Set the normal weekly schedule for this location.
                              </div>
                            </div>

                            <div className="space-y-2">
                              {WEEKDAYS.map((day) => {
                                const row =
                                  openingDays.find((d) => d.weekday === day.value) ??
                                  (orgId
                                    ? {
                                        org_id: orgId,
                                        location_id: loc.id,
                                        weekday: day.value,
                                        is_open: false,
                                        opens_at: null,
                                        closes_at: null,
                                      }
                                    : null);

                                if (!row) return null;

                                return (
                                  <div
                                    key={day.value}
                                    className="rounded-xl border border-slate-200 bg-white px-3 py-2"
                                  >
                                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                                      <div className="min-w-[110px] text-sm font-semibold text-slate-900">
                                        {day.label}
                                      </div>

                                      <label className="inline-flex items-center gap-2 text-xs font-medium text-slate-700">
                                        <input
                                          type="checkbox"
                                          checked={row.is_open}
                                          onChange={(e) =>
                                            updateOpeningDayDraft(loc.id, day.value, {
                                              is_open: e.target.checked,
                                              opens_at: e.target.checked
                                                ? row.opens_at ?? "09:00"
                                                : null,
                                              closes_at: e.target.checked
                                                ? row.closes_at ?? "17:00"
                                                : null,
                                            })
                                          }
                                        />
                                        Open
                                      </label>

                                      <div className="flex items-center gap-2 sm:ml-auto">
                                        <input
                                          type="time"
                                          value={row.opens_at ?? ""}
                                          disabled={!row.is_open}
                                          onChange={(e) =>
                                            updateOpeningDayDraft(loc.id, day.value, {
                                              opens_at: e.target.value || null,
                                            })
                                          }
                                          className="h-9 rounded-xl border border-slate-200 bg-white px-2 text-sm disabled:bg-slate-100 disabled:text-slate-400"
                                        />
                                        <span className="text-slate-400">to</span>
                                        <input
                                          type="time"
                                          value={row.closes_at ?? ""}
                                          disabled={!row.is_open}
                                          onChange={(e) =>
                                            updateOpeningDayDraft(loc.id, day.value, {
                                              closes_at: e.target.value || null,
                                            })
                                          }
                                          className="h-9 rounded-xl border border-slate-200 bg-white px-2 text-sm disabled:bg-slate-100 disabled:text-slate-400"
                                        />
                                      </div>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>

                            <div className="mt-3 flex items-center justify-between gap-2">
                              <div className="text-[11px] text-slate-500">
                                One-off closures override this weekly schedule.
                              </div>
                              <button
                                type="button"
                                onClick={() => saveOpeningDays(loc.id)}
                                disabled={opsSaving || !orgId}
                                className={cls(
                                  "rounded-xl px-4 py-2 text-sm font-semibold text-white shadow-sm",
                                  opsSaving || !orgId
                                    ? "bg-slate-400 cursor-not-allowed"
                                    : "bg-slate-900 hover:bg-black"
                                )}
                              >
                                {opsSaving ? "Saving…" : "Save opening days"}
                              </button>
                            </div>
                          </div>

                          <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-3">
                            <div className="mb-2">
                              <div className="text-sm font-semibold text-slate-900">
                                One-off closures
                              </div>
                              <div className="text-xs text-slate-500">
                                Add bank holidays, refurb days, seasonal shutdowns, or surprise
                                human disasters.
                              </div>
                            </div>

                            <div className="rounded-xl border border-slate-200 bg-white p-3">
                              <div className="grid gap-2">
                                <div>
                                  <label className="mb-1 block text-xs font-medium text-slate-600">
                                    Closure date
                                  </label>
                                  <input
                                    type="date"
                                    value={newClosureDateByLocation[loc.id] ?? isoTodayLocal()}
                                    onChange={(e) =>
                                      setNewClosureDateByLocation((prev) => ({
                                        ...prev,
                                        [loc.id]: e.target.value,
                                      }))
                                    }
                                    className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm"
                                  />
                                </div>

                                <div>
                                  <label className="mb-1 block text-xs font-medium text-slate-600">
                                    Reason
                                  </label>
                                  <input
                                    type="text"
                                    value={newClosureReasonByLocation[loc.id] ?? ""}
                                    onChange={(e) =>
                                      setNewClosureReasonByLocation((prev) => ({
                                        ...prev,
                                        [loc.id]: e.target.value,
                                      }))
                                    }
                                    placeholder="e.g. Bank holiday, refurbishment, staff event"
                                    className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm"
                                  />
                                </div>

                                <button
                                  type="button"
                                  onClick={() => addClosure(loc.id)}
                                  disabled={opsSaving || !orgId}
                                  className={cls(
                                    "mt-1 rounded-xl px-4 py-2 text-sm font-semibold text-white shadow-sm",
                                    opsSaving || !orgId
                                      ? "bg-slate-400 cursor-not-allowed"
                                      : "bg-emerald-600 hover:bg-emerald-700"
                                  )}
                                >
                                  {opsSaving ? "Saving…" : "Add closure"}
                                </button>
                              </div>
                            </div>

                            <div className="mt-3 space-y-2">
                              {closures.length === 0 ? (
                                <div className="rounded-xl border border-dashed border-slate-200 bg-white px-3 py-4 text-sm text-slate-500">
                                  No one-off closures set for this location.
                                </div>
                              ) : (
                                closures.map((closure) => (
                                  <div
                                    key={closure.id}
                                    className="flex flex-col gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 sm:flex-row sm:items-center sm:justify-between"
                                  >
                                    <div className="min-w-0">
                                      <div className="text-sm font-semibold text-slate-900">
                                        {formatDDMMYYYY(closure.date)}
                                      </div>
                                      <div className="text-xs text-slate-500">
                                        {closure.reason || "Closed"}
                                      </div>
                                    </div>

                                    <button
                                      type="button"
                                      onClick={() => deleteClosure(loc.id, closure.id)}
                                      disabled={opsSaving || !orgId}
                                      className="inline-flex h-9 items-center justify-center rounded-xl border border-red-200 bg-red-50 px-3 text-xs font-semibold text-red-700 hover:bg-red-100"
                                    >
                                      Delete
                                    </button>
                                  </div>
                                ))
                              )}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
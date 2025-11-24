// src/app/reports/page.tsx
"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/lib/supabaseBrowser";
import { getActiveOrgIdClient } from "@/lib/orgClient";
import { getActiveLocationIdClient } from "@/lib/locationClient";

import Button from "@/components/ui/button";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Download, Printer } from "lucide-react";

type TempRow = {
  id: string;
  date: string; // ISO yyyy-mm-dd
  staff: string;
  location: string;
  item: string;
  temp_c: number | null;
  target_key: string | null;
  status: string | null;
};

type TeamRow = {
  id: string;
  name: string;
  email?: string | null;
  initials?: string | null;
  expires_on: string | null; // ISO date
  days_until?: number | null;
};

type AllergenRow = {
  id: string;
  reviewed_on: string | null; // ISO date
  next_due: string | null; // ISO date
  reviewer: string | null;
  days_until?: number | null;
};

type StaffReviewRow = {
  id: string;
  review_date: string; // ISO date
  created_at: string | null; // ISO datetime
  staff_name: string;
  staff_initials: string | null;
  location_name: string | null;
  reviewer_name: string | null;
  reviewer_email: string | null;
  category: string;
  rating: number;
  notes: string | null;
};

type EducationRow = {
  id: string;
  staff_name: string;
  staff_initials: string | null;
  staff_email: string | null;
  type: string | null;
  awarded_on: string | null; // ISO date
  expires_on: string | null; // ISO date
  days_until: number | null;
  status: "valid" | "expired" | "no-expiry";
  notes: string | null;
  certificate_url: string | null;
};

type LocationOption = {
  id: string;
  name: string;
};

/* ---------- Date helpers ---------- */

function toISODate(val: any): string {
  const d = new Date(val);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
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

function formatTimeHM(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return `${hh}:${mm}`;
}

/* ---------- Data fetch helpers (org + optional location) ---------- */

async function fetchTemps(
  fromISO: string,
  toISO: string,
  orgId: string,
  locationId: string | null
): Promise<TempRow[]> {
  let query = supabase
    .from("food_temp_logs")
    .select("*")
    .eq("org_id", orgId)
    .gte("at", new Date(fromISO).toISOString())
    .lte(
      "at",
      new Date(new Date(toISO).getTime() + 24 * 3600 * 1000 - 1).toISOString()
    )
    .order("at", { ascending: false })
    .limit(3000);

  if (locationId) {
    query = query.eq("location_id", locationId);
  }

  const { data, error } = await query;
  if (error) throw error;

  return (data ?? []).map((r: any) => ({
    id: String(r.id),
    date: toISODate(r.at),
    staff: r.staff_initials ?? r.initials ?? "—",
    location: r.area ?? "—",
    item: r.note ?? "—",
    temp_c: r.temp_c != null ? Number(r.temp_c) : null,
    target_key: r.target_key ?? null,
    status: r.status ?? null,
  }));
}

async function fetchCleaningCount(
  fromISO: string,
  toISO: string,
  orgId: string,
  locationId: string | null
): Promise<number> {
  let query = supabase
    .from("cleaning_task_runs")
    .select("id", { count: "exact", head: true })
    .eq("org_id", orgId)
    .gte("run_on", fromISO)
    .lte("run_on", toISO);

  if (locationId) {
    query = query.eq("location_id", locationId);
  }

  const { count, error } = await query;
  if (error || count == null) return 0;
  return count;
}

/**
 * Training due / overdue in next `withinDays` days.
 * Sourced from `trainings` table (expires_on) + `staff` table for names.
 */
async function fetchTeamDue(
  withinDays: number,
  orgId: string
): Promise<TeamRow[]> {
  const { data: tData, error: tErr } = await supabase
    .from("trainings")
    .select("id, staff_id, expires_on")
    .eq("org_id", orgId);

  if (tErr) throw tErr;

  const trainings = (tData ?? []).filter((t: any) => t.expires_on);
  if (!trainings.length) return [];

  const staffIds = Array.from(
    new Set(
      trainings
        .map((t: any) => t.staff_id)
        .filter((id: any) => typeof id === "string" || typeof id === "number")
    )
  );

  const staffMap = new Map<
    string,
    { name: string; email: string | null; initials: string | null }
  >();

  if (staffIds.length) {
    const { data: sData, error: sErr } = await supabase
      .from("staff")
      .select("id, name, email, initials")
      .in("id", staffIds);

    if (sErr) throw sErr;

    for (const s of sData ?? []) {
      staffMap.set(String(s.id), {
        name: s.name ?? "—",
        email: s.email ?? null,
        initials: s.initials ?? null,
      });
    }
  }

  const today0 = new Date();
  today0.setHours(0, 0, 0, 0);

  return trainings
    .map((r: any) => {
      const staff = staffMap.get(String(r.staff_id)) ?? {
        name: "—",
        email: null,
        initials: null,
      };

      const raw = r.expires_on ?? null;
      const iso = raw ? new Date(raw).toISOString() : null;
      const d0 = raw ? new Date(raw) : null;
      if (d0) d0.setHours(0, 0, 0, 0);

      return {
        id: String(r.id),
        name: staff.name,
        email: staff.email,
        initials: staff.initials,
        expires_on: iso,
        days_until: d0
          ? Math.round((d0.getTime() - today0.getTime()) / 86400000)
          : null,
      } as TeamRow;
    })
    .filter((r) => r.days_until != null && r.days_until <= withinDays)
    .sort((a, b) => (a.expires_on || "").localeCompare(b.expires_on || ""));
}

/**
 * Allergen reviews due/overdue from `allergen_review_log`
 * Schema: reviewed_on (date), interval_days, reviewer_name, ...
 */
async function fetchAllergenLog(
  withinDays: number,
  orgId: string
): Promise<AllergenRow[]> {
  const { data, error } = await supabase
    .from("allergen_review_log")
    .select("id, reviewed_on, interval_days, reviewer_name")
    .eq("org_id", orgId)
    .order("reviewed_on", { ascending: false })
    .limit(365);

  if (error) throw error;

  const today0 = new Date();
  today0.setHours(0, 0, 0, 0);

  return (data ?? [])
    .map((r: any) => {
      const lr = r.reviewed_on ? new Date(r.reviewed_on) : null;

      let nextISO: string | null = null;
      if (lr && Number.isFinite(Number(r.interval_days))) {
        const next = new Date(
          lr.getTime() + Number(r.interval_days) * 86400000
        );
        nextISO = next.toISOString();
      }

      const d0 = nextISO ? new Date(nextISO) : null;
      if (d0) d0.setHours(0, 0, 0, 0);

      return {
        id: String(r.id),
        reviewed_on: lr ? lr.toISOString() : null,
        next_due: nextISO,
        reviewer: r.reviewer_name ?? null,
        days_until: d0
          ? Math.round((d0.getTime() - today0.getTime()) / 86400000)
          : null,
      } as AllergenRow;
    })
    .filter((r) => r.days_until != null && r.days_until <= withinDays)
    .sort((a, b) => (a.next_due || "").localeCompare(b.next_due || ""));
}

/**
 * Manager / supervisor QC reviews from staff_reviews table.
 */
async function fetchStaffReviews(
  fromISO: string,
  toISO: string,
  orgId: string,
  locationId: string | null
): Promise<StaffReviewRow[]> {
  let query = supabase
    .from("staff_reviews")
    .select(
      `
      id,
      review_date,
      created_at,
      category,
      rating,
      notes,
      reviewer_name,
      reviewer_email,
      staff:staff_id ( name, initials ),
      location:location_id ( name )
    `
    )
    .eq("org_id", orgId)
    .gte("review_date", fromISO)
    .lte("review_date", toISO)
    .order("review_date", { ascending: false })
    .order("created_at", { ascending: false });

  if (locationId) {
    query = query.eq("location_id", locationId);
  }

  const { data, error } = await query;
  if (error) throw error;

  return (data ?? []).map((r: any) => ({
    id: String(r.id),
    review_date: toISODate(r.review_date),
    created_at: r.created_at ?? null,
    staff_name: r.staff?.name ?? "—",
    staff_initials: r.staff?.initials ?? null,
    location_name: r.location?.name ?? null,
    reviewer_name: r.reviewer_name ?? null,
    reviewer_email: r.reviewer_email ?? null,
    category: r.category ?? "—",
    rating: Number(r.rating ?? 0),
    notes: r.notes ?? null,
  }));
}

/**
 * All staff education / qualification records from `trainings`.
 * Joins to `staff` for names, email, initials.
 */
async function fetchEducation(orgId: string): Promise<EducationRow[]> {
  const { data, error } = await supabase
    .from("trainings")
    .select(
      `
      id,
      type,
      awarded_on,
      expires_on,
      certificate_url,
      notes,
      staff:staff_id ( name, email, initials )
    `
    )
    .eq("org_id", orgId)
    .order("expires_on", { ascending: true })
    .order("awarded_on", { ascending: true });

  if (error) throw error;

  const today0 = new Date();
  today0.setHours(0, 0, 0, 0);

  return (data ?? []).map((r: any) => {
    const staff = r.staff ?? {};
    const awarded = r.awarded_on ? new Date(r.awarded_on) : null;
    const expires = r.expires_on ? new Date(r.expires_on) : null;

    if (awarded) awarded.setHours(0, 0, 0, 0);
    if (expires) expires.setHours(0, 0, 0, 0);

    let daysUntil: number | null = null;
    let status: EducationRow["status"] = "no-expiry";

    if (expires) {
      daysUntil = Math.round((expires.getTime() - today0.getTime()) / 86400000);
      status = daysUntil < 0 ? "expired" : "valid";
    }

    return {
      id: String(r.id),
      staff_name: staff.name ?? "—",
      staff_initials: staff.initials ?? null,
      staff_email: staff.email ?? null,
      type: r.type ?? null,
      awarded_on: awarded ? awarded.toISOString() : null,
      expires_on: expires ? expires.toISOString() : null,
      days_until: daysUntil,
      status,
      notes: r.notes ?? null,
      certificate_url: r.certificate_url ?? null,
    } as EducationRow;
  });
}

/* ---------- CSV ---------- */

function tempsToCSV(rows: TempRow[]) {
  const header = [
    "Date",
    "Staff",
    "Location",
    "Item",
    "Temp (°C)",
    "Target",
    "Status",
  ];
  const lines = [header.join(",")];
  for (const r of rows) {
    const cells = [
      formatISOToUK(r.date),
      r.staff,
      r.location,
      (r.item ?? "").replaceAll('"', '""'),
      r.temp_c ?? "",
      r.target_key ?? "",
      r.status ?? "",
    ];
    lines.push(cells.map((c) => `"${String(c)}"`).join(","));
  }
  return lines.join("\n");
}

/* ======================================================================= */

export default function ReportsPage() {
  // dates default to last 30 days
  const today = new Date();
  const d30 = new Date(Date.now() - 29 * 24 * 3600 * 1000);
  const [from, setFrom] = useState(toISODate(d30));
  const [to, setTo] = useState(toISODate(today));

  const [orgId, setOrgId] = useState<string | null>(null);

  const [locationFilter, setLocationFilter] = useState<string | "all">("all");
  const [locations, setLocations] = useState<LocationOption[]>([]);

  const [temps, setTemps] = useState<TempRow[] | null>(null);
  const [teamDue, setTeamDue] = useState<TeamRow[] | null>(null);
  const [allergenLog, setAllergenLog] = useState<AllergenRow[] | null>(null);
  const [staffReviews, setStaffReviews] = useState<StaffReviewRow[] | null>(
    null
  );
  const [education, setEducation] = useState<EducationRow[] | null>(null);
  const [cleaningCount, setCleaningCount] = useState(0);

  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const [initialRunDone, setInitialRunDone] = useState(false);

  const printRef = useRef<HTMLDivElement>(null);

  // controls how many rows are visible
  const [showAllTemps, setShowAllTemps] = useState(false);
  const [showAllEducation, setShowAllEducation] = useState(false);

  // KPI from temps (still uses full dataset)
  const kpi = useMemo(() => {
    const t = temps ?? [];
    const fails = t.filter((r) => r.status === "fail").length;
    const locationsSet = new Set(t.map((r) => r.location));
    return { count: t.length, fails, locations: locationsSet.size };
  }, [temps]);

  // Visible temps for the table: 10 by default, all when toggled
  const visibleTemps = useMemo(() => {
    if (!temps) return null;
    if (showAllTemps) return temps;
    return temps.slice(0, 10);
  }, [temps, showAllTemps]);

  // Visible education rows: 10 by default, all when toggled
  const visibleEducation = useMemo(() => {
    if (!education) return null;
    if (showAllEducation) return education;
    return education.slice(0, 10);
  }, [education, showAllEducation]);

  /* ---------- boot: org + locations ---------- */

  useEffect(() => {
    (async () => {
      const id = await getActiveOrgIdClient();
      setOrgId(id ?? null);

      if (!id) return;

      // load locations for org
      const { data, error } = await supabase
        .from("locations")
        .select("id, name")
        .eq("org_id", id)
        .order("name");

      if (!error && data) {
        setLocations(
          data.map((r: any) => ({ id: String(r.id), name: r.name ?? "Unnamed" }))
        );
      }

      // default filter to active location if present
      const activeLoc = await getActiveLocationIdClient();
      if (activeLoc) {
        setLocationFilter(activeLoc);
      }
    })();
  }, []);

  /* ---------- runners ---------- */

  async function runRange(
    rangeFrom: string,
    rangeTo: string,
    orgIdValue: string,
    locationId: string | null,
    includeAncillary = true
  ) {
    try {
      setErr(null);
      setLoading(true);

      const [t, cleanCount, reviews] = await Promise.all([
        fetchTemps(rangeFrom, rangeTo, orgIdValue, locationId),
        fetchCleaningCount(rangeFrom, rangeTo, orgIdValue, locationId),
        fetchStaffReviews(rangeFrom, rangeTo, orgIdValue, locationId),
      ]);

      setTemps(t);
      setCleaningCount(cleanCount);
      setStaffReviews(reviews);
      setShowAllTemps(false); // reset view mode when running a new report

      if (includeAncillary) {
        const withinDays = 90;
        const [m, a, e] = await Promise.all([
          fetchTeamDue(withinDays, orgIdValue),
          fetchAllergenLog(withinDays, orgIdValue),
          fetchEducation(orgIdValue),
        ]);
        setTeamDue(m);
        setAllergenLog(a);
        setEducation(e);
        setShowAllEducation(false);
      }
    } catch (e: any) {
      setErr(e?.message ?? "Failed to run report.");
      setTemps(null);
      setTeamDue(null);
      setAllergenLog(null);
      setStaffReviews(null);
      setEducation(null);
      setCleaningCount(0);
    } finally {
      setLoading(false);
    }
  }

  async function runInstantAudit90() {
    if (!orgId) {
      setErr("No organisation selected.");
      return;
    }
    const toISO = toISODate(new Date());
    the frontconst fromISO = toISODate(new Date(Date.now() - 89 * 24 * 3600 * 1000));
    setFrom(fromISO);
    setTo(toISO);

    const locId =
      locationFilter && locationFilter !== "all" ? locationFilter : null;

    await runRange(fromISO, toISO, orgId, locId, true);
  }

  async function runCustom() {
    if (!orgId) {
      setErr("No organisation selected.");
      return;
    }
    const locId =
      locationFilter && locationFilter !== "all" ? locationFilter : null;
    await runRange(from, to, orgId, locId, true);
  }

  // initial auto-run (once org known)
  useEffect(() => {
    if (orgId && !initialRunDone) {
      runInstantAudit90();
      setInitialRunDone(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orgId]);

  function downloadCSV() {
    if (!temps?.length) return;
    const blob = new Blob([tempsToCSV(temps)], {
      type: "text/csv;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `instant-audit_${from}_${to}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function printReport() {
    window.print();
  }

  const currentLocationLabel =
    locationFilter === "all"
      ? "All locations"
      : locations.find((l) => l.id === locationFilter)?.name ?? "This location";

  /* ========================= RENDER ========================= */

  return (
    <div className="mx-auto max-w-6xl space-y-6 rounded-3xl border border-slate-200 bg-white/80 p-4 shadow-sm backdrop-blur sm:p-6">
      {/* Top controls */}
      <Card className="border-none bg-transparent p-0 shadow-none">
        <CardHeader className="flex flex-row items-center justify-between px-0 pb-3 pt-0">
          <CardTitle className="text-xl font-semibold text-slate-900">
            Reports
          </CardTitle>
        </CardHeader>

        <div className="grid grid-cols-1 gap-3 rounded-2xl border border-slate-200 bg-white/80 p-3 backdrop-blur-sm sm:grid-cols-2 lg:grid-cols-4">
          <div className="col-span-2 rounded-2xl border border-slate-100 bg-slate-50/60 p-3">
            <div className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-500">
              Custom range
            </div>
            <div className="flex flex-col items-stretch gap-2 sm:flex-row sm:items-center">
              <input
                type="date"
                value={from}
                onChange={(e) => setFrom(e.target.value)}
                className="h-10 w-full rounded-xl border border-slate-300 bg-white/80 px-3 py-2 text-sm text-slate-900"
              />
              <span className="hidden text-slate-400 sm:inline">—</span>
              <input
                type="date"
                value={to}
                onChange={(e) => setTo(e.target.value)}
                className="h-10 w-full rounded-xl border border-slate-300 bg-white/80 px-3 py-2 text-sm text-slate-900"
              />
              <Button
                onClick={runCustom}
                disabled={loading || !orgId}
                className="shrink-0 rounded-xl bg-emerald-600 px-4 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-60"
              >
                Run
              </Button>
            </div>
          </div>

          <div className="flex flex-col justify-end gap-2 sm:col-span-2 lg:col-span-2">
            <Button
              onClick={runInstantAudit90}
              disabled={loading || !orgId}
              className="w-full rounded-xl bg-emerald-600 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-60"
            >
              Instant Audit (last 90 days)
            </Button>
            <Button
              variant="outline"
              onClick={downloadCSV}
              disabled={!temps?.length}
              className="w-full rounded-xl border-slate-300 text-sm text-slate-800 hover:bg-slate-50 disabled:opacity-50"
            >
              <Download className="mr-2 h-4 w-4" /> Export CSV
            </Button>
            <Button
              variant="outline"
              onClick={printReport}
              disabled={!temps?.length}
              className="w-full rounded-xl border-slate-300 text-sm text-slate-800 hover:bg-slate-50 disabled:opacity-50"
            >
              <Printer className="mr-2 h-4 w-4" /> Print
            </Button>
          </div>
        </div>

        {/* Location on its own row */}
        <div className="mt-3 rounded-2xl border border-slate-200 bg-white/80 p-3 backdrop-blur-sm">
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
        </div>

        {err && (
          <div className="mt-3 rounded-xl border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900">
            {err}
          </div>
        )}
      </Card>

      {/* KPI cards */}
      <Card className="border-none bg-transparent p-0 shadow-none">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-2xl border border-slate-200 bg-white/80 p-3">
            <div className="text-xs font-medium uppercase tracking-wide text-slate-500">
              Entries
            </div>
            <div className="text-2xl font-semibold text-slate-900">
              {kpi.count}
            </div>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white/80 p-3">
            <div className="text-xs font-medium uppercase tracking-wide text-slate-500">
              Failures
            </div>
            <div className="text-2xl font-semibold text-slate-900">
              {kpi.fails}
            </div>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white/80 p-3">
            <div className="text-xs font-medium uppercase tracking-wide text-slate-500">
              Locations
            </div>
            <div className="text-2xl font-semibold text-slate-900">
              {kpi.locations}
            </div>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white/80 p-3">
            <div className="text-xs font-medium uppercase tracking-wide text-slate-500">
              Cleaning tasks logged
            </div>
            <div className="text-2xl font-semibold text-slate-900">
              {cleaningCount}
            </div>
          </div>
        </div>
        {!temps && !loading && (
          <div className="mt-2 text-xs text-slate-500">
            Run a report to see results.
          </div>
        )}
      </Card>

      {/* Printable content root */}
      <div ref={printRef} id="audit-print-root" className="space-y-6">
        {/* Temps table */}
        <Card className="rounded-2xl border border-slate-200 bg-white/90 p-4 text-slate-900 shadow-sm backdrop-blur-sm">
          <h3 className="mb-3 text-base font-semibold">
            Temperature Logs{" "}
            {temps ? `(${formatISOToUK(from)} → ${formatISOToUK(to)})` : ""}
          </h3>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50/80">
                <tr className="text-left text-slate-500">
                  <th className="py-2 pr-3">Date</th>
                  <th className="py-2 pr-3">Staff</th>
                  <th className="py-2 pr-3">Location</th>
                  <th className="py-2 pr-3">Item</th>
                  <th className="py-2 pr-3">Temp (°C)</th>
                  <th className="py-2 pr-3">Target</th>
                  <th className="py-2 pr-3">Status</th>
                </tr>
              </thead>
              <tbody>
                {!temps ? (
                  <tr>
                    <td colSpan={7} className="py-6 text-center text-slate-500">
                      Run a report to see results
                    </td>
                  </tr>
                ) : temps.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-6 text-center text-slate-500">
                      No results for this range / location
                    </td>
                  </tr>
                ) : (
                  visibleTemps!.map((r) => (
                    <tr key={r.id} className="border-t border-slate-100">
                      <td className="py-2 pr-3">{formatISOToUK(r.date)}</td>
                      <td className="py-2 pr-3">{r.staff}</td>
                      <td className="py-2 pr-3">{r.location}</td>
                      <td className="py-2 pr-3">{r.item}</td>
                      <td className="py-2 pr-3">{r.temp_c ?? "—"}</td>
                      <td className="py-2 pr-3">{r.target_key ?? "—"}</td>
                      <td className="py-2 pr-3">
                        {r.status ? (
                          <span
                            className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                              r.status === "pass"
                                ? "bg-emerald-100 text-emerald-800"
                                : "bg-red-100 text-red-800"
                            }`}
                          >
                            {r.status}
                          </span>
                        ) : (
                          "—"
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Row limit / view all toggle */}
          {temps && temps.length > 10 && (
            <div
              className="mt-2 flex items-center justify-between text-xs text-slate-600"
              data-hide-on-print
            >
              <div>
                Showing{" "}
                {showAllTemps ? temps.length : Math.min(10, temps.length)} of{" "}
                {temps.length} entries
              </div>
              <button
                type="button"
                onClick={() => setShowAllTemps((v) => !v)}
                className="rounded-full border border-slate-300 bg-white/80 px-3 py-1 text-xs font-medium text-slate-800 shadow-sm hover:bg-slate-50"
              >
                {showAllTemps ? "Show first 10" : "View all"}
              </button>
            </div>
          )}
        </Card>

        {/* All staff education / qualifications */}
        <Card className="rounded-2xl border border-slate-200 bg-white/90 p-4 text-slate-900 shadow-sm backdrop-blur-sm">
          <h3 className="mb-3 text-base font-semibold">
            Staff Education / Qualifications (all records)
          </h3>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50/80">
                <tr className="text-left text-slate-500">
                  <th className="py-2 pr-3">Staff</th>
                  <th className="py-2 pr-3">Initials</th>
                  <th className="py-2 pr-3">Email</th>
                  <th className="py-2 pr-3">Type</th>
                  <th className="py-2 pr-3">Awarded</th>
                  <th className="py-2 pr-3">Expires</th>
                  <th className="py-2 pr-3">Days</th>
                  <th className="py-2 pr-3">Status</th>
                  <th className="py-2 pr-3">Notes</th>
                  <th className="py-2 pr-3">Certificate</th>
                </tr>
              </thead>
              <tbody>
                {!education?.length ? (
                  <tr>
                    <td colSpan={10} className="py-6 text-center text-slate-500">
                      No education / training records for this organisation.
                    </td>
                  </tr>
                ) : (
                  visibleEducation!.map((r) => (
                    <tr key={r.id} className="border-t border-slate-100">
                      <td className="py-2 pr-3">{r.staff_name}</td>
                      <td className="py-2 pr-3">
                        {r.staff_initials ?? "—"}
                      </td>
                      <td className="py-2 pr-3">
                        {r.staff_email ?? "—"}
                      </td>
                      <td className="py-2 pr-3">{r.type ?? "—"}</td>
                      <td className="py-2 pr-3">
                        {r.awarded_on ? formatISOToUK(r.awarded_on) : "—"}
                      </td>
                      <td className="py-2 pr-3">
                        {r.expires_on ? formatISOToUK(r.expires_on) : "—"}
                      </td>
                      <td
                        className={`py-2 pr-3 ${
                          r.days_until != null && r.days_until < 0
                            ? "text-red-700"
                            : ""
                        }`}
                      >
                        {r.days_until != null ? r.days_until : "—"}
                      </td>
                      <td className="py-2 pr-3">
                        {r.status === "no-expiry"
                          ? "No expiry"
                          : r.status === "expired"
                          ? "Expired"
                          : "Valid"}
                      </td>
                      <td className="max-w-xs py-2 pr-3">
                        {r.notes ? (
                          <span className="line-clamp-2">{r.notes}</span>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td className="py-2 pr-3">
                        {r.certificate_url ? (
                          <a
                            href={r.certificate_url}
                            target="_blank"
                            rel="noreferrer"
                            className="text-xs font-medium text-sky-700 underline"
                          >
                            View
                          </a>
                        ) : (
                          "—"
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {education && education.length > 10 && (
            <div
              className="mt-2 flex items-center justify-between text-xs text-slate-600"
              data-hide-on-print
            >
              <div>
                Showing{" "}
                {showAllEducation
                  ? education.length
                  : Math.min(10, education.length)}{" "}
                of {education.length} records
              </div>
              <button
                type="button"
                onClick={() => setShowAllEducation((v) => !v)}
                className="rounded-full border border-slate-300 bg-white/80 px-3 py-1 text-xs font-medium text-slate-800 shadow-sm hover:bg-slate-50"
              >
                {showAllEducation ? "Show first 10" : "View all"}
              </button>
            </div>
          )}
        </Card>

        {/* Allergen review log / due */}
        <Card className="rounded-2xl border border-slate-200 bg-white/90 p-4 text-slate-900 shadow-sm backdrop-blur-sm">
          <h3 className="mb-3 text-base font-semibold">
            Allergen Register — reviews due/overdue (≤90 days)
          </h3>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50/80">
                <tr className="text-left text-slate-500">
                  <th className="py-2 pr-3">Reviewed on</th>
                  <th className="py-2 pr-3">Reviewer</th>
                  <th className="py-2 pr-3">Next due</th>
                  <th className="py-2 pr-3">Days</th>
                </tr>
              </thead>
              <tbody>
                {!allergenLog?.length ? (
                  <tr>
                    <td colSpan={4} className="py-6 text-center text-slate-500">
                      None due
                    </td>
                  </tr>
                ) : (
                  allergenLog.map((r) => (
                    <tr key={r.id} className="border-t border-slate-100">
                      <td className="py-2 pr-3">
                        {r.reviewed_on ? formatISOToUK(r.reviewed_on) : "—"}
                      </td>
                      <td className="py-2 pr-3">{r.reviewer ?? "—"}</td>
                      <td className="py-2 pr-3">
                        {r.next_due ? formatISOToUK(r.next_due) : "—"}
                      </td>
                      <td
                        className={`py-2 pr-3 ${
                          r.days_until != null && r.days_until < 0
                            ? "text-red-700"
                            : ""
                        }`}
                      >
                        {r.days_until != null ? r.days_until : "—"}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>

        {/* Manager / supervisor staff reviews */}
        <Card className="rounded-2xl border border-slate-200 bg-white/90 p-4 text-slate-900 shadow-sm backdrop-blur-sm">
          <h3 className="mb-1 text-base font-semibold">
            Manager / Supervisor QC Reviews
          </h3>
          <p className="mb-3 text-xs text-slate-500">
            Logged from the Manager Dashboard QC review form. Shows who was
            reviewed, who reviewed them, and the rating and notes.
          </p>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50/80">
                <tr className="text-left text-slate-500">
                  <th className="py-2 pr-3">Date</th>
                  <th className="py-2 pr-3">Time</th>
                  <th className="py-2 pr-3">Staff</th>
                  <th className="py-2 pr-3">Location</th>
                  <th className="py-2 pr-3">Reviewer</th>
                  <th className="py-2 pr-3">Category</th>
                  <th className="py-2 pr-3">Rating</th>
                  <th className="py-2 pr-3">Notes</th>
                </tr>
              </thead>
              <tbody>
                {!staffReviews?.length ? (
                  <tr>
                    <td colSpan={8} className="py-6 text-center text-slate-500">
                      No manager reviews for this range / location
                    </td>
                  </tr>
                ) : (
                  staffReviews.map((r) => (
                    <tr key={r.id} className="border-t border-slate-100">
                      <td className="py-2 pr-3">
                        {formatISOToUK(r.review_date)}
                      </td>
                      <td className="py-2 pr-3">
                        {formatTimeHM(r.created_at)}
                      </td>
                      <td className="py-2 pr-3">
                        {r.staff_name}
                        {r.staff_initials ? ` (${r.staff_initials})` : ""}
                      </td>
                      <td className="py-2 pr-3">
                        {r.location_name ?? "—"}
                      </td>
                      <td className="py-2 pr-3">
                        {r.reviewer_name || r.reviewer_email || "—"}
                      </td>
                      <td className="py-2 pr-3">{r.category}</td>
                      <td className="py-2 pr-3">{r.rating}</td>
                      <td className="max-w-xs py-2 pr-3">
                        {r.notes ? (
                          <span className="line-clamp-2">{r.notes}</span>
                        ) : (
                          "—"
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      <style jsx global>{`
        @media print {
          nav,
          header,
          footer,
          [data-hide-on-print],
          button {
            display: none !important;
          }
          a {
            text-decoration: none;
            color: inherit;
          }
          body {
            background: white !important;
          }
          .shadow-sm {
            box-shadow: none !important;
          }
        }
      `}</style>
    </div>
  );
}

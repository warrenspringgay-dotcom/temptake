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
 * Now sourced from `trainings` table (expires_on) + `staff` table for names.
 */
async function fetchTeamDue(
  withinDays: number,
  orgId: string
): Promise<TeamRow[]> {
  // 1) Get all trainings for this org that actually have an expiry date
  const { data: tData, error: tErr } = await supabase
    .from("trainings")
    .select("id, staff_id, expires_on")
    .eq("org_id", orgId);

  if (tErr) throw tErr;

  const trainings = (tData ?? []).filter((t: any) => t.expires_on);

  if (!trainings.length) return [];

  // 2) Fetch related staff records in one go
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

  // 3) Map trainings -> rows, filter by days_until
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
  const [cleaningCount, setCleaningCount] = useState(0);

  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const [initialRunDone, setInitialRunDone] = useState(false);

  const printRef = useRef<HTMLDivElement>(null);

  // KPI from temps
  const kpi = useMemo(() => {
    const t = temps ?? [];
    const fails = t.filter((r) => r.status === "fail").length;
    const locationsSet = new Set(t.map((r) => r.location));
    return { count: t.length, fails, locations: locationsSet.size };
  }, [temps]);

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

      const [t, cleanCount] = await Promise.all([
        fetchTemps(rangeFrom, rangeTo, orgIdValue, locationId),
        fetchCleaningCount(rangeFrom, rangeTo, orgIdValue, locationId),
      ]);

      setTemps(t);
      setCleaningCount(cleanCount);

      if (includeAncillary) {
        const withinDays = 90;
        const [m, a] = await Promise.all([
          fetchTeamDue(withinDays, orgIdValue),
          fetchAllergenLog(withinDays, orgIdValue),
        ]);
        setTeamDue(m);
        setAllergenLog(a);
      }
    } catch (e: any) {
      setErr(e?.message ?? "Failed to run report.");
      setTemps(null);
      setTeamDue(null);
      setAllergenLog(null);
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
    const fromISO = toISODate(new Date(Date.now() - 89 * 24 * 3600 * 1000));
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
    // For now just print the page; printable area is wrapped in printRef.
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

          {/* Location + actions */}
          <div className="flex flex-col justify-between gap-2">
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

          <div className="flex flex-col justify-end gap-2">
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
                  temps.map((r) => (
                    <tr key={r.id} className="border-t border-slate-100">
                      <td className="py-2 pr-3">
                        {formatISOToUK(r.date)}
                      </td>
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
        </Card>

        {/* Team training due */}
        <Card className="rounded-2xl border border-slate-200 bg-white/90 p-4 text-slate-900 shadow-sm backdrop-blur-sm">
          <h3 className="mb-3 text-base font-semibold">
            Team Training — due/overdue (≤90 days)
          </h3>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50/80">
                <tr className="text-left text-slate-500">
                  <th className="py-2 pr-3">Name</th>
                  <th className="py-2 pr-3">Initials</th>
                  <th className="py-2 pr-3">Email</th>
                  <th className="py-2 pr-3">Expiry</th>
                  <th className="py-2 pr-3">Days</th>
                </tr>
              </thead>
              <tbody>
                {!teamDue?.length ? (
                  <tr>
                    <td colSpan={5} className="py-6 text-center text-slate-500">
                      None due
                    </td>
                  </tr>
                ) : (
                  teamDue.map((r) => (
                    <tr key={r.id} className="border-t border-slate-100">
                      <td className="py-2 pr-3">{r.name}</td>
                      <td className="py-2 pr-3">{r.initials ?? "—"}</td>
                      <td className="py-2 pr-3">{r.email ?? "—"}</td>
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
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
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

"use client";

import React, { useMemo, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";
import Button from "@/components/ui/Button";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import { Download, Printer } from "lucide-react";

type TempRow = {
  id: string;
  date: string;
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
  expires_on: string | null;
  days_until?: number | null;
};

type AllergenRow = {
  id: string;
  item: string | null;
  location: string | null;
  next_due: string | null;
  days_until?: number | null;
};

function toISODate(val: any): string {
  const d = new Date(val);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

async function fetchTemps(fromISO: string, toISO: string): Promise<TempRow[]> {
  const { data, error } = await supabase
    .from("food_temp_logs")
    .select("*")
    .gte("at", new Date(fromISO).toISOString())
    .lte("at", new Date(new Date(toISO).getTime() + 24 * 3600 * 1000 - 1).toISOString())
    .order("at", { ascending: false })
    .limit(3000);

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

async function fetchTeamDue(withinDays: number): Promise<TeamRow[]> {
  const { data, error } = await supabase
    .from("team_members")
    // drop the non-existent training_expires_at
    .select("id, name, email, initials")
    .limit(2000);

  if (error) throw error;

  const today0 = new Date(); today0.setHours(0,0,0,0);

  return (data ?? [])
    .map((r: any) => {
      // tolerate multiple possible expiry columns
      const raw = r.training_expiry ?? r.expires_at ?? null;

      const iso = raw ? new Date(raw).toISOString() : null;
      const d0 = raw ? new Date(raw) : null;
      if (d0) d0.setHours(0,0,0,0);

      return {
        id: String(r.id ?? r.email ?? crypto.randomUUID()),
        name: r.name ?? "—",
        email: r.email ?? null,
        initials: r.initials ?? null,
        expires_on: iso,
        days_until: d0 ? Math.round((d0.getTime() - today0.getTime()) / 86400000) : null,
      };
    })
    .filter(r => r.days_until != null && r.days_until <= withinDays)
    .sort((a, b) => (a.expires_on || "").localeCompare(b.expires_on || ""));
}



async function fetchAllergensDue(withinDays: number): Promise<AllergenRow[]> {
  const { data, error } = await supabase
    .from("allergen_review")
    // remove "item", ask for name (and keep location/area)
    .select("id, last_reviewed, interval_days")
    .limit(2000);

  if (error) throw error;

  const today0 = new Date(); today0.setHours(0,0,0,0);

  return (data ?? [])
    .map((r: any) => {
      const lr = r.last_reviewed ? new Date(r.last_reviewed) : null;
      let nextISO: string | null = null;
      if (lr && Number.isFinite(Number(r.interval_days))) {
        const next = new Date(lr.getTime() + Number(r.interval_days) * 86400000);
        nextISO = next.toISOString();
      }
      const d0 = nextISO ? new Date(nextISO) : null;
      if (d0) d0.setHours(0,0,0,0);

      return {
        id: String(r.id ?? crypto.randomUUID()),
        // map: prefer r.name when r.item doesn't exist
        item: r.name ?? "—",
        // prefer explicit location, fall back to area
        location: r.location ?? r.area ?? "—",
        next_due: nextISO,
        days_until: d0 ? Math.round((d0.getTime() - today0.getTime()) / 86400000) : null,
      };
    })
    .filter(r => r.days_until != null && r.days_until <= withinDays)
    .sort((a, b) => (a.next_due || "").localeCompare(b.next_due || ""));
}


function tempsToCSV(rows: TempRow[]) {
  const header = ["Date", "Staff", "Location", "Item", "Temp (°C)", "Target", "Status"];
  const lines = [header.join(",")];
  for (const r of rows) {
    const cells = [
      r.date,
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

export default function ReportsPage() {
  // dates default to last 30 days
  const today = new Date();
  const d30 = new Date(Date.now() - 29 * 24 * 3600 * 1000);
  const [from, setFrom] = useState(toISODate(d30));
  const [to, setTo] = useState(toISODate(today));

  const [temps, setTemps] = useState<TempRow[] | null>(null);
  const [teamDue, setTeamDue] = useState<TeamRow[] | null>(null);
  const [allergenDue, setAllergenDue] = useState<AllergenRow[] | null>(null);

  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // KEEP THIS ONE ref ONLY
  const printRef = useRef<HTMLDivElement>(null);

  const kpi = useMemo(() => {
    const t = temps ?? [];
    const fails = t.filter((r) => r.status === "fail").length;
    const locations = new Set(t.map((r) => r.location)).size;
    return { count: t.length, fails, locations };
  }, [temps]);

  async function runRange(rangeFrom: string, rangeTo: string, includeAncillary = true) {
    try {
      setErr(null);
      setLoading(true);
      const t = await fetchTemps(rangeFrom, rangeTo);
      setTemps(t);

      if (includeAncillary) {
        const withinDays = 90;
        const [m, a] = await Promise.all([
          fetchTeamDue(withinDays),
          fetchAllergensDue(withinDays),
        ]);
        setTeamDue(m);
        setAllergenDue(a);
      }
    } catch (e: any) {
      setErr(e?.message ?? "Failed to run report.");
      setTemps(null);
      setTeamDue(null);
      setAllergenDue(null);
    } finally {
      setLoading(false);
    }
  }

  async function runInstantAudit90() {
    const toISO = toISODate(new Date());
    const fromISO = toISODate(new Date(Date.now() - 89 * 24 * 3600 * 1000));
    setFrom(fromISO);
    setTo(toISO);
    await runRange(fromISO, toISO, true);
  }

  async function runCustom() {
    await runRange(from, to, true);
  }

  function downloadCSV() {
    if (!temps?.length) return;
    const blob = new Blob([tempsToCSV(temps)], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `instant-audit_${from}_${to}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function printReport() {
    // If you wanted to limit printing to the ref, you’d use a lib.
    // For now just print the page.
    window.print();
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="justify-between">
          <CardTitle>Reports</CardTitle>
        </CardHeader>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="col-span-2 rounded-2xl border p-3">
            <div className="mb-2 text-xs text-gray-500">Custom range</div>
            <div className="flex items-center gap-2">
              <input
                type="date"
                value={from}
                onChange={(e) => setFrom(e.target.value)}
                className="h-10 w-full rounded-xl border px-3 py-2"
              />
              <span className="text-gray-400">—</span>
              <input
                type="date"
                value={to}
                onChange={(e) => setTo(e.target.value)}
                className="h-10 w-full rounded-xl border px-3 py-2"
              />
              <Button onClick={runCustom} disabled={loading}>Run</Button>
            </div>
          </div>

          <div className="flex flex-col justify-end gap-2">
            <Button onClick={runInstantAudit90} disabled={loading}>
              Instant Audit (last 90 days)
            </Button>
            <Button variant="outline" onClick={downloadCSV} disabled={!temps?.length}>
              <Download className="mr-2 h-4 w-4" /> Export CSV
            </Button>
            <Button variant="outline" onClick={printReport} disabled={!temps?.length}>
              <Printer className="mr-2 h-4 w-4" /> Print
            </Button>
          </div>
        </div>

        {err && (
          <div className="mt-3 rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
            {err}
          </div>
        )}
      </Card>

      <Card>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-xl border bg-white p-3">
            <div className="text-xs text-gray-500">Entries</div>
            <div className="text-2xl font-semibold">{kpi.count}</div>
          </div>
          <div className="rounded-xl border bg-white p-3">
            <div className="text-xs text-gray-500">Failures</div>
            <div className="text-2xl font-semibold">{kpi.fails}</div>
          </div>
          <div className="rounded-xl border bg-white p-3">
            <div className="text-xs text-gray-500">Locations</div>
            <div className="text-2xl font-semibold">{kpi.locations}</div>
          </div>
        </div>
      </Card>

      {/* Printable content root */}
      <div ref={printRef} id="audit-print-root" className="space-y-6">
        {/* Temps table */}
        <Card>
          <h3 className="mb-3 text-base font-medium">
            Temperature Logs {temps ? `(${from} → ${to})` : ""}
          </h3>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-left text-gray-500">
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
                  <tr><td colSpan={7} className="py-6 text-center text-gray-500">Run a report to see results</td></tr>
                ) : temps.length === 0 ? (
                  <tr><td colSpan={7} className="py-6 text-center text-gray-500">No results</td></tr>
                ) : (
                  temps.map((r) => (
                    <tr key={r.id} className="border-t">
                      <td className="py-2 pr-3">{r.date}</td>
                      <td className="py-2 pr-3">{r.staff}</td>
                      <td className="py-2 pr-3">{r.location}</td>
                      <td className="py-2 pr-3">{r.item}</td>
                      <td className="py-2 pr-3">{r.temp_c ?? "—"}</td>
                      <td className="py-2 pr-3">{r.target_key ?? "—"}</td>
                      <td className="py-2 pr-3">
                        {r.status ? (
                          <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                            r.status === "pass" ? "bg-emerald-100 text-emerald-800" : "bg-red-100 text-red-800"
                          }`}>
                            {r.status}
                          </span>
                        ) : "—"}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>

        {/* Team training due */}
        <Card>
          <h3 className="mb-3 text-base font-medium">Team Training — due/overdue (≤90 days)</h3>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-left text-gray-500">
                  <th className="py-2 pr-3">Name</th>
                  <th className="py-2 pr-3">Initials</th>
                  <th className="py-2 pr-3">Email</th>
                  <th className="py-2 pr-3">Expiry</th>
                  <th className="py-2 pr-3">Days</th>
                </tr>
              </thead>
              <tbody>
                {!teamDue?.length ? (
                  <tr><td colSpan={5} className="py-6 text-center text-gray-500">None due</td></tr>
                ) : (
                  teamDue.map((r) => (
                    <tr key={r.id} className="border-t">
                      <td className="py-2 pr-3">{r.name}</td>
                      <td className="py-2 pr-3">{r.initials ?? "—"}</td>
                      <td className="py-2 pr-3">{r.email ?? "—"}</td>
                      <td className="py-2 pr-3">{r.expires_on ? toISODate(r.expires_on) : "—"}</td>
                      <td className={`py-2 pr-3 ${r.days_until != null && r.days_until < 0 ? "text-red-700" : ""}`}>
                        {r.days_until != null ? r.days_until : "—"}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>

        {/* Allergen reviews due */}
        <Card>
          <h3 className="mb-3 text-base font-medium">Allergen Reviews — due/overdue (≤90 days)</h3>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-left text-gray-500">
                  <th className="py-2 pr-3">Item</th>
                  <th className="py-2 pr-3">Location</th>
                  <th className="py-2 pr-3">Next Due</th>
                  <th className="py-2 pr-3">Days</th>
                </tr>
              </thead>
              <tbody>
                {!allergenDue?.length ? (
                  <tr><td colSpan={4} className="py-6 text-center text-gray-500">None due</td></tr>
                ) : (
                  allergenDue.map((r) => (
                    <tr key={r.id} className="border-t">
                      <td className="py-2 pr-3">{r.item ?? "—"}</td>
                      <td className="py-2 pr-3">{r.location ?? "—"}</td>
                      <td className="py-2 pr-3">{r.next_due ? toISODate(r.next_due) : "—"}</td>
                      <td className={`py-2 pr-3 ${r.days_until != null && r.days_until < 0 ? "text-red-700" : ""}`}>
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
          nav, header, footer, [data-hide-on-print], button { display: none !important; }
          a { text-decoration: none; color: inherit; }
          body { background: white !important; }
          .shadow-sm { box-shadow: none !important; }
        }
      `}</style>
    </div>
  );
}

// src/app/(protected)/staff/page.tsx
"use client";

import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseBrowser";
import { getActiveOrgIdClient } from "@/lib/orgClient";
import { getActiveLocationIdClient } from "@/lib/locationClient";
import { logIncident } from "@/app/actions/incidents";

type TeamMember = {
  id: string;
  org_id: string;
  user_id: string | null;
  location_id: string | null;
  name: string;
  role: string | null;
  initials: string;
  streak_days: number | null;
  last_activity_on: string | null;
  training_areas: string[];
};

type StaffKpis = {
  tempsToday: number;
  temps7d: number;
  cleaningToday: number;
  streakDays: number;
  lastActivityOn: string | null;

  correctivesToday: number;
  correctives7d: number;
};

type TempCorrectiveRow = {
  id: string;
  time: string; // HH:mm
  area: string;
  item: string;
  fail_temp_c: number | null;
  action: string;
  recheck_temp_c: number | null;
  recheck_time: string | null;
  recheck_status: string | null;
};

const cls = (...p: Array<string | false | null | undefined>) =>
  p.filter(Boolean).join(" ");

function isoDate(d: Date) {
  return d.toISOString().slice(0, 10);
}

function formatTimeHM(d: Date | null | undefined): string | null {
  if (!d) return null;
  const hours = String(d.getHours()).padStart(2, "0");
  const mins = String(d.getMinutes()).padStart(2, "0");
  return `${hours}:${mins}`;
}

export default function StaffDashboardPage() {
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const [orgId, setOrgId] = useState<string | null>(null);
  const [locationId, setLocationId] = useState<string | null>(null);

  const [me, setMe] = useState<TeamMember | null>(null);
  const [kpis, setKpis] = useState<StaffKpis>({
    tempsToday: 0,
    temps7d: 0,
    cleaningToday: 0,
    streakDays: 0,
    lastActivityOn: null,
    correctivesToday: 0,
    correctives7d: 0,
  });

  const [correctivesTodayRows, setCorrectivesTodayRows] = useState<
    TempCorrectiveRow[]
  >([]);
  const [showAllCorrectives, setShowAllCorrectives] = useState(false);

  // ✅ Incident modal state
  const [incidentOpen, setIncidentOpen] = useState(false);
  const [incidentSaving, setIncidentSaving] = useState(false);
  const [incidentDate, setIncidentDate] = useState<string>(isoDate(new Date()));
  const [incidentType, setIncidentType] = useState<string>("General");
  const [incidentDetails, setIncidentDetails] = useState<string>("");
  const [incidentCorrective, setIncidentCorrective] = useState<string>("");
  const [incidentPreventive, setIncidentPreventive] = useState<string>("");
  const [incidentInitials, setIncidentInitials] = useState<string>("");

  const todayISO = useMemo(() => isoDate(new Date()), []);
  const sevenDaysAgoISO = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - 7);
    return isoDate(d);
  }, []);

  useEffect(() => {
    (async () => {
      const o = await getActiveOrgIdClient();
      const loc = await getActiveLocationIdClient();
      setOrgId(o ?? null);
      setLocationId(loc ?? null);
    })();
  }, []);

  useEffect(() => {
    if (!orgId) return;
    void loadEverything();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orgId, locationId]);

  // Auto-fill initials when opening incident modal
  useEffect(() => {
    if (!incidentOpen) return;
    if (incidentInitials.trim()) return;
    const ini = me?.initials?.trim().toUpperCase() ?? "";
    if (ini) setIncidentInitials(ini);
  }, [incidentOpen, incidentInitials, me]);

  async function loadEverything() {
    setLoading(true);
    setErr(null);

    try {
      const {
        data: { user },
        error: userErr,
      } = await supabase.auth.getUser();
      if (userErr || !user) throw new Error("Not logged in.");

      // 1) Find current team member record by user_id
      const { data: tm, error: tmErr } = await supabase
        .from("team_members")
        .select(
          "id,org_id,user_id,location_id,name,role,initials,streak_days,last_activity_on,training_areas"
        )
        .eq("org_id", orgId)
        .eq("user_id", user.id)
        .maybeSingle();

      if (tmErr) throw tmErr;
      if (!tm) {
        setMe(null);
        setKpis((k) => ({
          ...k,
          streakDays: 0,
          lastActivityOn: null,
          correctivesToday: 0,
          correctives7d: 0,
        }));
        setCorrectivesTodayRows([]);
        throw new Error(
          "Your login is not linked to a team member yet (team_members.user_id is empty)."
        );
      }

      const meRow = tm as TeamMember;
      setMe(meRow);

      const effectiveLocationId = locationId ?? meRow.location_id ?? null;

      // 2) Temps stats
      const startToday = new Date();
      startToday.setHours(0, 0, 0, 0);
      const endToday = new Date(startToday);
      endToday.setDate(endToday.getDate() + 1);

      const start7d = new Date();
      start7d.setDate(start7d.getDate() - 7);

      const [tempsTodayRes, temps7dRes] = await Promise.all([
        supabase
          .from("food_temp_logs")
          .select("id", { count: "exact", head: true })
          .eq("org_id", orgId)
          .eq("created_by", user.id)
          .eq("voided", false)
          .gte("at", startToday.toISOString())
          .lt("at", endToday.toISOString()),
        supabase
          .from("food_temp_logs")
          .select("id", { count: "exact", head: true })
          .eq("org_id", orgId)
          .eq("created_by", user.id)
          .eq("voided", false)
          .gte("at", start7d.toISOString()),
      ]);

      if (tempsTodayRes.error) throw tempsTodayRes.error;
      if (temps7dRes.error) throw temps7dRes.error;

      // 3) Cleaning runs today (TEMP HACK: match done_by text to initials)
      const cleaningTodayRes = await supabase
        .from("cleaning_task_runs")
        .select("id", { count: "exact", head: true })
        .eq("org_id", orgId)
        .eq("run_on", todayISO)
        .eq("location_id", effectiveLocationId)
        .eq("done_by", meRow.initials);

      if (cleaningTodayRes.error) throw cleaningTodayRes.error;

      // 4) Temperature corrective actions (today + last 7d)
      const [corrTodayRes, corr7dRes] = await Promise.all([
        supabase
          .from("food_temp_corrective_actions")
          .select(
            `
            id,
            action,
            recheck_temp_c,
            recheck_at,
            recheck_status,
            recorded_by,
            created_at,
            temp_log:food_temp_logs!food_temp_corrective_actions_temp_log_id_fkey(
              id,
              at,
              area,
              note,
              temp_c,
              staff_initials,
              status
            )
          `
          )
          .eq("org_id", orgId)
          .eq("location_id", effectiveLocationId)
          .gte("created_at", startToday.toISOString())
          .lt("created_at", endToday.toISOString())
          .order("created_at", { ascending: false })
          .limit(500),

        supabase
          .from("food_temp_corrective_actions")
          .select(
            `
            id,
            recorded_by,
            created_at,
            temp_log:food_temp_logs!food_temp_corrective_actions_temp_log_id_fkey(
              staff_initials
            )
          `
          )
          .eq("org_id", orgId)
          .eq("location_id", effectiveLocationId)
          .gte("created_at", start7d.toISOString())
          .order("created_at", { ascending: false })
          .limit(2000),
      ]);

      if (corrTodayRes.error) throw corrTodayRes.error;
      if (corr7dRes.error) throw corr7dRes.error;

      const myIni = meRow.initials?.trim().toUpperCase();

      const corrTodayRaw: any[] = (corrTodayRes.data as any[]) ?? [];
      const corrTodayMine = corrTodayRaw.filter((r) => {
        const recBy = (r.recorded_by ?? "").toString().trim().toUpperCase();
        const tlIni = (r.temp_log?.staff_initials ?? "")
          .toString()
          .trim()
          .toUpperCase();
        return (myIni && recBy === myIni) || (myIni && tlIni === myIni);
      });

      const corr7dRaw: any[] = (corr7dRes.data as any[]) ?? [];
      const corr7dMine = corr7dRaw.filter((r) => {
        const recBy = (r.recorded_by ?? "").toString().trim().toUpperCase();
        const tlIni = (r.temp_log?.staff_initials ?? "")
          .toString()
          .trim()
          .toUpperCase();
        return (myIni && recBy === myIni) || (myIni && tlIni === myIni);
      });

      const mappedToday: TempCorrectiveRow[] = corrTodayMine.map((r) => {
        const created = r.created_at ? new Date(r.created_at) : null;
        const recheckAt = r.recheck_at ? new Date(r.recheck_at) : null;

        const tl = r.temp_log ?? null;
        const tlAt = tl?.at ? new Date(tl.at) : null;

        return {
          id: String(r.id),
          time:
            formatTimeHM(created) ??
            (tlAt ? formatTimeHM(tlAt) ?? "—" : "—"),
          area: (tl?.area ?? "—").toString(),
          item: (tl?.note ?? "—").toString(),
          fail_temp_c: tl?.temp_c != null ? Number(tl.temp_c) : null,
          action: (r.action ?? "—").toString(),
          recheck_temp_c:
            r.recheck_temp_c != null ? Number(r.recheck_temp_c) : null,
          recheck_time: recheckAt ? formatTimeHM(recheckAt) : null,
          recheck_status: r.recheck_status ? String(r.recheck_status) : null,
        };
      });

      setCorrectivesTodayRows(mappedToday);
      setShowAllCorrectives(false);

      setKpis({
        tempsToday: tempsTodayRes.count ?? 0,
        temps7d: temps7dRes.count ?? 0,
        cleaningToday: cleaningTodayRes.count ?? 0,
        streakDays: Number(meRow.streak_days ?? 0),
        lastActivityOn: meRow.last_activity_on ?? null,
        correctivesToday: corrTodayMine.length,
        correctives7d: corr7dMine.length,
      });
    } catch (e: any) {
      console.error(e);
      setErr(e?.message ?? "Failed to load staff dashboard.");
    } finally {
      setLoading(false);
    }
  }

  // ✅ FIXED: async + no stray code after it
  async function submitIncident() {
    if (!orgId) return;

    const initials = incidentInitials.trim().toUpperCase();
    if (!initials) return alert("Enter initials.");
    if (!incidentType.trim()) return alert("Select a type.");
    if (!incidentDetails.trim()) return alert("Details are required.");

    const effectiveLocationId = locationId ?? me?.location_id ?? null;
    if (!effectiveLocationId) return alert("No location selected.");

    setIncidentSaving(true);
    try {
      const res = await logIncident({
        happened_on: incidentDate,
        location_id: effectiveLocationId,
        type: incidentType.trim(),
        details: incidentDetails.trim(),
        immediate_action: incidentCorrective.trim() || null,
        preventive_action: incidentPreventive.trim() || null,
        created_by: initials,
      });

      if (!res.ok) throw new Error(res.message);

      setIncidentDetails("");
      setIncidentCorrective("");
      setIncidentPreventive("");
      setIncidentOpen(false);

      // refresh local stats (cheap + keeps dashboard honest)
      await loadEverything();
    } catch (e: any) {
      console.error(e);
      alert(e?.message ?? "Failed to log incident.");
    } finally {
      setIncidentSaving(false);
    }
  }

  const correctivesToRender = showAllCorrectives
    ? correctivesTodayRows
    : correctivesTodayRows.slice(0, 10);

  return (
    <div className="py-3">
      <div className="text-center">
        <div className="text-[11px] font-extrabold uppercase tracking-[0.22em] text-slate-400">
          Staff dashboard
        </div>
        <h1 className="mt-1 text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
          {me?.name ?? "Your stats"}
        </h1>
      </div>

      {err && (
        <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-800">
          {err}
        </div>
      )}

      <section className="mt-4 rounded-3xl border border-white/40 bg-white/80 p-3 sm:p-4 shadow-lg shadow-slate-900/5 backdrop-blur">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-2xl border border-slate-200 bg-white/90 p-4 shadow-sm">
            <div className="text-[11px] font-extrabold uppercase tracking-[0.22em] text-slate-500">
              Streak
            </div>
            <div className="mt-2 text-3xl font-extrabold text-slate-900">
              {kpis.streakDays}
            </div>
            <div className="mt-2 text-[11px] font-medium text-slate-600">
              Days
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white/90 p-4 shadow-sm">
            <div className="text-[11px] font-extrabold uppercase tracking-[0.22em] text-slate-500">
              Temps today
            </div>
            <div className="mt-2 text-3xl font-extrabold text-slate-900">
              {kpis.tempsToday}
            </div>
            <div className="mt-2 text-[11px] font-medium text-slate-600">
              Last 7d: <span className="font-semibold">{kpis.temps7d}</span>
            </div>

            <div className="mt-1 text-[11px] font-medium text-slate-600">
              Correctives today:{" "}
              <span className="font-semibold">{kpis.correctivesToday}</span> ·
              7d: <span className="font-semibold">{kpis.correctives7d}</span>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white/90 p-4 shadow-sm">
            <div className="text-[11px] font-extrabold uppercase tracking-[0.22em] text-slate-500">
              Cleaning today
            </div>
            <div className="mt-2 text-3xl font-extrabold text-slate-900">
              {kpis.cleaningToday}
            </div>
            <div className="mt-2 text-[11px] font-medium text-slate-600">
              Based on initials match
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white/90 p-4 shadow-sm">
            <div className="text-[11px] font-extrabold uppercase tracking-[0.22em] text-slate-500">
              Last activity
            </div>
            <div className="mt-2 text-xl font-extrabold text-slate-900">
              {kpis.lastActivityOn ?? "—"}
            </div>
            <div className="mt-2 text-[11px] font-medium text-slate-600">
              From team member record
            </div>
          </div>
        </div>
      </section>

      <section className="mt-4 rounded-3xl border border-white/40 bg-white/80 p-4 shadow-md shadow-slate-900/5 backdrop-blur">
        <div className="mb-3">
          <div className="text-[11px] font-extrabold uppercase tracking-[0.22em] text-slate-400">
            Training areas
          </div>
          <div className="mt-0.5 text-sm font-semibold text-slate-900">
            What you’re assigned to
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {(me?.training_areas ?? []).length === 0 ? (
            <div className="text-sm text-slate-600">No training areas set.</div>
          ) : (
            me!.training_areas.map((a) => (
              <span
                key={a}
                className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-700"
              >
                {a}
              </span>
            ))
          )}
        </div>
      </section>

      <section className="mt-4 rounded-3xl border border-white/40 bg-white/80 p-4 shadow-md shadow-slate-900/5 backdrop-blur">
        <div className="mb-3">
          <div className="text-[11px] font-extrabold uppercase tracking-[0.22em] text-slate-400">
            Temperature corrective actions
          </div>
          <div className="mt-0.5 text-sm font-semibold text-slate-900">
            Your corrective actions (today)
          </div>
        </div>

        <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white/90">
          <table className="min-w-full text-xs">
            <thead className="bg-slate-50">
              <tr className="text-left text-slate-500">
                <th className="px-3 py-2">Time</th>
                <th className="px-3 py-2">Area</th>
                <th className="px-3 py-2">Item</th>
                <th className="px-3 py-2">Fail temp</th>
                <th className="px-3 py-2">Corrective action</th>
                <th className="px-3 py-2">Re-check</th>
                <th className="px-3 py-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {correctivesToRender.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    className="px-3 py-4 text-center text-slate-500"
                  >
                    No temperature corrective actions logged today.
                  </td>
                </tr>
              ) : (
                correctivesToRender.map((r) => (
                  <tr
                    key={r.id}
                    className="border-t border-slate-100 text-slate-800"
                  >
                    <td className="px-3 py-2 whitespace-nowrap">{r.time}</td>
                    <td className="px-3 py-2">{r.area}</td>
                    <td className="px-3 py-2">{r.item}</td>
                    <td className="px-3 py-2 whitespace-nowrap">
                      {r.fail_temp_c != null ? `${r.fail_temp_c}°C` : "—"}
                    </td>
                    <td className="px-3 py-2 max-w-[22rem] truncate">
                      {r.action}
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap">
                      {r.recheck_temp_c != null ? `${r.recheck_temp_c}°C` : "—"}
                      {r.recheck_time ? ` (${r.recheck_time})` : ""}
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap">
                      {r.recheck_status ? (
                        <span
                          className={cls(
                            "inline-flex rounded-full px-2 py-[1px] text-[10px] font-extrabold uppercase",
                            r.recheck_status === "pass"
                              ? "bg-emerald-100 text-emerald-800"
                              : "bg-red-100 text-red-800"
                          )}
                        >
                          {r.recheck_status}
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

        {correctivesTodayRows.length > 10 && (
          <div className="mt-2 flex items-center justify-between text-xs">
            <div className="text-slate-500">
              Showing {showAllCorrectives ? correctivesTodayRows.length : 10} of{" "}
              <span className="font-semibold">
                {correctivesTodayRows.length}
              </span>
            </div>
            <button
              type="button"
              onClick={() => setShowAllCorrectives((v) => !v)}
              className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 font-semibold text-slate-700 hover:bg-slate-50"
            >
              {showAllCorrectives ? "Show less" : "Show all"}
            </button>
          </div>
        )}
      </section>

      <div className="mt-4 flex items-center justify-end gap-2">
        <button
          type="button"
          onClick={() => {
            setIncidentDate(isoDate(new Date()));
            setIncidentType("General");
            setIncidentDetails("");
            setIncidentCorrective("");
            setIncidentPreventive("");
            setIncidentOpen(true);
          }}
          disabled={loading || !orgId}
          className={cls(
            "rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50",
            (loading || !orgId) && "opacity-60"
          )}
        >
          Log incident
        </button>

        <button
          type="button"
          onClick={loadEverything}
          disabled={loading || !orgId}
          className={cls(
            "rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700",
            (loading || !orgId) && "opacity-60"
          )}
        >
          {loading ? "Refreshing…" : "Refresh"}
        </button>
      </div>

      {/* ✅ Incident modal */}
      {incidentOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/30 overflow-y-auto overscroll-contain p-3 sm:p-4"
          onClick={() => setIncidentOpen(false)}
        >
          <div
            className="mx-auto my-6 w-full max-w-xl rounded-2xl border border-slate-200 bg-white/90 p-4 text-slate-900 shadow-lg backdrop-blur"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-3 flex items-center justify-between">
              <div>
                <div className="text-base font-semibold">Log incident</div>
                <div className="mt-0.5 text-xs text-slate-500">
                  This creates an entry in the Incident log (separate to temps).
                </div>
              </div>
              <button
                onClick={() => setIncidentOpen(false)}
                className="rounded-md p-2 text-slate-500 hover:bg-slate-100"
                aria-label="Close"
              >
                ✕
              </button>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs text-slate-500">Date</label>
                <input
                  type="date"
                  value={incidentDate}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setIncidentDate(e.target.value)
                  }
                  className="h-10 w-full rounded-xl border border-slate-300 bg-white/80 px-3 text-sm"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs text-slate-500">
                  Initials
                </label>
                <input
                  value={incidentInitials}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setIncidentInitials(e.target.value.toUpperCase())
                  }
                  placeholder="WS"
                  className="h-10 w-full rounded-xl border border-slate-300 bg-white/80 px-3 text-sm"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="mb-1 block text-xs text-slate-500">Type</label>
                <select
                  value={incidentType}
                  onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                    setIncidentType(e.target.value)
                  }
                  className="h-10 w-full rounded-xl border border-slate-300 bg-white/80 px-3 text-sm"
                >
                  <option value="General">General</option>
                  <option value="Cleaning issue">Cleaning issue</option>
                  <option value="Equipment failure">Equipment failure</option>
                  <option value="Contamination risk">Contamination risk</option>
                  <option value="Pest / contamination">Pest / contamination</option>
                  <option value="Injury / accident">Injury / accident</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div className="sm:col-span-2">
                <label className="mb-1 block text-xs text-slate-500">
                  Details
                </label>
                <textarea
                  value={incidentDetails}
                  onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                    setIncidentDetails(e.target.value)
                  }
                  placeholder="What happened?"
                  className="min-h-[90px] w-full rounded-xl border border-slate-300 bg-white/80 px-3 py-2 text-sm"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="mb-1 block text-xs text-slate-500">
                  Corrective action (recommended)
                </label>
                <textarea
                  value={incidentCorrective}
                  onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                    setIncidentCorrective(e.target.value)
                  }
                  placeholder="What did you do to fix it?"
                  className="min-h-[70px] w-full rounded-xl border border-slate-300 bg-white/80 px-3 py-2 text-sm"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="mb-1 block text-xs text-slate-500">
                  Preventive action (optional)
                </label>
                <textarea
                  value={incidentPreventive}
                  onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                    setIncidentPreventive(e.target.value)
                  }
                  placeholder="What will stop it happening again?"
                  className="min-h-[70px] w-full rounded-xl border border-slate-300 bg-white/80 px-3 py-2 text-sm"
                />
              </div>
            </div>

            <div className="mt-4 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setIncidentOpen(false)}
                className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={submitIncident}
                disabled={incidentSaving}
                className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700 disabled:opacity-60"
              >
                {incidentSaving ? "Saving…" : "Save incident"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

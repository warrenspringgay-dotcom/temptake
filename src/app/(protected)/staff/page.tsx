// src/app/staff/page.tsx
"use client";

import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseBrowser";
import { getActiveOrgIdClient } from "@/lib/orgClient";
import { getActiveLocationIdClient } from "@/lib/locationClient";

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
};

const cls = (...p: Array<string | false | null | undefined>) => p.filter(Boolean).join(" ");

function isoDate(d: Date) {
  return d.toISOString().slice(0, 10);
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
  });

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

  async function loadEverything() {
    setLoading(true);
    setErr(null);

    try {
      const {
        data: { user },
        error: userErr,
      } = await supabase.auth.getUser();
      if (userErr || !user) {
        throw new Error("Not logged in.");
      }

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
        setKpis((k) => ({ ...k, streakDays: 0, lastActivityOn: null }));
        throw new Error(
          "Your login is not linked to a team member yet (team_members.user_id is empty)."
        );
      }

      const meRow = tm as TeamMember;
      setMe(meRow);

      // 2) Temps stats
      // Today range in UTC-ish: easiest is date boundary by ISO date on 'at'
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
      // This is only as accurate as people being consistent with initials.
      const cleaningTodayRes = await supabase
        .from("cleaning_task_runs")
        .select("id", { count: "exact", head: true })
        .eq("org_id", orgId)
        .eq("run_on", todayISO)
        .eq("location_id", locationId ?? meRow.location_id ?? null)
        .eq("done_by", meRow.initials);

      if (cleaningTodayRes.error) throw cleaningTodayRes.error;

      setKpis({
        tempsToday: tempsTodayRes.count ?? 0,
        temps7d: temps7dRes.count ?? 0,
        cleaningToday: cleaningTodayRes.count ?? 0,
        streakDays: Number(meRow.streak_days ?? 0),
        lastActivityOn: meRow.last_activity_on ?? null,
      });
    } catch (e: any) {
      console.error(e);
      setErr(e?.message ?? "Failed to load staff dashboard.");
    } finally {
      setLoading(false);
    }
  }

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
            <div className="mt-2 text-[11px] font-medium text-slate-600">Days</div>
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

      <div className="mt-4 flex items-center justify-end gap-2">
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
    </div>
  );
}

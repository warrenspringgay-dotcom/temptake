// src/components/Leaderboard.tsx
"use client";

import React, { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseBrowser";
import { getActiveOrgIdClient } from "@/lib/orgClient";

type LeaderboardEntry = {
  name: string;
  total_points: number;
  cleaning_points: number;
  temp_points: number;
};

type LeaderboardRow = {
  display_name: string | null;
  points: number | null;
  cleaning_count: number | null;
  temp_logs_count: number | null;
  total_points: number | null;
};

export default function Leaderboard() {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      setLoading(true);
      setErrorMsg(null);
      try {
        const orgId = await getActiveOrgIdClient();
        if (!orgId) {
          setErrorMsg("No organisation found.");
          setEntries([]);
          return;
        }

        const { data, error } = await supabase
          .from("leaderboard")
          .select(
            "display_name, points, cleaning_count, temp_logs_count, total_points"
          )
          .eq("org_id", orgId)
          .order("total_points", { ascending: false })
          .limit(20);

        if (error) throw error;

        const rows = (data ?? []) as LeaderboardRow[];

        const mapped: LeaderboardEntry[] = rows.map((r) => ({
          name: r.display_name || "Team member",
          total_points: Number(r.total_points ?? r.points ?? 0),
          cleaning_points: Number(r.cleaning_count ?? 0) * 10,
          temp_points: Number(r.temp_logs_count ?? 0) * 5,
        }));

        setEntries(mapped);
      } catch (e: any) {
        console.error(e);
        setErrorMsg(e?.message ?? "Failed to load leaderboard");
        setEntries([]);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const hasData = entries.length > 0;

  return (
    <div className="space-y-4 rounded-3xl border border-slate-200 bg-white/80 p-4 sm:p-6 shadow-sm backdrop-blur">
      <header className="space-y-1">
        <div className="inline-flex items-center gap-2 rounded-full bg-amber-50 px-3 py-1 text-xs font-medium text-amber-800">
          <span>🏆</span>
          <span>Leaderboard</span>
        </div>
        <h1 className="text-lg font-semibold text-slate-900">Leaderboard</h1>
        <p className="text-sm text-slate-600">
          Rewarding your team&apos;s effort in keeping the kitchen safe and
          compliant.
        </p>
      </header>

      <main className="rounded-2xl border border-slate-200 bg-white/80 p-4 shadow-sm backdrop-blur-sm">
        {loading ? (
          <div className="flex h-40 items-center justify-center text-sm text-slate-500">
            Loading…
          </div>
        ) : errorMsg ? (
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
            {errorMsg}
          </div>
        ) : !hasData ? (
          <div className="flex h-40 flex-col items-center justify-center text-sm text-slate-500">
            <p>No points yet.</p>
            <p className="mt-1 text-xs text-slate-400">
              Staff earn points automatically when they complete cleaning tasks
              or log food temperatures.
            </p>
          </div>
        ) : (
          <>
            {/* Desktop table */}
            <div className="hidden md:block">
              <table className="w-full table-fixed text-sm">
                <thead className="bg-slate-50/80 text-slate-500">
                  <tr>
                    <th className="w-16 px-3 py-2 text-left">Rank</th>
                    <th className="px-3 py-2 text-left">Name</th>
                    <th className="w-28 px-3 py-2 text-right">
                      Cleaning points
                    </th>
                    <th className="w-28 px-3 py-2 text-right">
                      Temp log points
                    </th>
                    <th className="w-28 px-3 py-2 text-right">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {entries.map((e, idx) => (
                    <tr
                      key={e.name + idx}
                      className="border-t border-slate-100"
                    >
                      <td className="px-3 py-2 text-left font-medium text-slate-700">
                        #{idx + 1}
                      </td>
                      <td className="px-3 py-2 text-slate-900">{e.name}</td>
                      <td className="px-3 py-2 text-right text-emerald-700">
                        {e.cleaning_points}
                      </td>
                      <td className="px-3 py-2 text-right text-sky-700">
                        {e.temp_points}
                      </td>
                      <td className="px-3 py-2 text-right font-semibold text-slate-900">
                        {e.total_points}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile cards */}
            <div className="space-y-2 md:hidden">
              {entries.map((e, idx) => (
                <div
                  key={e.name + idx}
                  className="flex items-center justify-between rounded-xl border border-slate-200 bg-white/90 px-3 py-2 text-sm shadow-sm"
                >
                  <div>
                    <div className="text-xs text-slate-400">
                      Rank #{idx + 1}
                    </div>
                    <div className="text-sm font-medium text-slate-900">
                      {e.name}
                    </div>
                    <div className="mt-1 flex gap-3 text-xs text-slate-600">
                      <span>Cleaning: {e.cleaning_points}</span>
                      <span>Temps: {e.temp_points}</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-[11px] uppercase text-slate-400">
                      Total
                    </div>
                    <div className="text-lg font-semibold text-slate-900">
                      {e.total_points}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </main>

      <p className="text-xs text-slate-500">
        Points are updated automatically when staff complete cleaning tasks or
        log food temperatures.
      </p>
    </div>
  );
}

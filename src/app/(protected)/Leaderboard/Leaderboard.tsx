// src/components/Leaderboard.tsx
"use client";

import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseBrowser";
import { getActiveOrgIdClient } from "@/lib/orgClient";
import QuickActionsFab from "@/components/QuickActionsFab";

type LeaderboardEntry = {
  name: string;
  total_points: number;
  cleaning_points: number;
  temp_points: number;
};

export default function Leaderboard() {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const orgId = await getActiveOrgIdClient();
        if (!orgId) {
          setEntries([]);
          setLoading(false);
          return;
        }

        const { data, error } = await supabase
          .from("leaderboard")
          .select("display_name, points, cleaning_count, temp_logs_count")
          .eq("org_id", orgId)
          .order("points", { ascending: false });

        if (error) throw error;

        const mapped: LeaderboardEntry[] =
          (data ?? []).map((row: any) => ({
            name: row.display_name ?? "Unknown",
            total_points: Number(row.points ?? 0),
            cleaning_points: Number(row.cleaning_count ?? 0),
            temp_points: Number(row.temp_logs_count ?? 0),
          })) ?? [];

        setEntries(mapped);
      } catch (e: any) {
        console.error(e);
        alert(e?.message ?? "Failed to load leaderboard");
        setEntries([]);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const employeeOfMonth = useMemo(() => {
    if (!entries.length) return null;
    return entries.reduce((best, e) =>
      e.total_points > best.total_points ? e : best
    );
  }, [entries]);

  const rankBadge = (index: number) => {
    if (index === 0) {
      return "bg-amber-500 text-white";
    }
    if (index === 1) {
      return "bg-slate-700 text-white";
    }
    if (index === 2) {
      return "bg-orange-400 text-white";
    }
    return "bg-slate-900 text-white";
  };

  const rowHighlight = (index: number) => {
    if (index === 0) return "border-amber-300 bg-amber-50/90";
    if (index === 1) return "border-slate-200 bg-slate-50/90";
    if (index === 2) return "border-orange-200 bg-orange-50/90";
    return "border-slate-100 bg-white/90";
  };

  return (
    <>
      <div className="max-w-5xl mx-auto px-3 sm:px-4 py-4 space-y-4">
        {/* Header + Employee of the month card */}
        <div className="flex flex-wrap items-start gap-4">
          <div className="flex-1 min-w-[220px]">
            <h1 className="text-xl font-semibold text-slate-900 flex items-center gap-2">
              <span className="text-amber-500 text-2xl">🏆</span>
              Leaderboard
            </h1>
            <p className="mt-1 text-sm text-slate-600">
              Rewarding your team&rsquo;s effort in keeping the kitchen safe and
              compliant.
            </p>
          </div>

          {employeeOfMonth && (
            <div className="min-w-[230px] rounded-2xl border border-amber-200 bg-amber-50/90 px-4 py-3 text-sm text-amber-900 shadow-sm">
              <div className="flex items-center justify-between gap-2">
                <div className="font-semibold text-amber-900">
                  Employee of the month
                </div>
                <span className="text-lg">👑</span>
              </div>
              <div className="mt-1 text-base font-bold">
                {employeeOfMonth.name}
              </div>
              <div className="mt-1 text-xs text-amber-800/90">
                Total points so far:{" "}
                <span className="font-semibold">
                  {employeeOfMonth.total_points}
                </span>
              </div>
              <div className="mt-1 text-xs text-amber-800/90">
                Cleaning tasks:{" "}
                <span className="font-semibold">
                  {employeeOfMonth.cleaning_points}
                </span>
                {" • "}
                Temp logs:{" "}
                <span className="font-semibold">
                  {employeeOfMonth.temp_points}
                </span>
              </div>
              <div className="mt-2 rounded-xl bg-amber-100/80 px-3 py-1 text-[11px]">
                Based on completed cleaning tasks and logged food temperatures
                this month.
              </div>
            </div>
          )}
        </div>

        {/* Main leaderboard card */}
        <div className="rounded-3xl border border-white/60 bg-white/80 shadow-lg backdrop-blur-md p-4 sm:p-5">
          <div className="mb-3 flex items-center justify-between gap-2">
            <div className="text-sm font-semibold text-slate-900">
              Team standings
            </div>
            <span className="inline-flex items-center rounded-full border border-slate-200 bg-white/80 px-3 py-1 text-[11px] font-medium text-slate-600">
              This month
            </span>
          </div>

          {loading ? (
            <div className="py-10 text-center text-sm text-slate-500">
              Loading…
            </div>
          ) : entries.length === 0 ? (
            <div className="py-10 text-center text-sm text-slate-500">
              No points yet. When your team completes cleaning tasks or logs
              temperatures, they&rsquo;ll appear here.
            </div>
          ) : (
            <div className="space-y-3">
              {entries.map((e, idx) => (
                <div
                  key={e.name + idx}
                  className={`flex items-center gap-3 rounded-2xl px-3 py-2 shadow-sm ${rowHighlight(
                    idx
                  )}`}
                >
                  <div
                    className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold ${rankBadge(
                      idx
                    )}`}
                  >
                    {idx + 1}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <div className="truncate text-sm font-semibold text-slate-900">
                        {e.name}
                      </div>
                      <div className="text-sm font-semibold text-slate-900">
                        {e.total_points} pts
                      </div>
                    </div>
                    <div className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-slate-600">
                      <span>
                        🧽 Cleaning:{" "}
                        <span className="font-medium">
                          {e.cleaning_points}
                        </span>
                      </span>
                      <span>
                        🌡️ Temps logged:{" "}
                        <span className="font-medium">{e.temp_points}</span>
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="mt-3 inline-flex flex-wrap items-center gap-2 rounded-xl bg-white/80 px-4 py-2 text-xs text-slate-700 border border-amber-200">
            <span className="font-semibold mr-2">Points key:</span>
            <span>✅ 1 point per completed cleaning task</span>
            <span className="mx-1 text-slate-400">•</span>
            <span>🌡️ 1 point per food temperature logged</span>
          </div>

          <p className="mt-4 text-center text-xs text-slate-500">
            Points are updated automatically when staff complete cleaning tasks
            or log food temperatures.
          </p>
        </div>
      </div>

      {/* FAB fixed bottom-right on this page too */}
      <QuickActionsFab />
    </>
  );
}

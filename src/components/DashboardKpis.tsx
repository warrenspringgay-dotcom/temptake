"use client";

import React, { useEffect, useState } from "react";
import { cn } from "@/lib/cn";
import { getDashboardKpis, type DashboardKpis } from "@/app/actions/kpis";

const empty: DashboardKpis = {
  todayCount: 0,
  rolling7dCount: 0,
  uniqueStaff7d: 0,
  topLoggerLabel: "—",
};

export default function DashboardKpis() {
  const [kpis, setKpis] = useState<DashboardKpis>(empty);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let abort = false;
    (async () => {
      try {
        const res = await getDashboardKpis();
        if (!abort) setKpis(res);
      } catch {
        if (!abort) setKpis(empty);
      } finally {
        if (!abort) setLoading(false);
      }
    })();
    return () => {
      abort = true;
    };
  }, []);

  const box = "rounded-2xl border bg-white p-4 shadow-sm";
  const label = "text-xs text-gray-500";
  const big = "text-2xl font-semibold";
  const sub = "text-sm text-gray-500";

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <div className={box}>
        <div className={label}>Entries today</div>
        <div className={big}>{loading ? "…" : kpis.todayCount}</div>
        <div className={sub}>Food temp logs</div>
      </div>

      <div className={box}>
        <div className={label}>7-day entries</div>
        <div className={big}>{loading ? "…" : kpis.rolling7dCount}</div>
        <div className={sub}>Last 7 days</div>
      </div>

      <div className={box}>
        <div className={label}>Active staff (7d)</div>
        <div className={big}>{loading ? "…" : kpis.uniqueStaff7d}</div>
        <div className={sub}>Unique initials</div>
      </div>

      <div className={box}>
        <div className={label}>Top logger (30d)</div>
        <div className={big}>{loading ? "…" : kpis.topLoggerLabel}</div>
        <div className={sub}>Most entries</div>
      </div>
    </div>
  );
}

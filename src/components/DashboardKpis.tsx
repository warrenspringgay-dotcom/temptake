// src/components/DashboardKpis.tsx
"use client";

import React, { useEffect, useMemo, useState } from "react";

type LocalTempRow = {
  id: string;
  date: string | null;
  staff_initials: string | null;
  location: string | null;
  item: string | null;
  target_key: string | null;
  temp_c: number | null;
  status: "pass" | "fail" | null;
};

type DashboardKpis = {
  todayCount: number;
  weekCount: number;
  failsCount: number;
  topLogger: string | null;
};

const LS_KEY = "tt_temp_logs";

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function lsGet<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function Card({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border bg-white p-4 shadow-sm">
      {children}
    </div>
  );
}

export default function DashboardKpis({ className = "" }: { className?: string }) {
  const [rows, setRows] = useState<LocalTempRow[]>([]);

  // Bootstrap from localStorage and keep in sync if other tabs update
  useEffect(() => {
    setRows(lsGet<LocalTempRow[]>(LS_KEY, []));
    function onStorage(e: StorageEvent) {
      if (e.key === LS_KEY) {
        setRows(lsGet<LocalTempRow[]>(LS_KEY, []));
      }
    }
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const kpis: DashboardKpis = useMemo(() => {
    const today = todayISO();
    const end = new Date(today + "T00:00:00Z").getTime();
    const start = end - 6 * 24 * 60 * 60 * 1000; // inclusive window (7 days)

    let todayCount = 0;
    let weekCount = 0;
    let failsCount = 0;
    const byInitials: Record<string, number> = {};

    for (const r of rows) {
      if (!r.date) continue;
      if (r.date === today) todayCount++;

      const t = new Date(r.date + "T00:00:00Z").getTime();
      if (t >= start && t <= end) weekCount++;

      if (r.status === "fail") failsCount++;

      const ini = (r.staff_initials ?? "").toUpperCase();
      if (ini) byInitials[ini] = (byInitials[ini] ?? 0) + 1;
    }

    let topLogger: string | null = null;
    let max = -1;
    for (const [ini, count] of Object.entries(byInitials)) {
      if (count > max) {
        max = count;
        topLogger = ini;
      }
    }

    return { todayCount, weekCount, failsCount, topLogger };
  }, [rows]);

  return (
    <div className={`grid grid-cols-1 gap-3 sm:grid-cols-4 ${className}`}>
      <Card>
        <div className="text-xs text-gray-500">Logs today</div>
        <div className="text-3xl font-semibold">{kpis.todayCount}</div>
      </Card>
      <Card>
        <div className="text-xs text-gray-500">Logs (7 days)</div>
        <div className="text-3xl font-semibold">{kpis.weekCount}</div>
      </Card>
      <Card>
        <div className="text-xs text-gray-500">Fails</div>
        <div className="text-3xl font-semibold">{kpis.failsCount}</div>
      </Card>
      <Card>
        <div className="text-xs text-gray-500">Top logger</div>
        <div className="text-3xl font-semibold">
          {kpis.topLogger ? kpis.topLogger : "—"}
        </div>
      </Card>
    </div>
  );
}

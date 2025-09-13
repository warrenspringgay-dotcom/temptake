"use client";

import * as React from "react";

export type Kpis = {
  todayCount: number;
  weekCount: number;
  failsCount: number;
  topLogger?: string | null;
};

type Props = {
  initial: Partial<Kpis> | undefined;
  onRangeChange?: (days: number) => void;
};

export default function KpiCards({ initial, onRangeChange }: Props) {
  const safe: Kpis = {
    todayCount: initial?.todayCount ?? 0,
    weekCount: initial?.weekCount ?? 0,
    failsCount: initial?.failsCount ?? 0,
    topLogger: initial?.topLogger ?? "—",
  };
  const [days, setDays] = React.useState(30);

  return (
    <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
      <Card label="Logs today" value={safe.todayCount} />
      <Card label={`Logs (${days}d)`} value={safe.weekCount} />
      <Card label="Fails" value={safe.failsCount} valueClass={safe.failsCount ? "text-red-600" : "text-emerald-600"} />
      <Card label="Top logger">
        <div className="truncate">{safe.topLogger ?? "—"}</div>
      </Card>

      {/* Range control aligned to right on last card row */}
      <div className="md:col-span-4 flex justify-end">
        <select
          className="rounded-xl border px-3 py-2 text-sm"
          value={days}
          onChange={(e) => {
            const n = Number(e.target.value);
            setDays(n);
            onRangeChange?.(n);
          }}
          aria-label="KPI range"
        >
          <option value={7}>7d</option>
          <option value={14}>14d</option>
          <option value={30}>30d</option>
          <option value={60}>60d</option>
          <option value={90}>90d</option>
        </select>
      </div>
    </div>
  );
}

function Card({
  label,
  value,
  valueClass,
  children,
}: {
  label: string;
  value?: React.ReactNode;
  valueClass?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border bg-white p-4 shadow-sm">
      <div className="text-xs text-gray-500">{label}</div>
      <div className={`mt-2 text-2xl font-semibold ${valueClass ?? ""}`}>
        {value ?? children ?? "—"}
      </div>
    </div>
  );
}

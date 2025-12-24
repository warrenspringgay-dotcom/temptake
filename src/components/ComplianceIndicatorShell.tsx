// src/components/ComplianceIndicatorShell.tsx
"use client";

import React, { useEffect, useMemo, useState } from "react";
import useSWR from "swr";

type KpiData = {
  temperatureScore?: number | null;
  cleaningScore?: number | null;
  trainingScore?: number | null;
  allergenScore?: number | null;
};

const fetcher = async (url: string): Promise<KpiData> => {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`KPI fetch failed: ${res.status}`);
  }
  return res.json();
};

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}

function labelFrom(score: number): string {
  if (score >= 90) return "Excellent";
  if (score >= 75) return "Good";
  if (score >= 50) return "OK";
  if (score >= 25) return "Poor";
  return "Bad";
}

function ringTone(score: number) {
  if (score >= 90) return "ok";
  if (score >= 75) return "good";
  if (score >= 50) return "warn";
  return "bad";
}

export default function ComplianceIndicatorShell() {
  // 1) Local hidden state (with persistence)
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    try {
      if (typeof window === "undefined") return;
      const stored = window.localStorage.getItem(
        "tt_compliance_indicator_hidden"
      );
      if (stored === "1") setHidden(true);
    } catch {
      // ignore
    }
  }, []);

  // 2) ALWAYS call SWR. Use null key to skip fetch when hidden.
  const { data } = useSWR<KpiData>(
    hidden ? null : "/api/kpi/summary",
    fetcher
  );

  // 3) Derive score & labels
  const score = useMemo(() => {
    if (!data) return 0;
    const temp = data.temperatureScore ?? 0;
    const clean = data.cleaningScore ?? 0;
    const train = data.trainingScore ?? 0;
    const allergen = data.allergenScore ?? 0;
    return clamp(temp + clean + train + allergen, 0, 100);
  }, [data]);

  const label = useMemo(() => labelFrom(score), [score]);
  const tone = useMemo(() => ringTone(score), [score]);

  const handleHide = () => {
    setHidden(true);
    try {
      if (typeof window !== "undefined") {
        window.localStorage.setItem("tt_compliance_indicator_hidden", "1");
      }
    } catch {
      // ignore
    }
  };

  // 4) Render nothing if hidden OR no KPI data yet
  if (hidden || !data) return null;

  // 5) Render indicator
  const ringClass =
    tone === "ok"
      ? "from-emerald-500 to-emerald-400"
      : tone === "good"
      ? "from-lime-500 to-emerald-400"
      : tone === "warn"
      ? "from-amber-400 to-orange-500"
      : "from-rose-500 to-red-500";

  return (
    <div className="print:hidden pointer-events-none fixed right-4 top-[72px] z-50">
      <div
        className="pointer-events-auto relative h-[112px] w-[112px] rounded-full border border-white/40 bg-white/80 shadow-lg backdrop-blur"
        aria-label="Compliance indicator"
        title="Operational compliance (today)"
      >
        {/* Close button */}
        <button
          type="button"
          onClick={handleHide}
          className="absolute -right-1 -top-1 flex h-6 w-6 items-center justify-center rounded-full bg-white text-[10px] font-semibold text-slate-500 shadow"
          aria-label="Hide compliance indicator"
        >
          ×
        </button>

        {/* Ring */}
        <div className="absolute inset-3 rounded-full bg-slate-50" />
        <div
          className={`absolute inset-1 rounded-full bg-gradient-to-tr ${ringClass}`}
          style={{
            maskImage:
              "radial-gradient(farthest-side, transparent 68%, black 71%)",
            WebkitMaskImage:
              "radial-gradient(farthest-side, transparent 68%, black 71%)",
          }}
        />

        {/* Center content */}
        <div className="relative flex h-full w-full flex-col items-center justify-center gap-0.5 text-center">
          <div className="text-xl font-extrabold text-slate-900">{score}%</div>
          <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">
            {label}
          </div>
          <div className="text-[9px] uppercase tracking-[0.16em] text-slate-400">
            Compliance
          </div>
        </div>
      </div>
    </div>
  );
}

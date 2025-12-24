"use client";

import React, { useEffect, useMemo, useState } from "react";
import useSWR from "swr";

const STORAGE_KEY = "tt_compliance_widget_hidden_v1";

type KpiData = {
  // Flexible shape so TS doesn’t whine if your API changes
  score?: number;
  tempScore?: number;
  cleaningScore?: number;
  trainingScore?: number;
  allergenScore?: number;
};

const fetcher = async (url: string) => {
  const res = await fetch(url, { credentials: "include" });
  if (!res.ok) {
    throw new Error("Failed to load compliance KPI");
  }
  return (await res.json()) as KpiData;
};

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}

function labelFrom(score: number): string {
  if (score >= 80) return "Excellent";
  if (score >= 60) return "Good";
  if (score >= 40) return "OK";
  if (score > 0) return "Bad";
  return "No data";
}

export default function ComplianceIndicatorShell() {
  const [hidden, setHidden] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  // 1) Read hidden flag from localStorage on mount
  useEffect(() => {
    if (typeof window === "undefined") return;

    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw === "1") {
        setHidden(true);
      }
    } catch {
      // storage can fail, whatever
    } finally {
      setHydrated(true);
    }
  }, []);

  const handleHide = () => {
    try {
      if (typeof window !== "undefined") {
        window.localStorage.setItem(STORAGE_KEY, "1");
      }
    } catch {
      // ignore
    }
    setHidden(true);
  };

  // Avoid hydration mismatch: don’t render until we know hidden state
  if (!hydrated || hidden) return null;

  // 2) Fetch KPI data
  const { data } = useSWR<KpiData>("/api/kpi/summary", fetcher);

  const score = useMemo(() => {
    if (!data) return 0;

    // Either use a single `score` field or sum sub-scores
    if (typeof data.score === "number") return clamp(data.score, 0, 100);

    const temp = data.tempScore ?? 0;
    const cleaning = data.cleaningScore ?? 0;
    const training = data.trainingScore ?? 0;
    const allergen = data.allergenScore ?? 0;

    return clamp(temp + cleaning + training + allergen, 0, 100);
  }, [data]);

  const label = labelFrom(score);

  return (
    <div className="print:hidden pointer-events-none fixed right-4 top-[72px] z-50">
      <div className="pointer-events-auto relative flex h-[112px] w-[112px] items-center justify-center rounded-full border border-white/30 bg-white/90 shadow-xl backdrop-blur-md">
        {/* Close button */}
        <button
          type="button"
          aria-label="Hide compliance indicator"
          onClick={handleHide}
          className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full border border-slate-300 bg-white text-xs text-slate-600 shadow-md hover:bg-slate-50"
        >
          ×
        </button>

        {/* Simple inner content – you can restyle later */}
        <div className="text-center">
          <div className="text-xl font-extrabold leading-none">{score}%</div>
          <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-700">
            {label}
          </div>
          <div className="mt-1 text-[10px] text-slate-500">Compliance</div>
        </div>
      </div>
    </div>
  );
}

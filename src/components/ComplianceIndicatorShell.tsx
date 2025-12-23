// src/components/ComplianceIndicatorShell.tsx
"use client";

import React, { useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import { supabase } from "@/lib/supabaseBrowser";
import { getActiveOrgIdClient } from "@/lib/orgClient";
import { getActiveLocationIdClient } from "@/lib/locationClient";

const LS_HIDE_KEY = "tt_compliance_hidden_v1";

/** Any route where the indicator should NOT appear */
const HIDE_ROUTES = ["/", "/login", "/signup", "/launch", "/pricing", "/demo-wall"];

function shouldHideForPath(pathname: string | null): boolean {
  if (!pathname) return false;
  return HIDE_ROUTES.some((base) => {
    if (pathname === base) return true;
    return pathname.startsWith(base + "/");
  });
}

type KpiRow = {
  temp_score: number | null;
  cleaning_score: number | null;
  training_score: number | null;
  allergen_score: number | null;
};

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}

function labelFrom(score: number) {
  if (score >= 90) return "Excellent";
  if (score >= 70) return "Good";
  if (score >= 50) return "OK";
  return "Bad";
}

type Tone = "ok" | "warn" | "bad";

function ringTone(score: number): Tone {
  if (score >= 80) return "ok";
  if (score >= 50) return "warn";
  return "bad";
}

export default function ComplianceIndicatorShell() {
  const pathname = usePathname();

  const [mounted, setMounted] = useState(false);
  const [hidden, setHidden] = useState(false);
  const [kpi, setKpi] = useState<KpiRow | null>(null);

  // 1) One-time mount + localStorage check
  useEffect(() => {
    setMounted(true);

    try {
      if (typeof window !== "undefined") {
        const val = window.localStorage.getItem(LS_HIDE_KEY);
        if (val === "1") {
          setHidden(true);
        }
      }
    } catch {
      // ignore localStorage failures
    }
  }, []);

  // 2) Route gate: never render on marketing/auth pages
  const hideForRoute = useMemo(
    () => shouldHideForPath(pathname),
    [pathname]
  );

  // 3) Fetch KPI once per mount (normal app pages only)
  useEffect(() => {
    if (!mounted || hideForRoute) return;

    let cancelled = false;
    (async () => {
      try {
        const orgId = await getActiveOrgIdClient();
        const locId = await getActiveLocationIdClient();
        if (!orgId || !locId) return;

        const { data, error } = await supabase
          .from("daily_kpi")
          .select("temp_score, cleaning_score, training_score, allergen_score")
          .eq("org_id", orgId)
          .eq("location_id", locId)
          .order("for_date", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (error || !data || cancelled) return;

        setKpi({
          temp_score: data.temp_score ?? null,
          cleaning_score: data.cleaning_score ?? null,
          training_score: data.training_score ?? null,
          allergen_score: data.allergen_score ?? null,
        });
      } catch {
        // silent fail – indicator is a nice-to-have
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [mounted, hideForRoute]);

  // 4) Close button handler (this is the one you care about)
  function handleHideClick() {
    setHidden(true);
    try {
      if (typeof window !== "undefined") {
        window.localStorage.setItem(LS_HIDE_KEY, "1");
      }
    } catch {
      // ignore
    }
  }

  // 5) Final visibility
  if (!mounted || hidden || hideForRoute) return null;

  const score = useMemo(() => {
    if (!kpi) return 0;
    const tempScore = kpi.temp_score ?? 0;
    const cleaningScore = kpi.cleaning_score ?? 0;
    const trainingScore = kpi.training_score ?? 0;
    const allergenScore = kpi.allergen_score ?? 0;

    return clamp(tempScore + cleaningScore + trainingScore + allergenScore, 0, 100);
  }, [kpi]);

  const label = useMemo(() => labelFrom(score), [score]);
  const tone = useMemo(() => ringTone(score), [score]);

  const ringClass =
    tone === "ok"
      ? "stroke-emerald-500"
      : tone === "warn"
      ? "stroke-amber-500"
      : "stroke-red-500";

  const textClass =
    tone === "ok"
      ? "text-emerald-700"
      : tone === "warn"
      ? "text-amber-700"
      : "text-red-700";

  return (
    // Outer shell does NOT take clicks, inner disc does
    <div className="print:hidden pointer-events-none fixed right-4 top-[72px] z-[9999]">
      <div
        className="pointer-events-auto relative flex h-[112px] w-[112px] items-center justify-center rounded-full border border-white/80 bg-white/95 shadow-xl shadow-black/10 backdrop-blur-sm"
        aria-label="Compliance indicator"
        title="Operational compliance (today)"
      >
        {/* close button */}
        <button
          type="button"
          onClick={handleHideClick}
          className="absolute -top-3 -right-3 flex h-7 w-7 items-center justify-center rounded-full border border-slate-200 bg-white text-xs font-bold text-slate-600 shadow-sm hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-slate-400"
          aria-label="Hide compliance indicator"
        >
          ×
        </button>

        {/* ring */}
        <svg
          viewBox="0 0 100 100"
          className="absolute inset-0 h-full w-full"
          aria-hidden="true"
        >
          <circle
            cx="50"
            cy="50"
            r="46"
            className="fill-none stroke-slate-100"
            strokeWidth={8}
          />
          <circle
            cx="50"
            cy="50"
            r="46"
            className={`fill-none ${ringClass}`}
            strokeWidth={8}
            strokeDasharray={`${score * 2.88} 999`}
            strokeLinecap="round"
            transform="rotate(-90 50 50)"
          />
        </svg>

        {/* score text */}
        <div className="relative flex flex-col items-center justify-center">
          <div className={`text-xl font-extrabold ${textClass}`}>{score}%</div>
          <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
            {label}
          </div>
          <div className="mt-0.5 text-[9px] text-slate-400">Compliance</div>
        </div>
      </div>
    </div>
  );
}

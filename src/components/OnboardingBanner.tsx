// src/components/OnboardingBanner.tsx
"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { getActiveOrgIdClient } from "@/lib/orgClient";
import { getActiveLocationIdClient } from "@/lib/locationClient";
import { supabase } from "@/lib/supabaseBrowser";
import { getStepDone, setStepDone, type OnboardingStepKey } from "@/lib/onboarding";

const cls = (...parts: Array<string | false | null | undefined>) =>
  parts.filter(Boolean).join(" ");

type Step = {
  key: OnboardingStepKey;
  title: string;
  body: string;
  ctaLabel: string;
  href: string;
  tone?: "emerald" | "amber" | "sky";
};

function toneClasses(tone: Step["tone"]) {
  switch (tone) {
    case "amber":
      return {
        wrap: "border-amber-200 bg-amber-50/80",
        pill: "bg-amber-500/15 text-amber-800 border-amber-200",
        btn: "bg-amber-600 hover:bg-amber-700 text-white",
      };
    case "sky":
      return {
        wrap: "border-sky-200 bg-sky-50/80",
        pill: "bg-sky-500/15 text-sky-800 border-sky-200",
        btn: "bg-sky-600 hover:bg-sky-700 text-white",
      };
    default:
      return {
        wrap: "border-emerald-200 bg-emerald-50/80",
        pill: "bg-emerald-500/15 text-emerald-800 border-emerald-200",
        btn: "bg-emerald-600 hover:bg-emerald-700 text-white",
      };
  }
}

async function hasAnyTempRoutine(orgId: string) {
  const q1 = await supabase
    .from("temp_routines")
    .select("id", { count: "exact", head: true })
    .eq("org_id", orgId)
    .limit(1);

  if (q1.error) return false;
  return (q1.count ?? 0) > 0;
}

async function hasAnyCleaningTask(orgId: string, locationId: string) {
  const q = await supabase
    .from("cleaning_tasks")
    .select("id", { count: "exact", head: true })
    .eq("org_id", orgId)
    .eq("location_id", locationId)
    .limit(1);

  if (q.error) return false;
  return (q.count ?? 0) > 0;
}

async function hasAnyAllergenReview(orgId: string) {
  const q = await supabase
    .from("allergen_review")
    .select("id", { count: "exact", head: true })
    .eq("org_id", orgId)
    .limit(1);

  if (q.error) return false;
  return (q.count ?? 0) > 0;
}

async function hasAnyTeamMember(orgId: string) {
  const q = await supabase
    .from("team_members")
    .select("id", { count: "exact", head: true })
    .eq("org_id", orgId)
    .limit(1);

  if (q.error) return false;
  return (q.count ?? 0) > 0;
}

/**
 * ✅ "Training exists" = at least one team member has a training expiry set.
 * This avoids relying on the separate trainings table (which may not be org-scoped).
 */
async function hasAnyTrainingSet(orgId: string) {
  const { data, error } = await supabase
    .from("team_members")
    .select("training_expires_at, training_expiry, expires_at")
    .eq("org_id", orgId)
    .limit(200);

  if (error) return false;

  return (data ?? []).some((r: any) => {
    return !!(
      r?.training_expires_at ||
      r?.training_expiry ||
      r?.expires_at
    );
  });
}

export default function OnboardingBanner() {
  const pathname = usePathname();

  const [orgId, setOrgId] = useState<string | null>(null);
  const [locationId, setLocationId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const [routinesDone, setRoutinesDone] = useState(false);
  const [cleaningDone, setCleaningDone] = useState(false);
  const [allergensDone, setAllergensDone] = useState(false);
  const [teamDone, setTeamDone] = useState(false);
  const [locationsDone, setLocationsDone] = useState(false);

  const steps: Step[] = useMemo(
    () => [
      {
        key: "locations",
        title: "Add your site",
        body: "Create your first location so records, cleaning and routines attach to the right place.",
        ctaLabel: "Set up locations",
        href: "/locations",
        tone: "sky",
      },
      {
        key: "routines",
        title: "Build temp routines",
        body: "Add your fridges/freezers/hot hold points so the team can log in seconds.",
        ctaLabel: "Set up routines",
        href: "/routines",
        tone: "emerald",
      },
      {
        key: "cleaning",
        title: "Add the cleaning rota",
        body: "Create daily/weekly/monthly tasks so the rota isn’t a laminated lie.",
        ctaLabel: "Set up cleaning",
        href: "/cleaning-rota",
        tone: "sky",
      },
      {
        key: "allergens",
        title: "Add allergen review",
        body: "Track when the allergen matrix was last reviewed, and when it’s due again.",
        ctaLabel: "Set up allergens",
        href: "/allergens",
        tone: "amber",
      },
      {
        key: "team",
        title: "Add training expiry dates",
        body: "Add your team, then enter training expiry dates so nothing quietly expires.",
        ctaLabel: "Set up team & training",
        href: "/team",
        tone: "amber",
      },
    ],
    []
  );

  const pageEligible = useMemo(() => {
    if (!pathname) return false;
    const eligible = [
      "/dashboard",
      "/locations",
      "/routines",
      "/cleaning-rota",
      "/allergens",
      "/team",
    ];
    return eligible.some((p) => pathname === p || pathname.startsWith(p + "/"));
  }, [pathname]);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      setLoading(true);
      try {
        const o = await getActiveOrgIdClient();
        const l = await getActiveLocationIdClient();
        if (cancelled) return;

        setOrgId(o ?? null);
        setLocationId(l ?? null);

        // Local (instant) state first
        setLocationsDone(!!l || getStepDone(o ?? null, "locations"));
        setRoutinesDone(getStepDone(o ?? null, "routines"));
        setCleaningDone(getStepDone(o ?? null, "cleaning"));
        setAllergensDone(getStepDone(o ?? null, "allergens"));
        setTeamDone(getStepDone(o ?? null, "team"));

        // Server-backed checks
        if (o) {
          const [rOk, aOk, hasTeam, hasTraining] = await Promise.all([
            hasAnyTempRoutine(o),
            hasAnyAllergenReview(o),
            hasAnyTeamMember(o),
            hasAnyTrainingSet(o),
          ]);

          if (!cancelled) {
            if (rOk) {
              setRoutinesDone(true);
              setStepDone(o, "routines", true);
            }
            if (aOk) {
              setAllergensDone(true);
              setStepDone(o, "allergens", true);
            }

            // ✅ Team step is ONLY done when team exists AND training exists
            if (hasTeam && hasTraining) {
              setTeamDone(true);
              setStepDone(o, "team", true);
            } else {
              setTeamDone(false);
            }
          }

          if (o && l) {
            const cOk = await hasAnyCleaningTask(o, l);
            if (!cancelled && cOk) {
              setCleaningDone(true);
              setStepDone(o, "cleaning", true);
            }
          }
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [pathname]);

  const doneMap: Record<OnboardingStepKey, boolean> = {
    locations: locationsDone,
    routines: routinesDone,
    cleaning: cleaningDone,
    allergens: allergensDone,
    team: teamDone,
  };

  const remaining = steps.filter((s) => !doneMap[s.key]);
  const allDone = remaining.length === 0;

  const suggested = useMemo(() => {
    if (allDone) return null;

    const onKey = ((): OnboardingStepKey | null => {
      if (pathname?.startsWith("/locations")) return "locations";
      if (pathname?.startsWith("/routines")) return "routines";
      if (pathname?.startsWith("/cleaning-rota")) return "cleaning";
      if (pathname?.startsWith("/allergens")) return "allergens";
      if (pathname?.startsWith("/team")) return "team";
      return null;
    })();

    if (!onKey) return remaining[0];

    const idx = steps.findIndex((s) => s.key === onKey);
    const next = steps.slice(idx + 1).find((s) => !doneMap[s.key]);
    return next ?? remaining[0];
  }, [allDone, pathname, remaining, steps, doneMap]);

  const progress = Math.round(
    ((steps.length - remaining.length) / steps.length) * 100
  );

  if (!pageEligible) return null;
  if (loading) return null;
  if (!orgId) return null;
  if (allDone) return null;
  if (!suggested) return null;

  const tone = toneClasses(suggested.tone);

  return (
    <div
      className={cls(
        "rounded-3xl border p-4 shadow-sm backdrop-blur",
        "flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between",
        tone.wrap
      )}
    >
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <span
            className={cls(
              "inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-extrabold uppercase tracking-[0.18em]",
              tone.pill
            )}
          >
            Setup {progress}%
          </span>

          <button
            type="button"
            onClick={() => {
              // Snooze this step for this org (not “completed”, just “don’t nag”)
              setStepDone(orgId, suggested.key, true);

              if (suggested.key === "locations") setLocationsDone(true);
              if (suggested.key === "routines") setRoutinesDone(true);
              if (suggested.key === "cleaning") setCleaningDone(true);
              if (suggested.key === "allergens") setAllergensDone(true);
              if (suggested.key === "team") setTeamDone(true);
            }}
            className="text-[11px] font-semibold text-slate-600 hover:text-slate-900"
            title="Hide this step"
          >
            Dismiss
          </button>
        </div>

        <div className="mt-2 text-sm font-extrabold text-slate-900">
          {suggested.title}
        </div>
        <div className="mt-0.5 text-xs font-medium text-slate-600">
          {suggested.body}
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Link
          href={suggested.href}
          className={cls(
            "inline-flex items-center justify-center rounded-2xl px-4 py-2 text-xs font-extrabold shadow-sm",
            tone.btn
          )}
        >
          {suggested.ctaLabel}
        </Link>

        <div className="hidden sm:flex items-center text-[11px] font-semibold text-slate-600">
          {remaining.length} left
        </div>
      </div>
    </div>
  );
}

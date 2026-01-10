// src/components/OnboardingBanner.tsx
"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { getActiveOrgIdClient } from "@/lib/orgClient";
import { getActiveLocationIdClient } from "@/lib/locationClient";
import { supabase } from "@/lib/supabaseBrowser";
import {
  clearSnooze,
  isStepSnoozed,
  snoozeStep,
  type OnboardingStepKey,
} from "@/lib/onboarding";

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

/* ---------- server checks ---------- */

async function hasAnyLocation(orgId: string) {
  const q = await supabase
    .from("locations")
    .select("id", { count: "exact", head: true })
    .eq("org_id", orgId)
    .eq("active", true)
    .limit(1);

  if (q.error) return false;
  return (q.count ?? 0) > 0;
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
 * "Training step done" = team exists AND at least one training record with expires_on.
 */
async function hasAnyTrainingSet(orgId: string) {
  const qTeam = await supabase
    .from("trainings")
    .select("id", { count: "exact", head: true })
    .eq("org_id", orgId)
    .not("team_member_id", "is", null)
    .not("expires_on", "is", null)
    .limit(1);

  if (!qTeam.error && (qTeam.count ?? 0) > 0) return true;

  const qAny = await supabase
    .from("trainings")
    .select("id", { count: "exact", head: true })
    .eq("org_id", orgId)
    .not("expires_on", "is", null)
    .limit(1);

  if (qAny.error) return false;
  return (qAny.count ?? 0) > 0;
}

/* ---------- Component ---------- */

export default function OnboardingBanner() {
  const pathname = usePathname();

  const [orgId, setOrgId] = useState<string | null>(null);
  const [locationId, setLocationId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // real completion state
  const [done, setDone] = useState<Record<OnboardingStepKey, boolean>>({
    locations: false,
    routines: false,
    cleaning: false,
    allergens: false,
    team: false,
  });

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

        if (!o) return;

        // server truth
        const [locOk, routinesOk, allergenOk, teamOk, trainingOk] =
          await Promise.all([
            hasAnyLocation(o),
            hasAnyTempRoutine(o),
            hasAnyAllergenReview(o),
            hasAnyTeamMember(o),
            hasAnyTrainingSet(o),
          ]);

        // cleaning depends on location
        let cleaningOk = false;
        if (l) {
          cleaningOk = await hasAnyCleaningTask(o, l);
        }

        if (cancelled) return;

        const nextDone: Record<OnboardingStepKey, boolean> = {
          locations: !!l || locOk,
          routines: routinesOk,
          cleaning: cleaningOk,
          allergens: allergenOk,
          team: teamOk && trainingOk,
        };

        // If something becomes truly done, clear its snooze so it doesn't interfere.
        (Object.keys(nextDone) as OnboardingStepKey[]).forEach((k) => {
          if (nextDone[k]) clearSnooze(o, k);
        });

        setDone(nextDone);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [pathname]);

  const remaining = useMemo(() => steps.filter((s) => !done[s.key]), [steps, done]);
  const allDone = remaining.length === 0;

  const suggested = useMemo(() => {
    if (!orgId) return null;
    if (allDone) return null;

    // Filter remaining by snooze (do NOT treat snooze as "done", just "not now")
    const awakeRemaining = remaining.filter((s) => !isStepSnoozed(orgId, s.key));
    const pool = awakeRemaining.length ? awakeRemaining : remaining;

    // Prefer next step after current page
    const onKey = ((): OnboardingStepKey | null => {
      if (pathname?.startsWith("/locations")) return "locations";
      if (pathname?.startsWith("/routines")) return "routines";
      if (pathname?.startsWith("/cleaning-rota")) return "cleaning";
      if (pathname?.startsWith("/allergens")) return "allergens";
      if (pathname?.startsWith("/team")) return "team";
      return null;
    })();

    if (!onKey) return pool[0];

    const idx = steps.findIndex((s) => s.key === onKey);
    const next = steps.slice(idx + 1).find((s) => !done[s.key] && !isStepSnoozed(orgId, s.key));
    return next ?? pool[0];
  }, [orgId, allDone, pathname, remaining, steps, done]);

  const progress = useMemo(() => {
    const total = steps.length;
    const doneCount = steps.reduce((acc, s) => acc + (done[s.key] ? 1 : 0), 0);
    return Math.round((doneCount / total) * 100);
  }, [steps, done]);

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
              // Snooze this step (do NOT mark it complete)
              snoozeStep(orgId, suggested.key);
            }}
            className="text-[11px] font-semibold text-slate-600 hover:text-slate-900"
            title="Snooze this step"
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

        {/* Lightweight checklist of what’s left */}
        <div className="mt-2 flex flex-wrap gap-2">
          {steps.map((s) => {
            const isDone = done[s.key];
            const isLeft = !isDone;
            return (
              <span
                key={s.key}
                className={cls(
                  "inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-semibold",
                  isDone
                    ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                    : "border-slate-200 bg-white/70 text-slate-700"
                )}
                title={s.title}
              >
                <span aria-hidden="true">{isDone ? "✅" : "⬜"}</span>
                {isLeft ? s.title : s.title}
              </span>
            );
          })}
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

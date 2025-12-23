// src/components/TrialBanner.tsx
"use client";

import Link from "next/link";
import { useSubscriptionStatus } from "@/hooks/useSubscriptionStatus";

function calcDaysLeft(trialEndsAt: string | null): number | null {
  if (!trialEndsAt) return null;

  const now = new Date();
  const end = new Date(trialEndsAt);
  if (Number.isNaN(end.getTime())) return null;

  const diffMs = end.getTime() - now.getTime();
  if (diffMs <= 0) return 0;

  return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
}

export default function TrialBanner() {
  const { loading, loggedIn, onTrial, trialEndsAt } = useSubscriptionStatus();

  // Not ready or not logged in or not actually on trial → nothing
  if (loading || !loggedIn || !onTrial) return null;

  const daysLeft = calcDaysLeft(trialEndsAt);
  if (daysLeft === null || daysLeft <= 0) return null;

  return (
    <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <div className="font-semibold">
            Free trial: {daysLeft} day{daysLeft === 1 ? "" : "s"} left
          </div>
          <div className="text-xs text-amber-800">
            You&apos;ve got full access during the trial. Add your billing details to keep
            TempTake running after it ends.
          </div>
        </div>
        <Link
          href="/billing"
          className="rounded-full bg-amber-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-amber-700"
        >
          Go to billing
        </Link>
      </div>
    </div>
  );
}

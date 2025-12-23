// src/components/TrialBanner.tsx
"use client";

import Link from "next/link";
import { useSubscriptionStatus } from "@/hooks/useSubscriptionStatus";

export default function TrialBanner() {
  const { loggedIn, onTrial, daysLeft, trialEndsAt } = useSubscriptionStatus();

  // Not logged in or not on trial → no banner
  if (!loggedIn || !onTrial) return null;

  // If we somehow don't have a valid date or days, bail
  if (!trialEndsAt || daysLeft == null || daysLeft <= 0) return null;

  return (
    <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <div className="font-semibold">
            Trial active · {daysLeft} day{daysLeft === 1 ? "" : "s"} left
          </div>
          <div className="text-xs text-emerald-800">
            You’ve got full access during the trial. Build your locations,
            routines and team. Add billing details to continue after the trial
            ends.
          </div>
        </div>
        <Link
          href="/billing"
          className="rounded-full bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700"
        >
          Go to billing
        </Link>
      </div>
    </div>
  );
}

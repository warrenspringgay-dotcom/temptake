"use client";

import Link from "next/link";
import { useSubscriptionStatus } from "@/hooks/useSubscriptionStatus";

function formatDate(iso: string | null | undefined) {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;

  return d.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function calcDaysLeft(trialEndsAt: string | null): number | null {
  if (!trialEndsAt) return null;

  const now = new Date();
  const end = new Date(trialEndsAt);
  if (Number.isNaN(end.getTime())) return null;

  const diffMs = end.getTime() - now.getTime();
  if (diffMs <= 0) return 0;

  return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
}

export default function SubscriptionBanner() {
  const {
    loading,
    loggedIn,
    active,
    onTrial,
    trialEndsAt,
    currentPeriodEnd,
  } = useSubscriptionStatus();

  // Not ready or not logged in → no banner
  if (loading || !loggedIn) return null;

  const trialDaysLeft = calcDaysLeft(trialEndsAt);

  // ✅ Case 1: fully active subscription
  if (active) {
    const renewText = formatDate(currentPeriodEnd);

    return (
      <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <div className="font-semibold">Subscription active</div>
            {renewText && (
              <div className="text-xs text-emerald-800">
                Renews / billed on {renewText}.
              </div>
            )}
          </div>

          <Link
            href="/billing"
            className="rounded-full bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700"
          >
            Manage billing
          </Link>
        </div>
      </div>
    );
  }

  // ✅ Case 2: on free trial
  if (onTrial && trialDaysLeft !== null) {
    return (
      <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <div className="font-semibold">
              Free trial: {trialDaysLeft} day
              {trialDaysLeft === 1 ? "" : "s"} left
            </div>
            <div className="text-xs text-amber-800">
              You’ve got full access during the trial. Add your billing details
              to continue after it ends.
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

  // ✅ Case 3: no active sub, no trial
  return (
    <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <div className="font-semibold">No active subscription</div>
          <div className="text-xs text-red-800">
            Some features may be limited. Add a plan to unlock everything.
          </div>
        </div>

        <Link
          href="/billing"
          className="rounded-full bg-red-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-700"
        >
          Choose a plan
        </Link>
      </div>
    </div>
  );
}

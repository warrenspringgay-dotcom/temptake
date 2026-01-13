// src/components/SubscriptionBanner.tsx
"use client";

import Link from "next/link";
import { useSubscriptionStatus } from "@/hooks/useSubscriptionStatus";

function formatDate(iso: string | null | undefined) {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;

  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = String(d.getFullYear());
  return `${dd}/${mm}/${yyyy}`; // ✅ DD/MM/YYYY
}

function calcDaysLeft(endsAt: string | null): number | null {
  if (!endsAt) return null;

  const now = new Date();
  const end = new Date(endsAt);
  if (Number.isNaN(end.getTime())) return null;

  const diffMs = end.getTime() - now.getTime();
  if (diffMs <= 0) return 0;

  return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
}

export default function SubscriptionBanner() {
  const {
    loading,
    loggedIn,
    hasValid,
    onTrial,
    trialEndsAt,
    currentPeriodEnd,
  } = useSubscriptionStatus();

  if (loading || !loggedIn) return null;

  // ✅ One source of truth: valid means no banner
  if (hasValid) return null;

  const WARN_DAYS = 7;

  // Trial warnings (only if hasValid is false)
  if (onTrial) {
    const trialDaysLeft = calcDaysLeft(trialEndsAt);
    if (trialDaysLeft === null) return null;
    if (trialDaysLeft > WARN_DAYS) return null;

    const endsText = formatDate(trialEndsAt);

    if (trialDaysLeft === 0) {
      return (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <div className="font-semibold">Trial ended</div>
              <div className="text-xs text-red-800">
                Your trial has ended{endsText ? ` (ended ${endsText})` : ""}. Add a plan to restore full access.
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

    return (
      <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <div className="font-semibold">
              Trial ending soon: {trialDaysLeft} day{trialDaysLeft === 1 ? "" : "s"} left
            </div>
            <div className="text-xs text-amber-800">
              {endsText ? `Ends ${endsText}. ` : ""}
              Add billing now to avoid losing access.
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

  const renewText = formatDate(currentPeriodEnd);

  return (
    <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <div className="font-semibold">Subscription inactive</div>
          <div className="text-xs text-red-800">
            {renewText ? `Last period ended ${renewText}. ` : ""}
            Update billing to restore full access.
          </div>
        </div>

        <Link
          href="/billing"
          className="rounded-full bg-red-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-700"
        >
          Manage billing
        </Link>
      </div>
    </div>
  );
}

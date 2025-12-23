// src/components/SubscriptionBanner.tsx
"use client";

import React from "react";
import Link from "next/link";
import { useSubscriptionStatus } from "@/hooks/useSubscriptionStatus";

function formatDate(iso: string | null | undefined) {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default function SubscriptionBanner() {
  const info = useSubscriptionStatus();

  if (!info.loggedIn) return null;

  // Only show if they're on trial or have no active subscription
  if (info.active && !info.onTrial) return null;

  const label =
    info.onTrial && info.daysLeft != null
      ? `Free trial: ${info.daysLeft} day${
          info.daysLeft === 1 ? "" : "s"
        } left`
      : "No subscription";

  const endLabel = formatDate(info.trialEndsAt || info.currentPeriodEnd);

  return (
    <div className="mb-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <div className="font-semibold">{label}</div>
          {endLabel && (
            <div className="text-xs text-amber-800">
              Ends on: {endLabel}
            </div>
          )}
        </div>
        <Link
          href="/billing"
          className="rounded-lg bg-amber-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-amber-800"
        >
          Go to billing
        </Link>
      </div>
    </div>
  );
}

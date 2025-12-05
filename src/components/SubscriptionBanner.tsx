// src/components/SubscriptionBanner.tsx
"use client";

import Link from "next/link";
import { useSubscriptionStatus } from "@/hooks/useSubscriptionStatus";

function formatDate(iso: string | null | undefined) {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export default function SubscriptionBanner() {
  const { status, trialEndsAt, currentPeriodEnd, loading, error } =
    useSubscriptionStatus();

  if (loading || error) return null;
  if (!status) return null; // no subscription yet – nothing to show here

  const trialEndNice = formatDate(trialEndsAt);
  const renewNice = formatDate(currentPeriodEnd);

  let bgClasses =
    "bg-amber-50 border-amber-200 text-amber-900"; // default (trial)
  let label = "";
  let message = "";
  let ctaText = "Manage in billing";

  if (status === "trialing") {
    if (!trialEndNice) return null; // no date, skip banner
    label = "Free trial";
    message = `Your TempTake free trial ends on ${trialEndNice}. After that your plan continues as a paid subscription unless you cancel.`;
  } else if (status === "past_due") {
    bgClasses = "bg-red-50 border-red-200 text-red-900";
    label = "Payment issue";
    message =
      "We couldn't take your latest payment. Please update your card details to keep TempTake running smoothly.";
  } else {
    // Active / anything else – dashboard banner not needed
    return null;
  }

  return (
    <div
      className={`mb-4 rounded-xl border px-4 py-3 text-sm ${bgClasses}`}
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="text-xs font-semibold uppercase tracking-wide opacity-80">
            {label}
          </div>
          <div className="mt-0.5">{message}</div>
          {status === "active" && renewNice && (
            <div className="mt-0.5 text-xs opacity-80">
              Renews on {renewNice}.
            </div>
          )}
        </div>
        <Link
          href="/billing"
          className="inline-flex shrink-0 items-center rounded-full border border-current px-3 py-1 text-xs font-semibold hover:bg-black/5"
        >
          {ctaText}
        </Link>
      </div>
    </div>
  );
}

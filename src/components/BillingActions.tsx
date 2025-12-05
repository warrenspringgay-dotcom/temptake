// src/components/BillingActions.tsx
"use client";

import { useState } from "react";

type BillingActionsProps = {
  hasActiveSub: boolean;
  status: string | null;
  trialEndsAt?: string | null;
  currentPeriodEnd?: string | null;
};

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

export default function BillingActions({
  hasActiveSub,
  status,
  trialEndsAt,
  currentPeriodEnd,
}: BillingActionsProps) {
  const [loading, setLoading] = useState(false);

  // ----- Status banner copy -----
  let headline = "No subscription yet";
  let subline: string | null =
    "Start your 14-day free trial below. You can cancel any time in the Stripe billing portal.";

  const trialEndNice = formatDate(trialEndsAt);
  const renewNice = formatDate(currentPeriodEnd);

  if (status === "trialing") {
    headline = "Free trial active";
    subline = trialEndNice
      ? `Your free trial ends on ${trialEndNice}. You can cancel any time before then.`
      : "Your free trial is active. You can cancel any time in the Stripe billing portal.";
  } else if (status === "active") {
    headline = "Subscription active";
    subline = renewNice
      ? `Your subscription will renew on ${renewNice}. You can manage it in the Stripe billing portal.`
      : "Your subscription is active. You can manage it in the Stripe billing portal.";
  } else if (status === "past_due") {
    headline = "Payment issue";
    subline =
      "We couldn't take a payment. Please open the Stripe billing portal to update your card details.";
  } else if (!status) {
    // keep default headline/subline defined above
  }

  // ----- Start checkout -----
  async function startCheckout() {
    if (hasActiveSub || loading) return;
    try {
      setLoading(true);
      const res = await fetch("/api/stripe/create-checkout-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan: "monthly" }),
      });

      const data = await res.json();
      if (!res.ok || !data?.url) {
        console.error("[billing] checkout error", data);
        alert(data?.error ?? "Unable to start checkout, please try again.");
        return;
      }

      window.location.href = data.url as string;
    } finally {
      setLoading(false);
    }
  }

  async function openPortal() {
    try {
      setLoading(true);
      const res = await fetch("/api/stripe/create-portal-session", {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok || !data?.url) {
        console.error("[billing] portal error", data);
        alert(data?.error ?? "Unable to open billing portal.");
        return;
      }
      window.location.href = data.url as string;
    } finally {
      setLoading(false);
    }
  }

  const buttonDisabled = hasActiveSub || loading;

  return (
    <div className="space-y-6">
      {/* Top status banner */}
      <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm">
        <div className="font-semibold">
          Subscription status:{" "}
          <span className="font-semibold">
            {status === "active"
              ? "Active"
              : status === "trialing"
              ? "Free trial active"
              : status === "past_due"
              ? "Payment issue"
              : "No subscription"}
          </span>
        </div>
        {subline && (
          <p className="mt-1 text-slate-600 text-sm leading-snug">{subline}</p>
        )}
      </div>

      {/* Main monthly card */}
      <div className="grid gap-6 md:grid-cols-[minmax(0,2fr)_minmax(0,2fr)]">
        {/* Monthly pricing card */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-1">
            Monthly
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-3xl font-semibold">£9.99</span>
            <span className="text-sm text-slate-600">/ month (from)</span>
          </div>

          <p className="mt-3 text-sm text-slate-600">
            Pricing scales automatically with your number of locations. The
            multi-site pricing on the right shows the exact bands.
          </p>

          <button
            type="button"
            onClick={startCheckout}
            disabled={buttonDisabled}
            className={`mt-5 inline-flex w-full items-center justify-center rounded-full px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition ${
              buttonDisabled
                ? "cursor-not-allowed bg-slate-300"
                : "bg-emerald-600 hover:bg-emerald-700"
            }`}
          >
            {hasActiveSub
              ? "Subscription already active"
              : loading
              ? "Starting checkout…"
              : "Start monthly subscription"}
          </button>

          {!hasActiveSub && (
            <p className="mt-2 text-xs text-slate-500">
              Includes a 14-day free trial. You won’t be charged if you cancel
              before it ends.
            </p>
          )}
        </div>

        {/* Multi-site explainer */}
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm leading-relaxed">
          <div className="inline-flex items-center rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-amber-800">
            Multi-site pricing
          </div>

          <h2 className="mt-3 text-base font-semibold text-amber-900">
            Built for groups
          </h2>

          <p className="mt-1 text-amber-900/80">
            Add locations inside TempTake and we’ll automatically put you on the
            right band:
          </p>

          <ul className="mt-3 space-y-1 text-amber-900/90">
            <li>• 1 site → £9.99 / month</li>
            <li>• 2–3 sites → £19.99 / month</li>
            <li>• 4–5 sites → £29.99 / month</li>
            <li>• 6+ sites → custom pricing (contact us)</li>
          </ul>

          <p className="mt-3 text-xs text-amber-900/80">
            For 6 or more locations we’ll set up a custom package and onboarding
            call so everything is wired correctly from day one.
          </p>
        </div>
      </div>

      {/* Portal area */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 text-sm shadow-sm">
        <h2 className="text-sm font-semibold mb-1">Manage your subscription</h2>
        <p className="text-slate-600 mb-3">
          Use the Stripe billing portal to update your card, view invoices or
          cancel your plan.
        </p>

        <button
          type="button"
          onClick={openPortal}
          disabled={loading || !hasActiveSub}
          className={`inline-flex items-center rounded-full px-4 py-2 text-sm font-semibold shadow-sm ${
            !hasActiveSub || loading
              ? "cursor-not-allowed border border-slate-200 bg-slate-100 text-slate-400"
              : "border border-slate-300 bg-white text-slate-800 hover:bg-slate-50"
          }`}
        >
          Open billing portal
        </button>

        {!hasActiveSub && (
          <p className="mt-2 text-xs text-slate-500">
            The billing portal becomes available once you’ve started a
            subscription.
          </p>
        )}
      </div>
    </div>
  );
}

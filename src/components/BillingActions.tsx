// src/components/BillingActions.tsx
"use client";

import React, { useState } from "react";
import type { BillingTierInfo } from "@/lib/billingTiers";

type Props = {
  hasActiveSub: boolean;
  status: string | null;
  tier?: BillingTierInfo;
  locationCount?: number;
};

export default function BillingActions({
  hasActiveSub,
  status,
  tier,
  locationCount,
}: Props) {
  const [loadingPlan, setLoadingPlan] = useState<"monthly" | null>(null);

  async function startCheckout(plan: "monthly") {
    try {
      setLoadingPlan(plan);
      const res = await fetch("/api/stripe/create-checkout-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan }),
      });

      const data = await res.json();
      if (!res.ok) {
        console.error("[billing] checkout error", data);
        alert(data.error ?? "Unable to start checkout. Please try again.");
        return;
      }

      if (data.url) {
        window.location.href = data.url;
      } else {
        alert("No checkout URL returned from server.");
      }
    } catch (err) {
      console.error("[billing] checkout exception", err);
      alert("Something went wrong starting checkout.");
    } finally {
      setLoadingPlan(null);
    }
  }

  function openPortal() {
    window.location.href = "/api/stripe/portal"; // you already have this route
  }

  const humanStatus =
    status === "active"
      ? "Active"
      : status === "trialing"
      ? "On free trial"
      : "No subscription";

  return (
    <div className="space-y-8">
      {/* High-level status + plan */}
      <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
          <div>
            <div>
              Subscription status:{" "}
              <span className="font-semibold">{humanStatus}</span>
            </div>

            {tier && (
              <div className="text-xs text-slate-600 mt-1">
                Plan:{" "}
                <span className="font-semibold">{tier.label}</span>{" "}
                <span className="text-slate-500">
                  ({tier.priceLabel}
                  {typeof locationCount === "number"
                    ? ` • ${locationCount} location${
                        locationCount === 1 ? "" : "s"
                      } in your org`
                    : ""}
                  )
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Plan cards – monthly only (your three tiers are handled by Stripe) */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Monthly card */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="text-xs font-semibold uppercase text-slate-500 mb-1">
            Monthly
          </div>
          <div className="flex items-baseline gap-1 mb-2">
            <div className="text-3xl font-semibold">£9.99</div>
            <div className="text-sm text-slate-500">/ month (from)</div>
          </div>
          <p className="text-sm text-slate-600 mb-4">
            Pricing scales automatically with your number of locations:
            <br />
            <span className="block mt-1 text-xs text-slate-500">
              1 site: £9.99 • up to 3 sites: £19.99 • up to 5 sites: £29.99.
            </span>
          </p>

          <button
            type="button"
            onClick={() => startCheckout("monthly")}
            disabled={hasActiveSub || loadingPlan === "monthly"}
            className="inline-flex w-full items-center justify-center rounded-full bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-slate-300"
          >
            {hasActiveSub
              ? "Subscription already active"
              : loadingPlan === "monthly"
              ? "Redirecting to checkout…"
              : "Start monthly subscription"}
          </button>
        </div>

        {/* “Best value” explanation card */}
        <div className="rounded-2xl border border-amber-200 bg-amber-50/70 p-6 shadow-sm">
          <div className="inline-flex items-center rounded-full bg-amber-200 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-amber-900 mb-3">
            Multi-site pricing
          </div>
          <h2 className="text-lg font-semibold mb-2">Built for groups</h2>
          <p className="text-sm text-amber-900 mb-3">
            Add locations inside TempTake and we’ll automatically put you on the
            right band:
          </p>
          <ul className="mb-3 space-y-1 text-sm text-amber-900">
            <li>• 1 site → £9.99 / month</li>
            <li>• 2–3 sites → £19.99 / month</li>
            <li>• 4–5 sites → £29.99 / month</li>
            <li>• 6+ sites → custom pricing (contact us)</li>
          </ul>
          <p className="text-xs text-amber-900/90">
            For 6 or more locations we’ll set up a custom package and onboarding
            call so everything is wired correctly from day one.
          </p>
        </div>
      </div>

      {/* Portal block */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-sm font-semibold mb-1">Manage your subscription</h2>
        <p className="text-xs text-slate-600 mb-3">
          If you already have an active subscription, you can update your card,
          view invoices or cancel via the Stripe billing portal.
        </p>
        <button
          type="button"
          onClick={openPortal}
          className="inline-flex items-center rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
        >
          Open billing portal
        </button>
      </div>
    </div>
  );
}

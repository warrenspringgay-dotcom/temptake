// src/components/BillingActions.tsx
"use client";

import React, { useState } from "react";

type BillingActionsProps = {
  hasActiveSub: boolean;
  status: string | null;
};

export default function BillingActions({
  hasActiveSub,
  status,
}: BillingActionsProps) {
  const [loadingPlan, setLoadingPlan] = useState<"monthly" | "annual" | null>(
    null
  );
  const [portalLoading, setPortalLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function startCheckout(plan: "monthly" | "annual") {
    try {
      setError(null);
      setLoadingPlan(plan);

      const res = await fetch("/api/stripe/create-checkout-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan }),
      });

      const json = await res.json();
      if (!res.ok || !json?.url) {
        throw new Error(json?.error || "Unable to start checkout");
      }

      window.location.href = json.url as string;
    } catch (err: any) {
      console.error("[billing] checkout error", err);
      setError(err?.message || "Internal server error");
    } finally {
      setLoadingPlan(null);
    }
  }

  async function openPortal() {
    try {
      setError(null);
      setPortalLoading(true);

      const res = await fetch("/api/stripe/create-portal-session", {
        method: "POST",
      });
      const json = await res.json();

      if (!res.ok || !json?.url) {
        throw new Error(json?.error || "Unable to open billing portal");
      }

      window.location.href = json.url as string;
    } catch (err: any) {
      console.error("[billing] portal error", err);
      setError(err?.message || "Internal server error");
    } finally {
      setPortalLoading(false);
    }
  }

  let statusLabel = "No subscription";
  if (status === "active" || status === "trialing") statusLabel = "Active";
  else if (status === "past_due") statusLabel = "Payment issue";
  else if (status === "incomplete" || status === "incomplete_expired")
    statusLabel = "Incomplete";

  const showSubscribeButtons = !hasActiveSub;

  return (
    <>
      {/* Status pill / message */}
      <div className="mb-4">
        <span className="inline-flex items-center rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">
          Subscription status:{" "}
          <span className="ml-1 font-semibold">{statusLabel}</span>
        </span>
      </div>

      {/* Plans row */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Monthly card */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-xs font-semibold text-slate-500 tracking-wide mb-2">
            MONTHLY
          </p>
          <div className="flex items-baseline gap-1 mb-2">
            <span className="text-3xl font-bold">£9.99</span>
            <span className="text-sm text-slate-500">/ month</span>
          </div>
          <p className="text-sm text-slate-600 mb-4">
            Ideal while you&apos;re testing TempTake in a single kitchen.
          </p>
          <button
            type="button"
            onClick={() => startCheckout("monthly")}
            disabled={!showSubscribeButtons || loadingPlan === "monthly"}
            className={`w-full rounded-full px-4 py-2 text-sm font-medium text-white transition ${
              showSubscribeButtons
                ? "bg-emerald-600 hover:bg-emerald-700"
                : "bg-slate-400 cursor-not-allowed"
            }`}
          >
            {loadingPlan === "monthly"
              ? "Starting monthly subscription…"
              : showSubscribeButtons
              ? "Start monthly subscription"
              : "Subscription already active"}
          </button>
        </div>

        {/* Annual card */}
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6 shadow-sm">
          <p className="inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-800 mb-3">
            Best value
          </p>
          <div className="flex items-baseline gap-1 mb-2">
            <span className="text-3xl font-bold">£99</span>
            <span className="text-sm text-slate-700">/ year</span>
          </div>
          <p className="text-sm text-slate-700 mb-4">
            Equivalent to £8.25/month. Pay once, forget about it for the year.
          </p>
          <button
            type="button"
            onClick={() => startCheckout("annual")}
            disabled={!showSubscribeButtons || loadingPlan === "annual"}
            className={`w-full rounded-full px-4 py-2 text-sm font-medium text-amber-900 transition ${
              showSubscribeButtons
                ? "bg-amber-400 hover:bg-amber-500"
                : "bg-amber-200 cursor-not-allowed"
            }`}
          >
            {loadingPlan === "annual"
              ? "Starting annual subscription…"
              : showSubscribeButtons
              ? "Start annual subscription"
              : "Subscription already active"}
          </button>
        </div>
      </div>

      {/* Manage subscription / portal */}
      <div className="mt-8 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <p className="text-sm font-medium mb-2">Manage your subscription</p>
        <p className="text-xs text-slate-600 mb-4">
          If you already have an active subscription, you can update your card,
          view invoices or cancel via the Stripe billing portal.
        </p>
        <button
          type="button"
          onClick={openPortal}
          disabled={portalLoading}
          className="inline-flex items-center rounded-full bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-60"
        >
          {portalLoading ? "Opening billing portal…" : "Open billing portal"}
        </button>

        {error && (
          <p className="mt-2 text-xs text-red-600">
            {error || "Internal server error"}
          </p>
        )}
      </div>

      <p className="mt-6 text-[11px] text-slate-500">
        For early access / founding kitchens on custom deals, you can still be
        billed manually or set up a separate agreement. This page is for the
        standard self-serve plan.
      </p>
    </>
  );
}


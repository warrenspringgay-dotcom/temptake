// src/app/billing/page.tsx
"use client";

import { useState } from "react";

async function postJson(url: string, body?: any) {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data?.error || "Request failed");
  }
  return res.json();
}

export default function BillingPage() {
  const [loading, setLoading] = useState<null | "monthly" | "annual" | "portal">(
    null
  );
  const [error, setError] = useState<string | null>(null);

  async function startCheckout(plan: "monthly" | "annual") {
    try {
      setError(null);
      setLoading(plan);
      const data = await postJson("/api/stripe/create-checkout-session", { plan });
      if (data?.url) {
        window.location.href = data.url;
      } else {
        throw new Error("No checkout URL returned");
      }
    } catch (err: any) {
      setError(err?.message ?? "Something went wrong");
      setLoading(null);
    }
  }

  async function openPortal() {
    try {
      setError(null);
      setLoading("portal");
      const data = await postJson("/api/stripe/create-portal-session");
      if (data?.url) {
        window.location.href = data.url;
      } else {
        throw new Error("No portal URL returned");
      }
    } catch (err: any) {
      setError(err?.message ?? "Something went wrong");
      setLoading(null);
    }
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="text-2xl font-semibold text-slate-900">
        TempTake subscription
      </h1>
      <p className="mt-2 text-sm text-slate-600">
        Choose a plan for your kitchen. You can switch or cancel any time in the
        Stripe billing portal.
      </p>

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <div className="flex flex-col rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
            Monthly
          </div>
          <div className="mt-2 text-3xl font-semibold text-slate-900">
            £9.99
            <span className="text-sm font-normal text-slate-500"> / month</span>
          </div>
          <p className="mt-2 text-sm text-slate-600">
            Ideal while you&apos;re testing TempTake in a single kitchen.
          </p>
          <button
            type="button"
            onClick={() => startCheckout("monthly")}
            disabled={loading !== null}
            className="mt-4 inline-flex items-center justify-center rounded-xl bg-emerald-500 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-emerald-600 disabled:opacity-60"
          >
            {loading === "monthly" ? "Redirecting..." : "Start monthly subscription"}
          </button>
        </div>

        <div className="flex flex-col rounded-2xl border border-amber-300 bg-amber-50 p-4 shadow-sm">
          <div className="inline-flex w-fit items-center rounded-full bg-amber-200 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-amber-900">
            Best value
          </div>
          <div className="mt-2 text-3xl font-semibold text-slate-900">
            £99
            <span className="text-sm font-normal text-slate-500"> / year</span>
          </div>
          <p className="mt-2 text-sm text-slate-700">
            Equivalent to £8.25/month. Pay once, forget about it for the year.
          </p>
          <button
            type="button"
            onClick={() => startCheckout("annual")}
            disabled={loading !== null}
            className="mt-4 inline-flex items-center justify-center rounded-xl bg-amber-500 px-4 py-2 text-sm font-semibold text-amber-950 shadow-sm hover:bg-amber-600 disabled:opacity-60"
          >
            {loading === "annual" ? "Redirecting..." : "Start annual subscription"}
          </button>
        </div>
      </div>

      <div className="mt-8 rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-700">
        <h2 className="text-sm font-semibold text-slate-900">
          Manage your subscription
        </h2>
        <p className="mt-1 text-sm text-slate-600">
          If you already have an active subscription, you can update your card,
          view invoices or cancel via the Stripe billing portal.
        </p>
        <button
          type="button"
          onClick={openPortal}
          disabled={loading !== null}
          className="mt-3 inline-flex items-center justify-center rounded-xl border border-slate-300 bg-slate-50 px-4 py-2 text-xs font-semibold text-slate-800 hover:bg-slate-100 disabled:opacity-60"
        >
          {loading === "portal" ? "Opening..." : "Open billing portal"}
        </button>

        {error && (
          <p className="mt-2 text-xs text-red-600">
            {error}
          </p>
        )}
      </div>

      <p className="mt-4 text-xs text-slate-500">
        For early access / founding kitchens on custom deals, you can still be
        billed manually or set up a separate agreement. This page is for the
        standard self-serve plan.
      </p>
    </div>
  );
}

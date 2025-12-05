"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getBillingStatusClient } from "@/lib/billingClient"; // ← You already have this from earlier work

type BillingInfo = {
  status: string | null;
  trialEndsAt: string | null;
  planName: string | null;
};

export default function WelcomeBanner() {
  const [billing, setBilling] = useState<BillingInfo | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const data = await getBillingStatusClient();
        setBilling({
          status: data?.status ?? null,
          trialEndsAt: data?.trial_ends_at ?? null,
          planName: data?.plan_name ?? null,
        });
      } catch {
        setBilling(null);
      }
    }
    load();
  }, []);

  // ========== UI LOGIC ==========
  let banner = null;

  if (billing) {
    const s = billing.status;
    const trialEnd = billing.trialEndsAt
      ? new Date(billing.trialEndsAt)
      : null;

    if (s === "trialing" && trialEnd) {
      const daysLeft = Math.ceil(
        (trialEnd.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
      );

      banner = (
        <div className="rounded-xl bg-amber-50 border border-amber-200 p-4 text-amber-900">
          <p className="font-semibold">
            Your free trial is active — {daysLeft} day{daysLeft !== 1 ? "s" : ""} remaining.
          </p>
          <p className="text-sm mt-1">
            Trial ends on {trialEnd.toLocaleDateString("en-GB")}.{" "}
            <Link href="/billing" className="underline">
              Manage subscription
            </Link>
          </p>
        </div>
      );
    }

    if (s === "past_due" || s === "unpaid") {
      banner = (
        <div className="rounded-xl bg-red-50 border border-red-200 p-4 text-red-800">
          <p className="font-semibold">Payment required</p>
          <p className="text-sm mt-1">
            Your subscription needs attention.{" "}
            <Link href="/billing" className="underline font-semibold">
              Update payment details
            </Link>
          </p>
        </div>
      );
    }

    if (s === "active") {
      banner = (
        <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-4 text-emerald-900">
          <p className="font-semibold">
            Subscription active — {billing.planName}
          </p>
          <p className="text-sm mt-1">
            Thank you for being a TempTake customer!
          </p>
        </div>
      );
    }

    if (s === null) {
      banner = (
        <div className="rounded-xl bg-slate-50 border border-slate-200 p-4 text-slate-700">
          <p className="font-semibold">No subscription yet</p>
          <p className="text-sm mt-1">
            Start your trial to unlock temperatures, cleaning, allergens and full reporting.{" "}
            <Link href="/billing" className="underline font-semibold">
              Choose a plan
            </Link>
          </p>
        </div>
      );
    }
  }

  return (
    <div className="space-y-4">
      {banner}

      <div className="rounded-xl bg-white border p-6 shadow-sm">
        <h1 className="text-xl font-semibold">Welcome to TempTake 👋</h1>
        <p className="text-slate-600 mt-1">
          Your daily food safety checks all in one place.
        </p>
      </div>
    </div>
  );
}

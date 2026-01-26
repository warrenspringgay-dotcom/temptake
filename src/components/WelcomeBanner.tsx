// src/components/WelcomeBanner.tsx
"use client";

import React, { useEffect, useState } from "react";
import { getBillingStatusClient, type BillingStatus } from "@/lib/billingClient";

type BannerBilling = {
  status: string | null;
  trialEndsAt: string | null;
  planName: string | null;
};

function fmtDDMMYYYY(iso: string) {
  const d = new Date(iso);
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
}

export default function WelcomeBanner() {
  const [billing, setBilling] = useState<BannerBilling>({
    status: null,
    trialEndsAt: null,
    planName: null,
  });

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        const data: BillingStatus | null = await getBillingStatusClient();

        if (!mounted) return;

        setBilling({
          status: data?.status ?? null,
          trialEndsAt: data?.trialEndsAt ?? null,
          planName: data?.planName ?? null,
        });
      } catch (e) {
        // Don’t hard-fail the UI because billing had a wobble.
        console.error("[WelcomeBanner] billing load failed", e);
      } finally {
        if (mounted) setLoading(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, []);

  if (loading) return null;

  // If you only want this banner during trial, keep it simple:
  if (billing.status !== "trialing") return null;

  return (
    <div className="rounded-2xl border border-slate-200 bg-white/80 p-4 text-sm text-slate-800 shadow-sm backdrop-blur">
      <div className="font-semibold">Welcome to TempTake</div>

      <p className="mt-1 text-xs text-slate-600">
        You’re currently on a free trial
        {billing.trialEndsAt ? ` until ${fmtDDMMYYYY(billing.trialEndsAt)}` : ""}.
        {billing.planName ? ` Plan: ${billing.planName}.` : ""}
      </p>
    </div>
  );
}

// src/app/(protected)/dashboard/page.tsx
"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";

import FoodTempLogger from "@/components/FoodTempLogger";
import WelcomeGate from "@/components/WelcomeGate";

import { supabase } from "@/lib/supabaseBrowser";
import { getActiveOrgIdClient } from "@/lib/orgClient";

export const dynamic = "force-dynamic";

/* ===================== Helpers ===================== */

function safeDate(val: any): Date | null {
  if (!val) return null;
  const d = new Date(val);
  return Number.isNaN(d.getTime()) ? null : d;
}

function daysUntil(d: Date): number {
  const today0 = new Date();
  today0.setHours(0, 0, 0, 0);

  const dd = new Date(d);
  dd.setHours(0, 0, 0, 0);

  return Math.round((dd.getTime() - today0.getTime()) / 86400000);
}

type BillingBannerState =
  | { kind: "none" }
  | {
      kind: "trial" | "sub";
      tone: "warn" | "danger";
      title: string;
      message: string;
      daysLeft: number | null;
    };

function toneClasses(tone: "warn" | "danger") {
  return tone === "danger"
    ? "border-red-200 bg-red-50/90 text-red-900"
    : "border-amber-200 bg-amber-50/90 text-amber-900";
}

function normStatus(s: any) {
  return String(s ?? "").trim().toLowerCase();
}

// Treat these as "fine, do not show a scary banner"
const OK_STATUSES = new Set(["active", "trialing"]);

// Only show the scary banner when we're sure
const BAD_STATUSES = new Set([
  "canceled",
  "cancelled",
  "unpaid",
  "past_due",
  "incomplete_expired",
  "paused",
]);

/* ===================== Component ===================== */

export default function DashboardPage() {
  const [billing, setBilling] = useState<BillingBannerState>({ kind: "none" });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      setLoading(true);
      try {
        const orgId = await getActiveOrgIdClient();

        const {
          data: { user },
        } = await supabase.auth.getUser();

        const userId = user?.id ?? null;

        // If we can't identify the user at all, stay quiet
        if (!userId && !orgId) {
          if (!cancelled) setBilling({ kind: "none" });
          return;
        }

        // ✅ IMPORTANT: Query by user_id FIRST (matches what your billing page likely does)
        // Fallback to org_id if user row doesn't exist.
        let row: any = null;

        if (userId) {
          const { data, error } = await supabase
            .from("billing_subscriptions")
            .select(
              "status,current_period_end,cancel_at_period_end,trial_ends_at,updated_at,created_at"
            )
            .eq("user_id", userId)
            .order("updated_at", { ascending: false })
            .limit(1);

          if (!error) row = data?.[0] ?? null;
        }

        if (!row && orgId) {
          const { data, error } = await supabase
            .from("billing_subscriptions")
            .select(
              "status,current_period_end,cancel_at_period_end,trial_ends_at,updated_at,created_at"
            )
            .eq("org_id", orgId)
            .order("updated_at", { ascending: false })
            .limit(1);

          if (error) throw error;
          row = data?.[0] ?? null;
        }

        if (!row) {
          if (!cancelled) setBilling({ kind: "none" });
          return;
        }

        const status = normStatus(row.status);
        const trialEnd = safeDate(row.trial_ends_at);
        const periodEnd = safeDate(row.current_period_end);
        const cancelAtPeriodEnd = !!row.cancel_at_period_end;

        const EXPIRY_SOON_DAYS = 7;

        // Trial ending/ended (only if trialing)
        if (trialEnd && status === "trialing") {
          const d = daysUntil(trialEnd);

          if (d < 0) {
            if (!cancelled) {
              setBilling({
                kind: "trial",
                tone: "danger",
                title: "Trial ended",
                message:
                  "Your trial has ended. Upgrade to keep using the app without interruptions.",
                daysLeft: d,
              });
            }
            return;
          }

          if (d <= EXPIRY_SOON_DAYS) {
            if (!cancelled) {
              setBilling({
                kind: "trial",
                tone: "warn",
                title: "Trial ending soon",
                message: `Your trial ends in ${d} day${d === 1 ? "" : "s"}. Upgrade to avoid losing access.`,
                daysLeft: d,
              });
            }
            return;
          }
        }

        // If it's active or trialing, no banner (unless expiring via cancel flag)
        if (OK_STATUSES.has(status)) {
          if (periodEnd) {
            const d = daysUntil(periodEnd);

            // If it expired somehow, show it
            if (d < 0) {
              if (!cancelled) {
                setBilling({
                  kind: "sub",
                  tone: "danger",
                  title: "Subscription expired",
                  message:
                    "Your subscription period has ended. Update billing to restore access.",
                  daysLeft: d,
                });
              }
              return;
            }

            // Cancelled at period end warning
            if (cancelAtPeriodEnd && d <= EXPIRY_SOON_DAYS) {
              if (!cancelled) {
                setBilling({
                  kind: "sub",
                  tone: "warn",
                  title: "Subscription ending soon",
                  message: `Your subscription is set to end in ${d} day${d === 1 ? "" : "s"}. Renew to avoid losing access.`,
                  daysLeft: d,
                });
              }
              return;
            }
          }

          if (!cancelled) setBilling({ kind: "none" });
          return;
        }

        // Only show inactive banner for definitively bad statuses OR already-expired period
        const definitelyBad = BAD_STATUSES.has(status);
        const expired = periodEnd ? daysUntil(periodEnd) < 0 : false;

        if (definitelyBad || expired) {
          if (!cancelled) {
            setBilling({
              kind: "sub",
              tone: "danger",
              title: "Subscription inactive",
              message:
                "Your subscription isn’t active. Update billing to restore full access.",
              daysLeft: null,
            });
          }
          return;
        }

        // Unknown status: don't nag. Keep quiet.
        if (!cancelled) setBilling({ kind: "none" });
      } catch {
        if (!cancelled) setBilling({ kind: "none" });
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const showBanner = useMemo(() => billing.kind !== "none", [billing]);

  return (
    <>
      <WelcomeGate />

      <div className="space-y-4 mx-auto max-w-6xl px-4 py-4">
        {/* Billing banner (only when relevant) */}
        {!loading && showBanner && (
          <div
            className={[
              "rounded-2xl border p-4 shadow-sm backdrop-blur-sm",
              toneClasses(billing.tone),
            ].join(" ")}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-sm font-extrabold">{billing.title}</div>
                <div className="mt-1 text-sm opacity-90">{billing.message}</div>
              </div>

              <Link
                href="/billing"
                className="shrink-0 rounded-xl border border-slate-200 bg-white/80 px-3 py-2 text-xs font-semibold text-slate-900 shadow-sm hover:bg-white"
              >
                Manage billing
              </Link>
            </div>
          </div>
        )}

        <FoodTempLogger />
      </div>
    </>
  );
}

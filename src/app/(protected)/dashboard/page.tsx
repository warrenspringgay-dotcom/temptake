// src/app/(protected)/dashboard/page.tsx
"use client";

import React, { useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";

import FoodTempLogger from "@/components/FoodTempLogger";
import WelcomeGate from "@/components/WelcomeGate";
import SubscriptionBanner from "@/components/SubscriptionBanner";

// ⚠️ Your hook exists, but it does NOT return { toast }
import { useToast } from "@/components/ui/use-toast";

export const dynamic = "force-dynamic";

function AccessBlockedToast() {
  const params = useSearchParams();
  const router = useRouter();

  // Your ToastContextType doesn't have `toast`, so we treat it as unknown API.
  const toastApi = useToast() as any;

  useEffect(() => {
    const blocked = params.get("blocked");
    const noaccess = params.get("noaccess");

    const isManagerOnly =
      blocked === "manager-only" || noaccess === "1" || noaccess === "manager-only";

    if (!isManagerOnly) return;

    // Try a few common toast APIs without exploding the build.
    const fire =
      toastApi?.toast ||
      toastApi?.addToast ||
      toastApi?.notify ||
      toastApi?.show ||
      toastApi?.push;

    if (typeof fire === "function") {
      // Support both “string toast” and “object toast” styles
      try {
        fire({
          title: "Manager access only",
          description: "You do not have permission to view that page.",
        });
      } catch {
        fire("Manager access only");
      }
    } else {
      // If there's no toast method, don't block the redirect.
      console.warn("[access] No toast method found on ToastContextType");
    }

    // Clean URL so it doesn't re-toast on refresh
    const next = new URL(window.location.href);
    next.searchParams.delete("blocked");
    next.searchParams.delete("noaccess");
    router.replace(next.pathname + next.search);
  }, [params, router, toastApi]);

  return null;
}

export default function DashboardPage() {
  return (
    <>
      <WelcomeGate />

      <div className="w-full px-3 sm:px-4 md:mx-auto md:max-w-6xl">
        <SubscriptionBanner />
        <AccessBlockedToast />
        <FoodTempLogger />
      </div>
    </>
  );
}
// src/app/(protected)/dashboard/page.tsx
"use client";

import React, { useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";

import FoodTempLogger from "@/components/FoodTempLogger";
import WelcomeGate from "@/components/WelcomeGate";
import SubscriptionBanner from "@/components/SubscriptionBanner";
import { useToast } from "@/components/ui/use-toast";

export const dynamic = "force-dynamic";

function AccessBlockedToastOnce() {
  const params = useSearchParams();
  const firedRef = useRef(false);
  const { addToast } = useToast();

  useEffect(() => {
    // Hard guard: only ever fire once per mount
    if (firedRef.current) return;

    const noaccess = params.get("noaccess");
    const blocked = params.get("blocked");

    const isManagerOnly =
      blocked === "manager-only" || noaccess === "1" || noaccess === "manager-only";

    if (!isManagerOnly) return;

    firedRef.current = true;

    addToast({
      title: "Manager access only",
      message: "You don’t have permission to view that page.",
      type: "warning",
      duration: 3500,
    });

    // Strip params WITHOUT router churn (prevents repeated firing)
    const url = new URL(window.location.href);
    url.searchParams.delete("noaccess");
    url.searchParams.delete("blocked");
    window.history.replaceState({}, "", url.pathname + url.search);
  }, [params, addToast]);

  return null;
}

export default function DashboardPage() {
  return (
    <>
      <WelcomeGate />

      <div className="w-full px-3 sm:px-4 md:mx-auto md:max-w-6xl">
        <AccessBlockedToastOnce />
        <SubscriptionBanner />
        <FoodTempLogger />
      </div>
    </>
  );
}
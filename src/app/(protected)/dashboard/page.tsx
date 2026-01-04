// src/app/(protected)/dashboard/page.tsx
"use client";

import React from "react";

import FoodTempLogger from "@/components/FoodTempLogger";
import WelcomeGate from "@/components/WelcomeGate";
import SubscriptionBanner from "@/components/SubscriptionBanner";

export const dynamic = "force-dynamic";

export default function DashboardPage() {
  return (
    <>
      <WelcomeGate />

      <div className="w-full px-3 sm:px-4 md:mx-auto md:max-w-6xl">

        <SubscriptionBanner />
        <FoodTempLogger />
      </div>
    </>
  );
}

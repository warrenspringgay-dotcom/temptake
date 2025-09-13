// src/app/dashboard/page.tsx
import React from "react";
import FoodTempLogger from "@/components/FoodTempLogger";

export const dynamic = "force-static";

export default function DashboardPage() {
  return (
    <main className="mx-auto max-w-6xl p-4 space-y-6">
      <h1 className="text-xl font-semibold">Dashboard</h1>
      <FoodTempLogger />
    </main>
  );
}

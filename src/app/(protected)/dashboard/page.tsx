// src/app/(protected)/dashboard/page.tsx
"use client";

// src/app/(protected)/dashboard/page.tsx
import FoodTempLogger from "@/components/FoodTempLogger";

export const dynamic = "force-dynamic";

export default function DashboardPage() {
  return (
    <main className="p-4 space-y-6">
      <FoodTempLogger />
    </main>
  );
}

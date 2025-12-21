// src/app/(protected)/dashboard/page.tsx
import FoodTempLogger from "@/components/FoodTempLogger";
import SubscriptionBanner from "@/components/SubscriptionBanner";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  return (
    <div className="space-y-6">
      <SubscriptionBanner />
      <FoodTempLogger />
    </div>
  );
}

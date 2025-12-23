// src/app/(protected)/dashboard/page.tsx
import FoodTempLogger from "@/components/FoodTempLogger";
import SubscriptionBanner from "@/components/SubscriptionBanner";
import TrialBanner from "@/components/TrialBanner";
import WelcomeGate from "@/components/WelcomeGate";

export const dynamic = "force-dynamic";

export default function DashboardPage() {
  return (
    <>
      <WelcomeGate />
      <div className="space-y-4 mx-auto max-w-6xl px-4 py-4">
        <TrialBanner />
        <SubscriptionBanner />
        <FoodTempLogger />
      </div>
    </>
  );
}

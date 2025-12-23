// src/app/(protected)/dashboard/page.tsx
import FoodTempLogger from "@/components/FoodTempLogger";
import SubscriptionBanner from "@/components/SubscriptionBanner";
import TrialBanner from "@/components/TrialBanner";
import WelcomePopup from "@/components/WelcomePopup";
import { getUserOrNull } from "@/app/actions/auth";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const user = await getUserOrNull();

  return (
    <>
      <WelcomePopup user={user} />
      <div className="space-y-4 mx-auto max-w-6xl px-4 py-4">
        <TrialBanner />
        <SubscriptionBanner />
        <FoodTempLogger />
      </div>
    </>
  );
}

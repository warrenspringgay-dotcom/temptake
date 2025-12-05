// src/app/(protected)/dashboard/page.tsx
import WelcomeBanner from "@/components/WelcomeBanner";
import FoodTempLogger from "@/components/FoodTempLogger";
import { ensureOrgForCurrentUser } from "@/lib/ensureOrg";
import SubscriptionBanner from "@/components/SubscriptionBanner"; // ← ADD THIS

// Force server-side rendering so we can safely call Supabase + ensureOrg
export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  // Ensure this user has an org + membership before we render dashboard
  await ensureOrgForCurrentUser();

  return (
    <div className="space-y-6">
      {/* 🔔 Trial / billing banner */}
      <SubscriptionBanner />

      <FoodTempLogger />
    </div>
  );
}

// src/app/(protected)/leaderboard/page.tsx
import EnsureOrgClient from "@/components/EnsureOrgClient";
import Leaderboard from "@/app/(protected)/Leaderboard/Leaderboard";
import TempFab from "@/components/QuickActionsFab";

export const dynamic = "force-dynamic";

export default async function LeaderboardPage() {
  return (
    <>
      <EnsureOrgClient />
      <div className="space-y-6">
        <Leaderboard />
      </div>

      {/* Fixed FAB bottom-right, sits above the page content */}
      <TempFab />
    </>
  );
}

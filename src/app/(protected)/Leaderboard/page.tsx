// src/app/(protected)/leaderboard/page.tsx
import Leaderboard from "@/app/(protected)/Leaderboard/Leaderboard";
import TempFab from "@/components/QuickActionsFab";
import { ensureOrgForCurrentUser } from "@/lib/ensureOrg";




// keep this so we can safely call Supabase / org helpers
export const dynamic = "force-dynamic";

export default async function LeaderboardPage() {
  // same pattern as dashboard
  await ensureOrgForCurrentUser();

  return (
    <>
      <div className="space-y-6">
        <Leaderboard />
      </div>

      {/* Fixed FAB bottom-right, sits above the page content */}
      <TempFab />
    </>
  );
}

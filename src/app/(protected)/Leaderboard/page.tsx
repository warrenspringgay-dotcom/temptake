// src/app/(protected)/leaderboard/page.tsx
import Leaderboard from "@/app/(protected)/Leaderboard/Leaderboard";
import TempFab from "@/components/QuickActionsFab";

export const dynamic = "force-dynamic";

export default async function LeaderboardPage() {
  return (
    <>
    
      <div className="w-full -mx-3 px-3 sm:mx-0 sm:px-4 md:mx-auto md:max-w-6xl">

        <Leaderboard />
      </div>

      {/* Fixed FAB bottom-right, sits above the page content */}
      <TempFab />
    </>
  );
}

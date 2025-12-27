// src/app/(protected)/leaderboard/page.tsx
import Leaderboard from "@/app/(protected)/Leaderboard/Leaderboard";
import TempFab from "@/components/QuickActionsFab";

export const dynamic = "force-dynamic";

export default async function LeaderboardPage() {
  return (
    <>
    
     

        <Leaderboard />
    

      {/* Fixed FAB bottom-right, sits above the page content */}
      <TempFab />
    </>
  );
}

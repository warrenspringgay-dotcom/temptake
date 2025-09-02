// src/app/team/page.tsx
import AuthGate from "@/components/AuthGate";
import TeamManagerLocal from "@/components/TeamManagerLocal"; // or "@/components/TeamManager"

export const metadata = {
  title: "Team & Training – TempTake",
};

export default function TeamPage() {
  return (
    <AuthGate requireRole="manager">
      <TeamManagerLocal />
    </AuthGate>
  );
}

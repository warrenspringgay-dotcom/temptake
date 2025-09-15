// src/app/team/page.tsx
import AuthGate from "@/components/AuthGate";
import TeamManagerLocal from "@/components/TeamManagerLocal"; // your current local/benchmarked UI

export default async function TeamPage() {
  return (
    <AuthGate requireRole="staff">
      <TeamManagerLocal />
    </AuthGate>
  );
}

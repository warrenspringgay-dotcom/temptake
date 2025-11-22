// src/app/(protected)/layout.tsx
import { redirect } from "next/navigation";
import { getUserOrNull } from "@/app/actions/auth";
import TempFab from "@/components/QuickActionsFab";
import LinkUserToTeamMember from "@/components/LinkUserToTeamMember";

export default async function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getUserOrNull();
  if (!user) redirect("/login");

  return (
    <>
      {/* Auto-link logged-in user → team_members.user_id */}
      <LinkUserToTeamMember />

      {children}

      {/* Floating quick-entry button on all protected pages */}
      <TempFab />
    </>
  );
}

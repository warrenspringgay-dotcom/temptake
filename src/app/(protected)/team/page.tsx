// src/app/(protected)/team/page.tsx
import type { Metadata } from "next";
import TeamManager from "@/components/TeamManager";
import OnboardingBanner from "@/components/OnboardingBanner";

export const metadata: Metadata = { title: "Team · TempTake" };

export default function TeamPage() {
  return (
    <>

      <OnboardingBanner />
      <TeamManager />
    </>
  );
}

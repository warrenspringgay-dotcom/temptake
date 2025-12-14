// src/app/(protected)/team/page.tsx
import type { Metadata } from "next";
import TeamManager from "@/components/TeamManager";
import OnboardingBanner from "@/components/OnboardingBanner";

export const metadata: Metadata = { title: "Team · TempTake" };

export default function TeamPage() {
  return (
    <div className="mx-auto max-w-5xl px-3 sm:px-4 pt-2 pb-4 space-y-4">
      <OnboardingBanner />
      <TeamManager />
    </div>
  );
}

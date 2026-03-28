import type { Metadata } from "next";
import TrainingHub from "@/components/TrainingHub";
import OnboardingBanner from "@/components/OnboardingBanner";

export const metadata: Metadata = { title: "Training Hub · TempTake" };

export default function TrainingHubPage() {
  return (
    <>
      <OnboardingBanner />
      <TrainingHub />
    </>
  );
}
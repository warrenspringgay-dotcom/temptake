// src/app/(protected)/routines/page.tsx
import type { Metadata } from "next";
import RoutinesManager from "@/components/RoutinesManager";
import OnboardingBanner from "@/components/OnboardingBanner";

export const metadata: Metadata = { title: "Routines · TempTake" };

export default function RoutinesPage() {
  return (
  
    <div className="mx-auto max-w-5xl px-3 sm:px-4 pt-2 pb-4 space-y-4">
          <OnboardingBanner />
  
  <RoutinesManager />;

  </div>
  );
}

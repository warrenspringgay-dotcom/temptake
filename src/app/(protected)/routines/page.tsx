// src/app/(protected)/routines/page.tsx
import type { Metadata } from "next";
import RoutinesManager from "@/components/RoutinesManager";
import OnboardingBanner from "@/components/OnboardingBanner";

export const metadata: Metadata = { title: "Routines · TempTake" };

export default function RoutinesPage() {
  return (
  
    <div className="w-full px-3 sm:px-4 md:mx-auto md:max-w-6xl">

          <OnboardingBanner />
  
  <RoutinesManager />;

  </div>
  );
}

// src/app/(protected)/routines/page.tsx
import type { Metadata } from "next";
import RoutinesManager from "@/components/RoutinesManager";
import OnboardingBanner from "@/components/OnboardingBanner";

export const metadata: Metadata = { title: "Routines · TempTake" };

export default function RoutinesPage() {
  return (
  
    <>

          <OnboardingBanner />
  
  <RoutinesManager />;

  </>
  );
}

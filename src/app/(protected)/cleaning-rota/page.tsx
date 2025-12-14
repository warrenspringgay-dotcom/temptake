// app/(protected)/cleaning-rota/page.tsx
"use client";

import dynamic from "next/dynamic";

import CleaningRota from "@/components/CleaningRota";
import OnboardingBanner from "@/components/OnboardingBanner";

export default function CleaningRotaPage() {
  return (
  <div className="mx-auto max-w-5xl px-3 sm:px-4 pt-2 pb-4 space-y-4">
        <OnboardingBanner />
        
        
  
  <CleaningRota />;
 
         </div> 
  );
}

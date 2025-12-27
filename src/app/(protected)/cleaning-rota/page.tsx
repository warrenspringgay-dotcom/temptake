// app/(protected)/cleaning-rota/page.tsx
"use client";

import dynamic from "next/dynamic";

import CleaningRota from "@/components/CleaningRota";
import OnboardingBanner from "@/components/OnboardingBanner";

export default function CleaningRotaPage() {
  return (
  <div className="w-full px-3 sm:px-4 md:mx-auto md:max-w-6xl">

        <OnboardingBanner />
        
        
  
  <CleaningRota />;
 
         </div> 
  );
}

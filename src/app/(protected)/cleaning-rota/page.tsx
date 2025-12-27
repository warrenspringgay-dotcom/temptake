// app/(protected)/cleaning-rota/page.tsx
"use client";

import dynamic from "next/dynamic";

import CleaningRota from "@/components/CleaningRota";
import OnboardingBanner from "@/components/OnboardingBanner";

export default function CleaningRotaPage() {
  return (
  <>

        <OnboardingBanner />
        
        
  
  <CleaningRota />;
 
         </> 
  );
}

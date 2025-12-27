// src/app/(protected)/allergens/page.tsx
"use client";

import AllergenManager from "@/components/AllergenManager";

import OnboardingBanner from "@/components/OnboardingBanner";


export default function AllergensPage() {
  return (
   <div className="w-full px-3 sm:px-4 md:mx-auto md:max-w-6xl">

      <OnboardingBanner />
       <AllergenManager />
       </div>
       );
}


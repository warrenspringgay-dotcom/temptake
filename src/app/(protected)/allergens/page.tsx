// src/app/(protected)/allergens/page.tsx
"use client";

import AllergenManager from "@/components/AllergenManager";

import OnboardingBanner from "@/components/OnboardingBanner";


export default function AllergensPage() {
  return (
   <div className="mx-auto max-w-5xl px-3 sm:px-4 pt-2 pb-4 space-y-4">
      <OnboardingBanner />
       <AllergenManager />
       </div>
       );
}


// src/app/(protected)/allergens/page.tsx
"use client";

import AllergenManager from "@/components/AllergenManager";

import OnboardingBanner from "@/components/OnboardingBanner";

export default function AllergensPage() {
  return (
    <>
      <OnboardingBanner />
      <AllergenManager />
    </>
  );
}


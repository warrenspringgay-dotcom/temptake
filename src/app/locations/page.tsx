// src/app/locations/page.tsx
import React from "react";
import LocationsManager from "@/components/LocationsManager";
import LocationPlanNotice from "@/components/LocationPlanNotice";
import OnboardingBanner from "@/components/OnboardingBanner";

export const dynamic = "force-dynamic";

export default function LocationsPage() {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">
          Locations & Sites
        </h1>
        <p className="mt-1 text-sm text-slate-600">
          Manage the sites for this account. Your choice in the top bar controls
          which location’s logs and cleaning tasks you’re working on.
        </p>
      </div>
  <div className="mx-auto max-w-5xl px-3 sm:px-4 pt-2 pb-4 space-y-4">
        <OnboardingBanner />


  

      <LocationsManager />
    </div>
    </div>
  );
}

// src/app/settings/locations/page.tsx
import LocationsManager from "@/components/LocationsManager";

export const metadata = {
  title: "Locations | TempTake",
};

export default function LocationsPage() {
  return (
    <main className="mx-auto max-w-3xl py-6">
      <LocationsManager />
    </main>
  );
}

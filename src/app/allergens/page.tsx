"use client";
import NavTabs from "@/components/NavTabs";
import AllergenManager from "@/components/AllergenManager";

export default function AllergensPage() {
  return (
    <div className="min-h-screen w-full bg-gray-50">
      <NavTabs />
      <main className="mx-auto max-w-6xl p-4 space-y-4">
        <h1 className="text-lg font-semibold">Allergens</h1>
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
          <AllergenManager />
        </div>
      </main>
    </div>
  );
}

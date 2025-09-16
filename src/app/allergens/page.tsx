// src/app/allergens/page.tsx
import AllergenManager from "@/components/AllergenManager";

export const metadata = { title: "Allergens · TempTake" };

export default function Page() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-6">
      <AllergenManager />
    </div>
  );
}

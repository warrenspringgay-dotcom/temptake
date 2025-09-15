// src/app/allergens/page.tsx
import AuthGate from "@/components/AuthGate";
import AllergenManager from "@/components/AllergenManager";

export default async function AllergensPage() {
  return (
    <AuthGate requireRole="staff">
      <AllergenManager />
    </AuthGate>
  );
}

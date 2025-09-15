// src/app/page.tsx
import AuthGate from "@/components/AuthGate";
import FoodTempLogger from "@/components/FoodTempLogger";

export default async function DashboardPage() {
  return (
    <AuthGate requireRole="staff">
      <FoodTempLogger />
    </AuthGate>
  );
}

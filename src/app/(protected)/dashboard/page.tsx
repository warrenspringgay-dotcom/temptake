// src/app/(protected)/dashboard/page.tsx
import FoodTempLogger from "@/components/FoodTempLogger";

// Server-side route settings (valid only in a server component file)
export const dynamic = "force-dynamic";
export const revalidate = 0;

export default function DashboardPage() {
  return (
    <main className="p-4 space-y-6">
      <FoodTempLogger />
    </main>
  );
}

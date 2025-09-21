// src/app/dashboard/page.tsx
import FoodTempLoggerServer from "@/components/FoodTempLoggerServer";

export default async function DashboardPage() {
  return (
    <main className="mx-auto max-w-6xl p-4 space-y-6">
      <h1 className="text-xl font-semibold">Dashboard</h1>
      <FoodTempLoggerServer />
    </main>
  );
}

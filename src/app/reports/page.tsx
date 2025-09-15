// src/app/reports/page.tsx
export const metadata = { title: "Reports – TempTake" };

export default function ReportsPage() {
  return (
    <div className="px-4 py-6">
      <h1 className="text-lg font-semibold mb-3">Reports</h1>
      <div className="rounded-2xl border border-gray-200 bg-white p-4">
        <p className="text-sm text-gray-600">
          Reports will go here (exports, weekly PDF, KPI charts). Page loads ok.
        </p>
      </div>
    </div>
  );
}

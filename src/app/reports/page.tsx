import AuthGate from "@/components/AuthGate";

export default function ReportsPage() {
  return (
    <AuthGate requireRole="manager">
      <div className="mx-auto w-full max-w-6xl p-4">
        <h1 className="mb-4 text-xl font-semibold">Reports</h1>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-2xl border border-neutral-200 p-4">
            {/* Example card */}
            <h2 className="mb-2 font-medium">Daily Summary</h2>
            <button className="rounded-2xl border border-neutral-300 px-4 py-2 hover:bg-neutral-50">
              View
            </button>
          </div>

          <div className="rounded-2xl border border-neutral-200 p-4">
            <h2 className="mb-2 font-medium">Custom Report</h2>
            <button className="rounded-2xl bg-black px-4 py-2 text-white">
              Export custom report
            </button>
          </div>
        </div>
      </div>
    </AuthGate>
  );
}

// src/app/reports/ReportActionsClient.tsx
"use client";

import { useRouter } from "next/navigation";

export default function ReportActionsClient() {
  const router = useRouter();

  return (
    <div className="mb-4 flex gap-2">
      {/* Current tab */}
      <span className="rounded-xl bg-black px-3 py-1.5 text-sm font-medium text-white">
        Instant audit (90d)
      </span>

      {/* Go to custom report */}
      <button
        type="button"
        onClick={() => router.push("/reports/custom")}
        className="rounded-xl border border-gray-200 bg-white px-3 py-1.5 text-sm hover:bg-gray-50"
      >
        Custom report
      </button>

      {/* Print */}
      <button
        type="button"
        onClick={() => window.print()}
        className="ml-auto rounded-xl border border-gray-200 bg-white px-3 py-1.5 text-sm hover:bg-gray-50"
      >
        Print
      </button>
    </div>
  );
}

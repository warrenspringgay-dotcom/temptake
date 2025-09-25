// src/app/reports/page.tsx
import { Suspense } from "react";
import { getInstantAudit90d } from "@/app/actions/reports";
import PrintButton from "./PrintButton"; // client component

export const dynamic = "force-dynamic";

function SectionPill({ s }: { s: string }) {
  const map: Record<string, string> = { temps: "Temperatures" };
  return (
    <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-700">
      {map[s] || s}
    </span>
  );
}

async function ReportInner() {
  const { rows, range } = await getInstantAudit90d();

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <div className="space-y-0.5">
          <h2 className="text-lg font-semibold">Instant audit (90d)</h2>
          <p className="text-xs text-gray-500">
            Range: {new Date(range.from).toLocaleDateString()} –{" "}
            {new Date(range.to).toLocaleDateString()}
          </p>
        </div>
        <PrintButton />
      </div>

      {rows.length === 0 ? (
        <div className="py-10 text-center text-sm text-gray-500">
          Nothing recorded in the last 90 days.
        </div>
      ) : (
        <div className="divide-y text-sm">
          {rows.map((r) => (
            <div key={r.id} className="flex items-center gap-4 py-3">
              <div className="w-40 shrink-0 text-gray-500">
                {new Date(r.at).toLocaleString()}
              </div>
              <div className="w-28 shrink-0">
                <SectionPill s={r.section} />
              </div>
              <div className="flex-1">{r.title}</div>
              <div className="w-64 shrink-0 text-gray-600">{r.details}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function ReportsPage() {
  return (
    <main className="mx-auto max-w-6xl p-4 space-y-6">
      <h1 className="text-xl font-semibold">Reports</h1>
      <Suspense fallback={<div className="text-sm text-gray-500">Loading…</div>}>
        {/* server sub-tree */}
        <ReportInner />
      </Suspense>
    </main>
  );
}

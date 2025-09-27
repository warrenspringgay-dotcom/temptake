// src/app/reports/page.tsx
import { Suspense } from "react";
import { getInstantAudit90d, type AuditItem } from "@/app/actions/reports";
import PrintButton from "./PrintButton";

export const dynamic = "force-dynamic";

function Badge({ severity }: { severity: AuditItem["severity"] }) {
  const cls =
    severity === "high"
      ? "bg-red-100 text-red-800"
      : severity === "medium"
      ? "bg-amber-100 text-amber-800"
      : "bg-blue-100 text-blue-800";
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${cls}`}>
      {severity.toUpperCase()}
    </span>
  );
}

function fmtDateTime(v: string | null) {
  return v ? new Date(v).toLocaleString() : "—";
}

async function ReportInner() {
  const items = await getInstantAudit90d(); // ← now an array

  // Simple summary
  const counts = items.reduce(
    (acc, it) => {
      acc.total++;
      acc[it.severity]++;
      return acc;
    },
    { total: 0, high: 0, medium: 0, low: 0 } as { total: number; high: number; medium: number; low: number }
  );

  const since = new Date();
  since.setDate(since.getDate() - 90);

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Instant Audit (90 days)</h1>
          <p className="text-sm text-gray-500">Since {since.toLocaleDateString()}</p>
        </div>
        <PrintButton />
      </div>

      <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-xl border p-3">
          <div className="text-xs text-gray-500">Total flags</div>
          <div className="text-xl font-semibold">{counts.total}</div>
        </div>
        <div className="rounded-xl border p-3">
          <div className="text-xs text-gray-500">High</div>
          <div className="text-xl font-semibold">{counts.high}</div>
        </div>
        <div className="rounded-xl border p-3">
          <div className="text-xs text-gray-500">Medium</div>
          <div className="text-xl font-semibold">{counts.medium}</div>
        </div>
        <div className="rounded-xl border p-3">
          <div className="text-xs text-gray-500">Low</div>
          <div className="text-xl font-semibold">{counts.low}</div>
        </div>
      </div>

      <ul className="space-y-3">
        {items.length === 0 ? (
          <li className="text-gray-500">No issues found in the last 90 days.</li>
        ) : (
          items.map((r) => (
            <li key={r.id} className="rounded-lg border border-gray-200 p-3">
              <div className="flex items-start justify-between">
                <div className="text-xs text-gray-500">{fmtDateTime(r.at)}</div>
                <Badge severity={r.severity} />
              </div>
              <div className="mt-1 font-medium">{r.title}</div>
              {r.details ? <div className="text-sm text-gray-700">{r.details}</div> : null}
            </li>
          ))
        )}
      </ul>
    </div>
  );
}

export default function Page() {
  return (
  <Suspense fallback={<div className="rounded-2xl border p-4">Loading report…</div>}>
    <ReportInner />
  </Suspense>
);


}

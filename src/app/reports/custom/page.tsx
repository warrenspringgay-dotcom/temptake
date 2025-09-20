// src/app/reports/custom/page.tsx
import { getCustomReport } from "@/app/actions/reports";
import { Suspense } from "react";

export default function CustomReportPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-6 space-y-4">
      <h1 className="text-[18px] font-semibold">Custom report</h1>
      <Suspense fallback={<div className="text-sm text-gray-500">Loading…</div>}>
        <ReportInner />
      </Suspense>
    </div>
  );
}

async function ReportInner() {
  const to = new Date();
  const from = new Date(to.getTime() - 30 * 864e5);
  const rows = await getCustomReport(from.toISOString(), to.toISOString());

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
      <div className="text-xs text-gray-600">
        Range: <span className="font-medium">{from.toISOString().slice(0,10)}</span> →{" "}
        <span className="font-medium">{to.toISOString().slice(0,10)}</span>
      </div>

      <div className="mt-3 overflow-x-auto">
        <table className="min-w-[720px] w-full text-sm">
          <thead className="bg-gray-50 text-gray-600">
            <tr>
              <th className="px-3 py-2 text-left font-medium">When</th>
              <th className="px-3 py-2 text-left font-medium">Section</th>
              <th className="px-3 py-2 text-left font-medium">Title</th>
              <th className="px-3 py-2 text-left font-medium">Details</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-3 py-6 text-center text-gray-500">
                  No records in range.
                </td>
              </tr>
            ) : (
              rows.map((r) => (
                <tr key={`${r.section}-${r.id}-${r.at}`} className="border-t">
                  <td className="px-3 py-2">{new Date(r.at).toLocaleString()}</td>
                  <td className="px-3 py-2">{r.section}</td>
                  <td className="px-3 py-2">{r.title}</td>
                  <td className="px-3 py-2">{r.details ?? "—"}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

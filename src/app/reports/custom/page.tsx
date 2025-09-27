// src/app/reports/custom/page.tsx
import { getCustomReport } from "@/app/actions/reports";

export const dynamic = "force-dynamic";

export default async function CustomReportPage() {
  const to = new Date();
  const from = new Date(to.getTime() - 30 * 864e5);

  // ✅ pass a single optional object argument
  const rows = await getCustomReport({
    from: from.toISOString(),
    to: to.toISOString(),
  });

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
      <div className="mb-3 text-lg font-semibold">Custom report (last 30 days)</div>

      {rows.length === 0 ? (
        <div className="text-sm text-gray-500">Nothing recorded in this period.</div>
      ) : (
        <ul className="space-y-2">
          {rows.map(r => (
            <li
              key={r.id}
              className="rounded-lg border border-gray-200 p-3"
            >
              <div className="text-xs text-gray-500">
  {r.at ? new Date(r.at).toLocaleString() : "—"}
</div>

            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
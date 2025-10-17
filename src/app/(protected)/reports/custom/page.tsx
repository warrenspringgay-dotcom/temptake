// src/app/(protected)/reports/custom/page.tsx
import { getCustomReport } from "@/app/actions/reports";

export const metadata = { title: "Custom Report – TempTake" };
export const dynamic = "force-dynamic";

export default async function CustomReportPage() {
  // last 30 days by default
  const to = new Date();
  const from = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  const toISO = to.toISOString().slice(0, 10);
  const fromISO = from.toISOString().slice(0, 10);

  // get array of rows
  const items = await getCustomReport({ from: fromISO, to: toISO, limit: 200 });

  // simple counts you can expand later
  const counts = {
    total: items.length,
    pass: items.filter((r: any) => r.status === "pass").length,
    fail: items.filter((r: any) => r.status === "fail").length,
  };

  return (
    <main className="p-4 space-y-6">
      <h1 className="text-xl font-semibold">Custom Report</h1>

      <div className="rounded-xl border bg-white p-4 shadow-sm">
        <div className="text-sm text-gray-600">
          Range: <span className="font-medium">{fromISO}</span> →{" "}
          <span className="font-medium">{toISO}</span>
        </div>
        <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-3">
          <div className="rounded-lg border p-3">
            <div className="text-xs text-gray-500">Total</div>
            <div className="text-lg font-semibold">{counts.total}</div>
          </div>
          <div className="rounded-lg border p-3">
            <div className="text-xs text-gray-500">Pass</div>
            <div className="text-lg font-semibold">{counts.pass}</div>
          </div>
          <div className="rounded-lg border p-3">
            <div className="text-xs text-gray-500">Fail</div>
            <div className="text-lg font-semibold">{counts.fail}</div>
          </div>
        </div>
      </div>

      <div className="rounded-xl border bg-white p-4 shadow-sm overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="text-left text-gray-500">
              <th className="py-2 pr-3">Date/Time</th>
              <th className="py-2 pr-3">Location</th>
              <th className="py-2 pr-3">Item</th>
              <th className="py-2 pr-3">Temp (°C)</th>
              <th className="py-2 pr-3">Target</th>
              <th className="py-2 pr-3">Status</th>
            </tr>
          </thead>
          <tbody>
            {items.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-6 text-center text-gray-500">
                  No rows for this range.
                </td>
              </tr>
            ) : (
              items.map((r: any) => (
                <tr key={r.id} className="border-t">
                  <td className="py-2 pr-3">
                    {r.at?.slice?.(0, 16)?.replace("T", " ") ?? "—"}
                  </td>
                  <td className="py-2 pr-3">{r.area ?? r.location ?? "—"}</td>
                  <td className="py-2 pr-3">{r.note ?? r.item ?? "—"}</td>
                  <td className="py-2 pr-3">
                    {r.temp_c != null ? Number(r.temp_c) : r.temp ?? "—"}
                  </td>
                  <td className="py-2 pr-3">{r.target_key ?? r.target ?? "—"}</td>
                  <td className="py-2 pr-3">
                    {r.status ? (
                      <span
                        className={
                          r.status === "pass"
                            ? "inline-flex rounded-full bg-emerald-100 text-emerald-800 px-2 py-0.5 text-xs font-medium"
                            : "inline-flex rounded-full bg-red-100 text-red-800 px-2 py-0.5 text-xs font-medium"
                        }
                      >
                        {r.status}
                      </span>
                    ) : (
                      "—"
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </main>
  );
}

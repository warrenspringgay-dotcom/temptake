// src/app/reports/custom/page.tsx
import { getCustomReport } from "@/app/actions/reports";

export const metadata = { title: "Custom Report – TempTake" };
export const dynamic = "force-dynamic";

export default async function CustomReportPage() {
  // Example: no filters = latest 200
  const { items, counts } = await getCustomReport({ limit: 200 });

  return (
    <main className="p-4 space-y-6">
      <h1 className="text-xl font-semibold">Custom Report</h1>

      <section className="rounded-2xl border bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-center gap-3 text-sm">
          <span className="inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5">
            Total: {counts.total}
          </span>
          <span className="inline-flex items-center rounded-full bg-emerald-100 text-emerald-800 px-2 py-0.5">
            Pass: {counts.pass}
          </span>
          <span className="inline-flex items-center rounded-full bg-red-100 text-red-800 px-2 py-0.5">
            Fail: {counts.fail}
          </span>
          <span className="inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5">
            Locations: {counts.locations}
          </span>
        </div>

        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="text-left text-gray-500">
                <th className="py-2 pr-3">When</th>
                <th className="py-2 pr-3">Initials</th>
                <th className="py-2 pr-3">Location</th>
                <th className="py-2 pr-3">Item</th>
                <th className="py-2 pr-3">Target</th>
                <th className="py-2 pr-3">Temp (°C)</th>
                <th className="py-2 pr-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {items.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-6 text-center text-gray-500">
                    No results.
                  </td>
                </tr>
              ) : (
                items.map((r) => (
                  <tr key={r.id} className="border-t">
                    <td className="py-2 pr-3">
                      {r.at ? new Date(r.at).toLocaleString() : "—"}
                    </td>
                    <td className="py-2 pr-3">{r.staff_initials ?? "—"}</td>
                    <td className="py-2 pr-3">{r.area ?? "—"}</td>
                    <td className="py-2 pr-3">{r.note ?? "—"}</td>
                    <td className="py-2 pr-3">{r.target_key ?? "—"}</td>
                    <td className="py-2 pr-3">{r.temp_c ?? "—"}</td>
                    <td className="py-2 pr-3">
                      {r.status ? (
                        <span
                          className={
                            "inline-flex rounded-full px-2 py-0.5 text-xs font-medium " +
                            (r.status === "pass"
                              ? "bg-emerald-100 text-emerald-800"
                              : "bg-red-100 text-red-800")
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
      </section>
    </main>
  );
}

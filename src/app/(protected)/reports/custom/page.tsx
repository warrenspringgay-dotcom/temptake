// src/app/(protected)/reports/custom/page.tsx
import { getCustomReport } from "@/app/actions/reports";

export const metadata = { title: "Custom Report – TempTake" };
export const dynamic = "force-dynamic";
export const revalidate = 0;

const PAGE = "max-w-[1100px] mx-auto px-3 sm:px-4 py-6";
const CARD =
  "rounded-3xl border border-white/40 bg-white/70 shadow-lg backdrop-blur-md";

function pill(cls: string) {
  return `inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${cls}`;
}

export default async function CustomReportPage() {
  // If you previously expected an array, that was the bug.
  // Now you get a structured object: { logs, totals, period }
  const report = await getCustomReport({ limit: 200 });

  const items = report.logs;

  return (
    <div className={PAGE}>
      <div className="mb-4">
        <h1 className="text-2xl font-semibold tracking-tight">Custom Report</h1>
        <p className="mt-1 text-sm text-gray-600">
          Lightweight view of recent temperature logs.
        </p>
      </div>

      <section className={`${CARD} p-5 sm:p-6`}>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className={pill("bg-black text-white")}>Summary</div>
            <p className="mt-2 text-sm text-gray-700">
              {report.period.from || report.period.to
                ? `Period: ${report.period.from ?? "—"} to ${report.period.to ?? "—"}`
                : "Period: latest logs"}
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <span className={pill("bg-gray-900 text-white")}>
              Total: {report.totals.total}
            </span>
            <span className={pill("bg-emerald-600 text-white")}>
              Pass: {report.totals.pass}
            </span>
            <span className={pill("bg-red-600 text-white")}>
              Fail: {report.totals.fails}
            </span>
            <span className={pill("bg-gray-100 text-gray-900")}>
              Fail rate: {report.totals.failRatePct}%
            </span>
          </div>
        </div>

        <div className="mt-5 overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="text-left text-gray-600">
                <th className="py-2 pr-4">Date</th>
                <th className="py-2 pr-4">Area</th>
                <th className="py-2 pr-4">Item</th>
                <th className="py-2 pr-4">Temp</th>
                <th className="py-2 pr-4">Status</th>
                <th className="py-2 pr-0">Staff</th>
              </tr>
            </thead>
            <tbody className="text-gray-800">
              {items.map((r) => {
                const ymd = (r.at ?? "").toString().slice(0, 10) || "—";
                const status = String(r.status ?? "").toLowerCase();
                const statusPill =
                  status === "fail"
                    ? "bg-red-600 text-white"
                    : status === "pass"
                    ? "bg-emerald-600 text-white"
                    : "bg-gray-100 text-gray-900";

                return (
                  <tr key={r.id} className="border-t border-gray-200/70">
                    <td className="py-2 pr-4 whitespace-nowrap">{ymd}</td>
                    <td className="py-2 pr-4">{r.area ?? "—"}</td>
                    <td className="py-2 pr-4">{r.note ?? "—"}</td>
                    <td className="py-2 pr-4 whitespace-nowrap">
                      {r.temp_c == null ? "—" : `${r.temp_c}°C`}
                    </td>
                    <td className="py-2 pr-4">
                      <span className={pill(statusPill)}>
                        {status ? status.toUpperCase() : "—"}
                      </span>
                    </td>
                    <td className="py-2 pr-0">{r.staff_initials ?? "—"}</td>
                  </tr>
                );
              })}

              {!items.length && (
                <tr>
                  <td className="py-6 text-gray-500" colSpan={6}>
                    No logs found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

// src/app/reports/page.tsx
import { getInstantAuditAll } from "@/app/actions/reports";
import Link from "next/link";

export const metadata = { title: "Reports – TempTake" };

function chip(text: string) {
  return (
    <span className="inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-700 mr-1">
      {text}
    </span>
  );
}

export default async function ReportsPage() {
  const { temps, teamDue, suppliersCount } = await getInstantAuditAll();

  return (
    <main className="p-4">
      <div className="flex justify-end mb-4">
        <button
          onClick={() => {
            if (typeof window !== "undefined") window.print();
          }}
          className="inline-flex items-center gap-2 rounded-md border px-3 py-1.5 text-sm hover:bg-gray-50"
        >
          🖨️ Print
        </button>
      </div>

      <h1 className="text-xl font-semibold mb-4">Instant Audit</h1>

      {/* Recent Temperature Logs */}
      <section className="rounded-2xl border bg-white p-4 shadow-sm mb-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold">Recent Temperature Logs</h2>
          <Link href="/" className="text-sm text-blue-600 hover:underline">
            Go to Dashboard →
          </Link>
        </div>

        {temps.length === 0 ? (
          <div className="text-sm text-gray-600">No recent logs.</div>
        ) : (
          <ul className="divide-y">
            {temps.map((t) => (
              <li key={t.id} className="py-2">
                <div className="text-sm font-medium">
                  {new Date(t.at ?? "").toLocaleString()}
                </div>
                <div className="mt-1 text-sm text-gray-700">
                  {chip(t.staff_initials ?? "—")}
                  {chip(t.area ?? "—")}
                  {chip(t.note ?? "—")}
                  {t.target_key ? chip(t.target_key) : null}
                  {t.temp_c != null ? chip(`${t.temp_c} °C`) : null}
                  {t.status ? (
                    <span
                      className={
                        "ml-1 inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium " +
                        (t.status === "pass"
                          ? "bg-emerald-100 text-emerald-800"
                          : "bg-red-100 text-red-800")
                      }
                    >
                      {t.status}
                    </span>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Team */}
      <section className="rounded-2xl border bg-white p-4 shadow-sm mb-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold">Team</h2>
          <Link href="/team" className="text-sm text-blue-600 hover:underline">
            View all →
          </Link>
        </div>
        {teamDue > 0 ? (
          <div className="text-sm">
            <span className="inline-flex items-center rounded-full bg-red-100 px-2 py-0.5 text-xs text-red-800 mr-2">
              {teamDue} due
            </span>
            training items due within 14 days.
          </div>
        ) : (
          <div className="text-sm text-gray-600">No upcoming training items.</div>
        )}
      </section>

      {/* Suppliers */}
      <section className="rounded-2xl border bg-white p-4 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold">Suppliers</h2>
          <Link href="/suppliers" className="text-sm text-blue-600 hover:underline">
            View all →
          </Link>
        </div>
        {suppliersCount > 0 ? (
          <div className="text-sm text-gray-700">{suppliersCount} suppliers in your list.</div>
        ) : (
          <div className="text-sm text-gray-600">No supplier updates.</div>
        )}
      </section>
    </main>
  );
}

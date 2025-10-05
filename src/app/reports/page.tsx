// src/app/reports/page.tsx
import Link from "next/link";
import { createServerClient } from "@/lib/supabaseServer";

export const dynamic = "force-dynamic";

// small helpers
function addDays(d: Date, n: number) {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}
function toISODate(d: Date) {
  return d.toISOString().slice(0, 10);
}
function fmtDate(iso?: string | null) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (isNaN(+d)) return iso;
  return d.toLocaleDateString();
}

export default async function ReportsPage() {
  const supabase = await createServerClient();

  // ---------- Top-level counts ----------
  const [{ count: suppliersCountRaw }, { count: teamCountRaw }, { count: trainingCountRaw }] =
    await Promise.all([
      supabase.from("suppliers").select("*", { count: "exact", head: true }),
      supabase.from("team_members").select("*", { count: "exact", head: true }),
      supabase.from("trainings").select("*", { count: "exact", head: true }),
    ]);

  const suppliersCount = suppliersCountRaw ?? 0;
  const teamCount = teamCountRaw ?? 0;
  const trainingCount = trainingCountRaw ?? 0;

  // ---------- Time windows ----------
  const today = new Date();
  const in14 = addDays(today, 14);
  const sevenDaysAgo = addDays(today, -7);

  const in14ISO = toISODate(in14);
  const sevenDaysAgoISO = sevenDaysAgo.toISOString();

  // ---------- Training expiring soon (<= 14 days) ----------
  // Keep selection minimal so it works even if staff join isn’t defined.
  const { data: expiringSoon } = await supabase
    .from("trainings")
    .select("id, type, expires_on, awarded_on")
    .lte("expires_on", in14ISO)
    .order("expires_on", { ascending: true })
    .limit(10);

  const expiringSoonList = (expiringSoon ?? []).map((t) => ({
    id: String(t.id),
    type: t.type ?? "Training",
    expires_on: t.expires_on as string | null,
    awarded_on: t.awarded_on as string | null,
  }));

  // Count of expiring soon (for the chip)
  const { count: expiringSoonCountRaw } = await supabase
    .from("trainings")
    .select("*", { count: "exact", head: true })
    .lte("expires_on", in14ISO);
  const expiringSoonCount = expiringSoonCountRaw ?? 0;

  // ---------- Suppliers added this week ----------
  const { data: suppliersThisWeek } = await supabase
    .from("suppliers")
    .select("id, name, created_at")
    .gte("created_at", sevenDaysAgoISO)
    .order("created_at", { ascending: false })
    .limit(10);

  const suppliersAddedCount = suppliersThisWeek?.length ?? 0;

  // ---------- Temp log stats (7d) ----------
  const { data: logs7d } = await supabase
    .from("food_temp_logs")
    .select("id, at, staff_initials, area, note, target_key, temp_c, status")
    .gte("at", sevenDaysAgoISO)
    .order("at", { ascending: false })
    .limit(100);

  const logs7Count = logs7d?.length ?? 0;
  const logs7Fail = (logs7d ?? []).filter((r) => r.status === "fail").length;
  const logs7Recent = (logs7d ?? []).slice(0, 8);

  return (
    <div className="mx-auto w-full max-w-5xl space-y-8 px-4 py-8">
      <div className="mb-2 flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Reports</h1>
        <Link
          href="/"
          className="rounded-xl border border-gray-300 bg-white px-4 py-2 text-sm hover:bg-gray-50"
        >
          ← Dashboard
        </Link>
      </div>

      {/* High-level tiles */}
      <div className="grid gap-6 md:grid-cols-3">
        <div className="rounded-2xl border bg-white p-4 shadow-sm">
          <div className="mb-2 flex items-center justify-between">
            <h2 className="text-lg font-medium">Team</h2>
            <Link href="/team" className="text-sm text-blue-600 hover:text-blue-800">
              View →
            </Link>
          </div>
          {teamCount > 0 ? (
            <div className="text-sm text-gray-700">
              {teamCount} team members in your organisation.
            </div>
          ) : (
            <div className="text-sm text-gray-600">No team members yet.</div>
          )}
        </div>

        <div className="rounded-2xl border bg-white p-4 shadow-sm">
          <div className="mb-2 flex items-center justify-between">
            <h2 className="text-lg font-medium">Suppliers</h2>
            <Link href="/suppliers" className="text-sm text-blue-600 hover:text-blue-800">
              View →
            </Link>
          </div>
          {suppliersCount > 0 ? (
            <div className="text-sm text-gray-700">{suppliersCount} suppliers in your list.</div>
          ) : (
            <div className="text-sm text-gray-600">No supplier updates.</div>
          )}
        </div>

        <div className="rounded-2xl border bg-white p-4 shadow-sm">
          <div className="mb-2 flex items-center justify-between">
            <h2 className="text-lg font-medium">Training</h2>
            <Link href="/team" className="text-sm text-blue-600 hover:text-blue-800">
              View →
            </Link>
          </div>
          {trainingCount > 0 ? (
            <div className="text-sm text-gray-700">{trainingCount} training records.</div>
          ) : (
            <div className="text-sm text-gray-600">No training records yet.</div>
          )}
          <div className="mt-3">
            <span
              className={
                "inline-flex items-center rounded-full px-2 py-0.5 text-xs " +
                (expiringSoonCount > 0
                  ? "bg-red-100 text-red-800"
                  : "bg-emerald-100 text-emerald-800")
              }
              title="Expiring within 14 days"
            >
              {expiringSoonCount > 0 ? `${expiringSoonCount} expiring soon` : "All OK (14d)"}
            </span>
          </div>
        </div>
      </div>

      {/* Training expiring soon */}
      <section className="rounded-2xl border bg-white p-4 shadow-sm">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Training expiring in 14 days</h2>
          <Link href="/team" className="text-sm text-blue-600 hover:underline">
            Manage training →
          </Link>
        </div>

        {expiringSoonList.length === 0 ? (
          <div className="text-sm text-gray-600">No upcoming expiries.</div>
        ) : (
          <ul className="divide-y">
            {expiringSoonList.map((t) => (
              <li key={t.id} className="flex items-center justify-between py-2 text-sm">
                <div>
                  <div className="font-medium">{t.type}</div>
                  <div className="text-gray-500">
                    Awarded: {fmtDate(t.awarded_on)} • Expires: {fmtDate(t.expires_on)}
                  </div>
                </div>
                <div
                  className={
                    "rounded-full px-2 py-0.5 text-xs " +
                    (new Date(t.expires_on ?? "") < addDays(today, 7)
                      ? "bg-red-100 text-red-800"
                      : "bg-amber-100 text-amber-800")
                  }
                >
                  {fmtDate(t.expires_on)}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Suppliers added this week */}
      <section className="rounded-2xl border bg-white p-4 shadow-sm">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Suppliers added (last 7 days)</h2>
          <Link href="/suppliers" className="text-sm text-blue-600 hover:underline">
            View all →
          </Link>
        </div>

        {suppliersAddedCount === 0 ? (
          <div className="text-sm text-gray-600">No suppliers added this week.</div>
        ) : (
          <ul className="divide-y">
            {(suppliersThisWeek ?? []).map((s) => (
              <li key={String(s.id)} className="flex items-center justify-between py-2 text-sm">
                <div className="font-medium">{(s as any).name ?? "Supplier"}</div>
                <div className="text-xs text-gray-500">{fmtDate((s as any).created_at)}</div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Temperature logs snapshot */}
      <section className="rounded-2xl border bg-white p-4 shadow-sm">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Temperature logs (last 7 days)</h2>
          <Link href="/" className="text-sm text-blue-600 hover:underline">
            Go to logger →
          </Link>
        </div>

        <div className="mb-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="rounded-xl border bg-white p-3">
            <div className="text-xs text-gray-500">Total logs (7d)</div>
            <div className="text-2xl font-semibold">{logs7Count}</div>
          </div>
          <div className="rounded-xl border bg-white p-3">
            <div className="text-xs text-gray-500">Failures (7d)</div>
            <div className="text-2xl font-semibold">{logs7Fail}</div>
          </div>
          <div className="rounded-xl border bg-white p-3">
            <div className="text-xs text-gray-500">Success rate</div>
            <div className="text-2xl font-semibold">
              {logs7Count > 0 ? `${Math.round(((logs7Count - logs7Fail) / logs7Count) * 100)}%` : "—"}
            </div>
          </div>
        </div>

        {logs7Recent.length === 0 ? (
          <div className="text-sm text-gray-600">No logs recorded in the last 7 days.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-left text-gray-500">
                  <th className="py-2 pr-3">When</th>
                  <th className="py-2 pr-3">Staff</th>
                  <th className="py-2 pr-3">Location</th>
                  <th className="py-2 pr-3">Item</th>
                  <th className="py-2 pr-3">Target</th>
                  <th className="py-2 pr-3">Temp (°C)</th>
                  <th className="py-2 pr-3">Status</th>
                </tr>
              </thead>
              <tbody>
                {logs7Recent.map((r) => (
                  <tr key={String(r.id)} className="border-t">
                    <td className="py-2 pr-3">{fmtDate((r as any).at)}</td>
                    <td className="py-2 pr-3">{(r as any).staff_initials ?? "—"}</td>
                    <td className="py-2 pr-3">{(r as any).area ?? "—"}</td>
                    <td className="py-2 pr-3">{(r as any).note ?? "—"}</td>
                    <td className="py-2 pr-3">{(r as any).target_key ?? "—"}</td>
                    <td className="py-2 pr-3">{(r as any).temp_c ?? "—"}</td>
                    <td className="py-2 pr-3">
                      {(r as any).status ? (
                        <span
                          className={
                            "inline-flex rounded-full px-2 py-0.5 text-xs font-medium " +
                            ((r as any).status === "pass"
                              ? "bg-emerald-100 text-emerald-800"
                              : "bg-red-100 text-red-800")
                          }
                        >
                          {(r as any).status}
                        </span>
                      ) : (
                        "—"
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

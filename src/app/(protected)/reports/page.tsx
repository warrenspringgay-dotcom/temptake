// src/app/reports/page.tsx
import { getServerSupabase } from "@/lib/supabaseServer";
import Link from "next/link";

type TempLog = {
  id: string;
  at: string;
  area: string;
  note: string | null;
  target_key: string;
  temp_c: number;
  status: string;
  staff_initials: string | null;
  location_id: string | null;
};

type Corrective = {
  temp_log_id: string;
  action: string;
  recheck_temp_c: number | null;
  recheck_at: string | null;
  recheck_status: string | null;
  recorded_by: string | null;
  created_at: string;
};

type TempRow = TempLog & {
  corrective_action: string | null;
  recheck_temp_c: number | null;
  recheck_at: string | null;
  recheck_status: string | null;
  corrective_by: string | null;
};

function isoDateOnly(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function startOfDayISO(yyyy_mm_dd: string) {
  // treat as local day boundaries for display; DB stores timestamptz.
  // using 00:00:00Z is acceptable for filtering "roughly by date" unless you require perfect TZ alignment.
  return `${yyyy_mm_dd}T00:00:00.000Z`;
}

function endOfDayISO(yyyy_mm_dd: string) {
  return `${yyyy_mm_dd}T23:59:59.999Z`;
}

function formatISOToUK(iso: string | null) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleString("en-GB", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function badgeClass(status: string) {
  const s = (status || "").toLowerCase();
  if (s === "fail") return "bg-red-100 text-red-800 border-red-200";
  if (s === "pass") return "bg-emerald-100 text-emerald-800 border-emerald-200";
  return "bg-slate-100 text-slate-800 border-slate-200";
}

async function getOrgIdForUser(sb: any, userId: string) {
  const { data, error } = await sb
    .from("profiles")
    .select("org_id")
    .eq("id", userId)
    .single();

  if (error || !data?.org_id) {
    throw new Error("No org_id found for this user (profiles.org_id).");
  }
  return data.org_id as string;
}

async function fetchTempRows(args: { fromISO: string; toISO: string }) {
  const sb = await getServerSupabase();

  const {
    data: { user },
    error: authError,
  } = await sb.auth.getUser();

  if (authError || !user) {
    return { rows: [] as TempRow[], error: "Not signed in." };
  }

  let orgId: string;
  try {
    orgId = await getOrgIdForUser(sb, user.id);
  } catch (e: any) {
    return { rows: [] as TempRow[], error: e?.message || "Org lookup failed." };
  }

  // Pull temp logs in range (latest first)
  const { data: logs, error: logsErr } = await sb
    .from("food_temp_logs")
    .select("id,at,area,note,target_key,temp_c,status,staff_initials,location_id")
    .eq("org_id", orgId)
    .gte("at", args.fromISO)
    .lte("at", args.toISO)
    .eq("voided", false)
    .order("at", { ascending: false })
    .limit(2000);

  if (logsErr) {
    return { rows: [] as TempRow[], error: logsErr.message };
  }

  const base: TempRow[] = (logs ?? []).map((r: any) => ({
    id: String(r.id),
    at: String(r.at),
    area: String(r.area ?? "—"),
    note: r.note ?? null,
    target_key: String(r.target_key ?? "—"),
    temp_c: r.temp_c != null ? Number(r.temp_c) : NaN,
    status: String(r.status ?? "—"),
    staff_initials: r.staff_initials ?? null,
    location_id: r.location_id ?? null,

    corrective_action: null,
    recheck_temp_c: null,
    recheck_at: null,
    recheck_status: null,
    corrective_by: null,
  }));

  const ids = base.map((x) => x.id);
  if (ids.length === 0) return { rows: base, error: null as string | null };

  // Pull corrective actions (latest per temp_log_id)
  const { data: ca, error: caErr } = await sb
    .from("food_temp_corrective_actions")
    .select("temp_log_id,action,recheck_temp_c,recheck_at,recheck_status,recorded_by,created_at")
    .in("temp_log_id", ids)
    .order("created_at", { ascending: false });

  if (caErr) {
    // Don’t fail the page if this table doesn’t exist yet or RLS blocks it.
    // Just show base logs.
    return { rows: base, error: null as string | null };
  }

  const latestByLog = new Map<string, Corrective>();
  for (const row of ca ?? []) {
    const key = String((row as any).temp_log_id);
    if (!latestByLog.has(key)) latestByLog.set(key, row as any);
  }

  for (const r of base) {
    const hit = latestByLog.get(r.id);
    if (!hit) continue;

    r.corrective_action = hit.action ?? null;
    r.recheck_temp_c =
      hit.recheck_temp_c != null ? Number(hit.recheck_temp_c) : null;
    r.recheck_at = hit.recheck_at ? String(hit.recheck_at) : null;
    r.recheck_status = hit.recheck_status ? String(hit.recheck_status) : null;
    r.corrective_by = hit.recorded_by ? String(hit.recorded_by) : null;
  }

  return { rows: base, error: null as string | null };
}

export default async function ReportsPage({
  searchParams,
}: {
  searchParams?: Record<string, string | string[] | undefined>;
}) {
  const today = new Date();
  const defaultTo = isoDateOnly(today);

  const d7 = new Date(today);
  d7.setDate(d7.getDate() - 7);
  const defaultFrom = isoDateOnly(d7);

  const from =
    typeof searchParams?.from === "string" ? searchParams.from : defaultFrom;
  const to = typeof searchParams?.to === "string" ? searchParams.to : defaultTo;

  const fromISO = startOfDayISO(from);
  const toISO = endOfDayISO(to);

  const { rows, error } = await fetchTempRows({ fromISO, toISO });

  const failCount = rows.filter((r) => r.status?.toLowerCase() === "fail").length;
  const passCount = rows.filter((r) => r.status?.toLowerCase() === "pass").length;

  return (
    <div className="mx-auto max-w-6xl space-y-4 px-4 py-6">
      {/* Header */}
      <div className="rounded-3xl border border-slate-200 bg-white/80 p-4 shadow-xl backdrop-blur-sm md:p-5">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-slate-900">Reports</h1>
            <p className="mt-1 text-sm text-slate-700">
              Temperature logs with audit-grade corrective action evidence.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-slate-700 shadow-sm">
              Total: <span className="font-semibold">{rows.length}</span>
            </span>
            <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-emerald-800 shadow-sm">
              Pass: <span className="font-semibold">{passCount}</span>
            </span>
            <span className="rounded-full border border-red-200 bg-red-50 px-3 py-1 text-red-800 shadow-sm">
              Fail: <span className="font-semibold">{failCount}</span>
            </span>
          </div>
        </div>

        {/* Filters */}
        <form method="GET" className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="w-full sm:w-48">
            <label className="mb-1 block text-xs text-slate-600">From</label>
            <input
              type="date"
              name="from"
              defaultValue={from}
              className="h-10 w-full rounded-xl border border-slate-200 bg-white/80 px-3 py-2 shadow-sm"
            />
          </div>

          <div className="w-full sm:w-48">
            <label className="mb-1 block text-xs text-slate-600">To</label>
            <input
              type="date"
              name="to"
              defaultValue={to}
              className="h-10 w-full rounded-xl border border-slate-200 bg-white/80 px-3 py-2 shadow-sm"
            />
          </div>

          <button
            type="submit"
            className="h-10 rounded-2xl bg-slate-900 px-4 text-sm font-medium text-white shadow-sm hover:bg-slate-800"
          >
            Apply
          </button>

          <Link
            href={`/reports?from=${defaultFrom}&to=${defaultTo}`}
            className="h-10 rounded-2xl border border-slate-200 bg-white/80 px-4 text-sm font-medium text-slate-800 shadow-sm hover:bg-white inline-flex items-center justify-center"
          >
            Last 7 days
          </Link>
        </form>

        {error && (
          <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800">
            {error}
          </div>
        )}
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white/80 shadow-xl backdrop-blur-sm">
        <div className="overflow-x-auto">
          <table className="min-w-[980px] w-full text-sm">
            <thead className="border-b border-slate-200 bg-white/70">
              <tr className="text-left text-slate-700">
                <th className="px-4 py-3 font-semibold">Date/Time</th>
                <th className="px-4 py-3 font-semibold">Area</th>
                <th className="px-4 py-3 font-semibold">Item</th>
                <th className="px-4 py-3 font-semibold">Target</th>
                <th className="px-4 py-3 font-semibold">Temp</th>
                <th className="px-4 py-3 font-semibold">Status</th>
                <th className="px-4 py-3 font-semibold">Initials</th>
                <th className="px-4 py-3 font-semibold">Corrective action</th>
                <th className="px-4 py-3 font-semibold">Re-check</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-200">
              {rows.length === 0 ? (
                <tr>
                  <td className="px-4 py-6 text-center text-slate-500" colSpan={9}>
                    No logs found for this range.
                  </td>
                </tr>
              ) : (
                rows.map((r) => {
                  const status = (r.status || "").toLowerCase();
                  const isFail = status === "fail";
                  const tempStr =
                    Number.isFinite(r.temp_c) ? `${r.temp_c}°C` : "—";

                  return (
                    <tr key={r.id} className="align-top">
                      <td className="px-4 py-3 text-slate-800">
                        {formatISOToUK(r.at)}
                      </td>
                      <td className="px-4 py-3 text-slate-800">{r.area}</td>
                      <td className="px-4 py-3 text-slate-800">
                        {r.note ?? "—"}
                      </td>
                      <td className="px-4 py-3 text-slate-700">
                        {r.target_key ?? "—"}
                      </td>
                      <td className="px-4 py-3 text-slate-800">{tempStr}</td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold ${badgeClass(
                            status
                          )}`}
                        >
                          {status || "—"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-800">
                        {r.staff_initials ?? "—"}
                      </td>

                      <td className="px-4 py-3">
                        {r.corrective_action ? (
                          <div className="max-w-xs">
                            <div className="text-slate-900">
                              {r.corrective_action}
                            </div>
                            {r.corrective_by && (
                              <div className="mt-1 text-[11px] text-slate-500">
                                Recorded by {r.corrective_by}
                              </div>
                            )}
                          </div>
                        ) : isFail ? (
                          <span className="text-red-700 text-xs">
                            Missing (recommended)
                          </span>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>

                      <td className="px-4 py-3">
                        {r.recheck_temp_c != null ? (
                          <div className="text-xs">
                            <div className="text-slate-900">
                              {r.recheck_temp_c}°C{" "}
                              {r.recheck_status ? `(${r.recheck_status})` : ""}
                            </div>
                            <div className="mt-1 text-[11px] text-slate-500">
                              {formatISOToUK(r.recheck_at)}
                              {r.corrective_by ? ` • ${r.corrective_by}` : ""}
                            </div>
                          </div>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <div className="border-t border-slate-200 bg-white/60 px-4 py-3 text-xs text-slate-600">
          Tip: inspectors care less about the pass and more about the **fail + corrective action + re-check**.
        </div>
      </div>
    </div>
  );
}

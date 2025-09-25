// src/app/actions/tempLogs.ts
export type TempLogInput = {
  id?: string;
  date?: string | null;
  staff_initials?: string | null;
  location?: string | null;
  item?: string | null;
  target_key?: string | null;
  temp_c?: number | null;
};

// Helper: absolute on server, relative in browser
function apiUrl(path: string) {
  if (typeof window !== "undefined") return path; // client: keep it relative
  // server: construct absolute
  const envBase =
    process.env.NEXT_PUBLIC_SITE_URL ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "");
  const fallback = `http://localhost:${process.env.PORT || 3000}`;
  const base = envBase || fallback;
  return new URL(path, base).toString();
}

export async function listTempLogs() {
  const res = await fetch(apiUrl("/api/temp-logs"), { cache: "no-store" });
  if (!res.ok) throw new Error(await res.text());
  const json = await res.json();
  return json.data as Array<any>;
}

export async function upsertTempLog(input: TempLogInput) {
  const res = await fetch(apiUrl("/api/temp-logs"), {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(input),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(await res.text());
}

export async function deleteTempLog(id: string) {
  const res = await fetch(apiUrl(`/api/temp-logs?id=${encodeURIComponent(id)}`), {
    method: "DELETE",
    cache: "no-store",
  });
  if (!res.ok) throw new Error(await res.text());
}

/** Optional: quick initials from recent logs */
export async function listStaffInitials(): Promise<string[]> {
  const logs = await listTempLogs();
  const set = new Set<string>();
  for (const r of logs) {
    const v = (r.staff_initials ?? "").toString().trim().toUpperCase();
    if (v) set.add(v);
  }
  return Array.from(set);
}
// add at the bottom of src/app/actions/tempLogs.ts

/** Count logs in the last N days using the same /api/temp-logs source */
export async function countTempLogsLastNDays(n = 30): Promise<number> {
  const rows = await listTempLogs();
  const now = Date.now();
  const windowMs = n * 24 * 60 * 60 * 1000;

  let count = 0;
  for (const r of rows) {
    const d = r?.date ? new Date(`${r.date}T00:00:00Z`) : r?.created_at ? new Date(r.created_at) : null;
    if (!d) continue;
    if (now - d.getTime() <= windowMs) count++;
  }
  return count;
}

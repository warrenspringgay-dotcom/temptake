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

export async function listTempLogs() {
  const res = await fetch("/api/temp-logs", { cache: "no-store" });
  if (!res.ok) throw new Error(await res.text());
  const json = await res.json();
  return json.data as Array<any>;
}

export async function upsertTempLog(input: TempLogInput) {
  const res = await fetch("/api/temp-logs", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new Error(await res.text());
}

export async function deleteTempLog(id: string) {
  const res = await fetch(`/api/temp-logs?id=${encodeURIComponent(id)}`, { method: "DELETE" });
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

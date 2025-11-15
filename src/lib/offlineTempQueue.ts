// src/lib/offlineTempQueue.ts

export type TempLogPayload = {
  org_id: string;
  at: string;
  area: string | null;
  note: string | null;
  staff_initials: string;
  target_key: string | null;
  temp_c: number | null;
  status: "pass" | "fail" | null;
};

type QueuedTempLog = TempLogPayload & {
  _localId: string;
  _createdAt: string;
};

const STORAGE_KEY = "tt_offline_food_logs_v1";

function safeReadQueue(): QueuedTempLog[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed as QueuedTempLog[];
  } catch {
    return [];
  }
}

function safeWriteQueue(list: QueuedTempLog[]) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  } catch {
    // ignore
  }
}

export function getOfflineTempLogsCount(): number {
  try {
    return safeReadQueue().length;
  } catch {
    return 0;
  }
}

function makeId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function queueTempLogs(rows: TempLogPayload[]): void {
  if (typeof window === "undefined") return;
  if (!rows.length) return;

  try {
    const existing = safeReadQueue();
    const now = new Date().toISOString();
    const toAdd: QueuedTempLog[] = rows.map((r) => ({
      ...r,
      _localId: makeId(),
      _createdAt: now,
    }));
    safeWriteQueue([...existing, ...toAdd]);
  } catch {
    // ignore
  }
}

export function looksLikeNetworkError(err: any): boolean {
  if (!err) return false;
  const msg = String(
    (err && (err.message || (err.toString && err.toString()))) || ""
  ).toLowerCase();

  if (!msg) return false;

  if (msg.includes("network request failed")) return true;
  if (msg.includes("failed to fetch")) return true;
  if (msg.includes("networkerror")) return true;
  if (msg.includes("connection") && msg.includes("failed")) return true;
  if (msg.includes("fetch") && msg.includes("error")) return true;

  return false;
}

/**
 * Try to upload all queued logs for the given org_id.
 * Returns how many rows were successfully uploaded.
 */
export async function flushOfflineTempLogs(
  supabaseClient: any,
  orgId: string
): Promise<number> {
  if (typeof window === "undefined") return 0;
  const fullQueue = safeReadQueue();
  const orgQueue = fullQueue.filter((q) => q.org_id === orgId);

  if (!orgQueue.length) return 0;

  const payload: TempLogPayload[] = orgQueue.map(
    ({ _localId, _createdAt, ...rest }) => rest
  );

  try {
    const { error } = await supabaseClient.from("food_temp_logs").insert(payload);

    if (error) {
      // If still a network error, keep them queued
      if (looksLikeNetworkError(error)) {
        return 0;
      }
      // For other errors, also keep them (don’t silently drop)
      return 0;
    }

    // Success: drop all items for this org from the queue
    const remaining = fullQueue.filter((q) => q.org_id !== orgId);
    safeWriteQueue(remaining);

    return payload.length;
  } catch (err: any) {
    if (looksLikeNetworkError(err)) {
      return 0;
    }
    return 0;
  }
}

// src/lib/training.ts
export type ExpiryStatus = "ok" | "warning" | "expired";

/** Pure helper – kept outside server actions so it can be sync. */
export function getExpiryStatus(expires_on: string, warnDays = 60): ExpiryStatus {
  if (!expires_on) return "ok";
  const today = new Date().toISOString().slice(0, 10);
  if (expires_on < today) return "expired";
  const d = new Date(expires_on + "T00:00:00Z");
  const t = new Date(today + "T00:00:00Z");
  const diff = Math.floor((d.getTime() - t.getTime()) / 86400000);
  return diff <= warnDays ? "warning" : "ok";
}

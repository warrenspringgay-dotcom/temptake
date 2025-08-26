// src/lib/training.ts

export type ExpiryStatus = "ok" | "warning" | "expired";

/** Pure client/server-safe helper */
export function getExpiryStatus(expires_on: string, warnDays = 60): ExpiryStatus {
  const today = new Date().toISOString().slice(0, 10);
  if (expires_on < today) return "expired";
  // within warnDays => warning
  const d = new Date(expires_on + "T00:00:00Z");
  const t = new Date(today + "T00:00:00Z");
  const diff = Math.floor((d.getTime() - t.getTime()) / (1000 * 60 * 60 * 24));
  return diff <= warnDays ? "warning" : "ok";
}

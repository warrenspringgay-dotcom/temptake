// src/lib/training.ts

/** Expiry status used by the UI to colour-code training rows/cards. */
export type ExpiryStatus = "ok" | "warning" | "expired";

/** Pure helper (sync). Safe to export here because this file is NOT a Server Action module. */
export function getExpiryStatus(expires_on: string, warnDays = 60): ExpiryStatus {
  const today = new Date().toISOString().slice(0, 10);
  if (!expires_on) return "ok";
  if (expires_on < today) return "expired";

  const d = new Date(expires_on + "T00:00:00Z");
  const t = new Date(today + "T00:00:00Z");
  const diff = Math.floor((d.getTime() - t.getTime()) / (1000 * 60 * 60 * 24));
  return diff <= warnDays ? "warning" : "ok";
}

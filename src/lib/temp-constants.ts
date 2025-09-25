// src/lib/temp-constants.ts

// ---------- Locations ----------
export const LOCATION_PRESETS = [
  "Kitchen",
  "Prep Room",
  "Fridge",
  "Freezer",
  "Hot Hold",
  "Delivery",
] as const;

// ---------- Targets ----------
export type TargetKey = "chill" | "freeze" | "cook" | "hot-hold" | "ambient";

export interface TargetPreset {
  key: TargetKey;
  label: string;
  minC: number | null; // lower bound (≥ minC) if not null
  maxC: number | null; // upper bound (≤ maxC) if not null
}

export const TARGET_PRESETS = [
  { key: "chill",     label: "Chilled",   minC: 0,    maxC: 8   },
  { key: "freeze",    label: "Frozen",    minC: null, maxC: -18 },
  { key: "cook",      label: "Cooked",    minC: 75,   maxC: null },
  { key: "hot-hold",  label: "Hot-hold",  minC: 63,   maxC: null },
  { key: "ambient",   label: "Ambient",   minC: null, maxC: 25  },
] as const satisfies ReadonlyArray<TargetPreset>;

// Map for quick lookup by key (what your component uses)
export const TARGET_BY_KEY: Record<TargetKey, TargetPreset> =
  Object.fromEntries(TARGET_PRESETS.map(p => [p.key, p])) as Record<TargetKey, TargetPreset>;

// Options for a <select>
export const TARGET_OPTIONS = TARGET_PRESETS.map(p => ({ value: p.key, label: p.label }));

// ---------- Helpers (optional but handy) ----------

// Human-readable range like "0–8°C", "≥ 75°C", "≤ -18°C"
export function formatTargetRange(p: TargetPreset): string {
  if (p.minC != null && p.maxC != null) return `${p.minC}–${p.maxC}°C`;
  if (p.minC != null) return `≥ ${p.minC}°C`;
  if (p.maxC != null) return `≤ ${p.maxC}°C`;
  return "—";
}

// Check if a measured temp meets the target
export function isTempWithinTarget(p: TargetPreset, tempC: number): boolean {
  if (p.minC != null && tempC < p.minC) return false;
  if (p.maxC != null && tempC > p.maxC) return false;
  return true;
}

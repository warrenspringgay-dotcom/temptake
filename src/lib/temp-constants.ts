export type TargetPreset = {
  key: "fridge" | "freezer" | "hot_hold" | "cook" | "cool";
  label: string;         // what the UI shows (word only)
  minC?: number | null;  // used for pass/fail
  maxC?: number | null;
};

export const TARGET_PRESETS: TargetPreset[] = [
  { key: "fridge",   label: "Fridge",   minC: 0,   maxC: 8 },
  { key: "freezer",  label: "Freezer",  minC: null, maxC: -18 }, // ≤ -18 °C
  { key: "hot_hold", label: "Hot hold", minC: 63,  maxC: null },
  { key: "cook",     label: "Cook",     minC: 75,  maxC: null },
  { key: "cool",     label: "Cooling",  minC: null, maxC: 8 },   // ≤ 8 °C within time window (basic)
];

export const LOCATION_PRESETS = [
  "Kitchen", "Prep room", "Delivery area", "Service", "Fridge 1", "Fridge 2", "Freezer 1"
];

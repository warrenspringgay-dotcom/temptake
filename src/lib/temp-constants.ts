// src/lib/temp-constants.ts

export const LOCATION_PRESETS = [
  "Kitchen",
  "Prep Room",
  "Fridge",
  "Freezer",
  "Hot Hold",
  "Delivery",
] as const;

export const TARGET_PRESETS = [
 
  { key: "chill",     label: "Chilled",      minC: 0,    maxC: 8  },
  { key: "freeze",    label: "Frozen",     minC: null, maxC: -18 },
  { key: "cook",      label: "Cooked",      minC: 75,   maxC: null },
  { key: "hot-hold",  label: "Hot-hold",    minC: 63,   maxC: null },
  { key: "ambient",   label: "Ambient",     minC: null, maxC: 25 }
] as const;

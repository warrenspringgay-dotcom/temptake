// src/lib/allergens.ts
export const ALLERGEN_KEYS = [
  "gluten","crustaceans","eggs","fish","peanuts","soybeans","milk","nuts",
  "celery","mustard","sesame","sulphites","lupin","molluscs",
] as const;
export type AllergenKey = (typeof ALLERGEN_KEYS)[number];

export type Flags = Record<AllergenKey, boolean>;

export function emptyFlags(): Flags {
  return Object.fromEntries(ALLERGEN_KEYS.map((k) => [k, false])) as Flags;
}

export type MatrixDraft = {
  item: string;
  category?: string;
  notes?: string;
  flags: Flags;
};

/** Build a MatrixDraft from a parsed CSV row. Expected columns:
 * item, category?, notes?, and any of ALLERGEN_KEYS as yes/no/true/false/1/0
 */
export function draftFromRow(row: Record<string, string>): MatrixDraft | null {
  const item = (row.item ?? row.name ?? "").trim();
  if (!item) return null;

  const flags = emptyFlags();
  for (const k of ALLERGEN_KEYS) {
    // accept alt spellings in CSV headers
    const cell =
      row[k] ??
      (k === "soybeans" ? row["soya"] : undefined) ??
      (k === "sulphites" ? (row["sulphites/sulphur dioxide"] ?? row["sulphur dioxide"]) : undefined);
    flags[k] = !!cell && ["y","yes","true","1"].includes(cell.toLowerCase());
  }

  return {
    item,
    category: row.category || row.type || undefined,
    notes: row.notes || undefined,
    flags,
  };
}

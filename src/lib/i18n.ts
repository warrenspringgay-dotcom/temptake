export type Dict = Record<string, string>;
type Dictionaries = Record<string, Dict>;

// Minimal dictionaries (add more keys & locales as needed)
const enGB: Dict = {
  dashboard: "Dashboard",
  allergens: "Allergens",
  suppliers: "Suppliers",
  reports: "Reports",
  settings: "Settings",
  temperature_logs: "Temperature logs",
};

const enUS: Dict = { ...enGB }; // same for now
const frFR: Dict = { ...enGB, reports: "Rapports", settings: "Paramètres" };

const DICTS: Dictionaries = { "en-GB": enGB, "en-US": enUS, "fr-FR": frFR };

export function t(locale: string, key: string) {
  const base = DICTS[locale] || enGB;
  return base[key] || key;
}

export function normalizeLocale(lang: string): string {
  // normalize like "en" -> "en-GB"
  if (lang.startsWith("en")) return lang.includes("-US") ? "en-US" : "en-GB";
  if (lang.startsWith("fr")) return "fr-FR";
  return "en-GB";
}

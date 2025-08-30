"use client";

import React, { createContext, useContext, useMemo } from "react";
import { useSettings } from "@/components/SettingsProvider";

export type LanguageCode = "en" | "zh" | "hi" | "ur";

const STRINGS: Record<LanguageCode, Record<string, string>> = {
  en: {
    nav_dashboard: "Dashboard",
    nav_allergens: "Allergens",
    nav_team: "Team",
    nav_suppliers: "Suppliers",
    nav_reports: "Reports",
  },
  zh: {
    nav_dashboard: "仪表板",
    nav_allergens: "过敏原",
    nav_team: "团队",
    nav_suppliers: "供应商",
    nav_reports: "报告",
  },
  hi: {
    nav_dashboard: "डैशबोर्ड",
    nav_allergens: "एलर्जेन्स",
    nav_team: "टीम",
    nav_suppliers: "आपूर्तिकर्ता",
    nav_reports: "रिपोर्ट्स",
  },
  ur: {
    nav_dashboard: "ڈیش بورڈ",
    nav_allergens: "الرجنز",
    nav_team: "ٹیم",
    nav_suppliers: "سپلائرز",
    nav_reports: "رپورٹس",
  },
};

function resolveLang(code?: string): LanguageCode {
  if (code === "zh" || code?.startsWith("zh")) return "zh";
  if (code === "hi" || code?.startsWith("hi")) return "hi";
  if (code === "ur" || code?.startsWith("ur")) return "ur";
  return "en";
}

type I18nContextValue = {
  lang: LanguageCode;
  t: (key: string) => string;
};

const I18nContext = createContext<I18nContextValue | null>(null);

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const { language } = useSettings(); // <-- from SettingsProvider
  const lang = resolveLang(language);
  const dict = STRINGS[lang] ?? STRINGS.en;

  const value = useMemo<I18nContextValue>(
    () => ({
      lang,
      t: (k: string) => dict[k] ?? k,
    }),
    [lang, dict]
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n must be used within I18nProvider");
  return ctx;
}

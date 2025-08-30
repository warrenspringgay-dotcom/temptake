// src/lib/i18n.tsx
"use client";

import React from "react";

/** Supported languages */
export type LanguageCode = "en" | "zh" | "ur" | "hi";

/** Simple string dictionaries (expand as you like) */
const STRINGS: Record<LanguageCode, Record<string, string>> = {
  en: {
    logs: "Logs",
    allergens: "Allergens",
    suppliers: "Suppliers",
    team: "Team",
    reports: "Reports",
    settings: "Settings",
  },
  zh: {
    logs: "日志",
    allergens: "过敏原",
    suppliers: "供应商",
    team: "团队",
    reports: "报告",
    settings: "设置",
  },
  ur: {
    logs: "لاگز",
    allergens: "الرجنز",
    suppliers: "سپلائرز",
    team: "ٹیم",
    reports: "رپورٹس",
    settings: "سیٹنگز",
  },
  hi: {
    logs: "लॉग्स",
    allergens: "एलर्जन्स",
    suppliers: "आपूर्तिकर्ता",
    team: "टीम",
    reports: "रिपोर्ट्स",
    settings: "सेटिंग्स",
  },
};

export type I18nContextValue = {
  lang: LanguageCode;
  t: (key: string) => string;
};

/** Name the *value* differently to avoid type/namespace confusion */
const I18nReactContext = React.createContext<I18nContextValue | null>(null);

/**
 * Provider. You can pass `lang`, otherwise it defaults to "en".
 * (If you want to bind it to Settings, pass lang from your SettingsProvider in app/providers.tsx.)
 */
export function I18nProvider({
  children,
  lang = "en",
}: {
  children: React.ReactNode;
  lang?: LanguageCode;
}) {
  const dict = STRINGS[lang] ?? STRINGS.en;

  const t = React.useCallback((k: string) => dict[k] ?? STRINGS.en[k] ?? k, [dict]);

  const value = React.useMemo<I18nContextValue>(() => ({ lang, t }), [lang, t]);

  return (
    <I18nReactContext.Provider value={value}>
      {children}
    </I18nReactContext.Provider>
  );
}

export function useI18n(): I18nContextValue {
  const ctx = React.useContext(I18nReactContext);
  if (!ctx) throw new Error("useI18n must be used within I18nProvider");
  return ctx;
}

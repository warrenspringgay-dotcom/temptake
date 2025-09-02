// src/lib/i18n.tsx
"use client";

import React from "react";
import { useSettings } from "@/components/SettingsProvider";

type Lang = "en" | "zh" | "hi";
type Dict = Record<string, string>;

const STRINGS: Record<Lang, Dict> = {
  en: {
    logs: "Logs",
    allergens: "Allergens",
    suppliers: "Suppliers",
    team: "Team",
    reports: "Reports",
    settings: "Settings",
    signIn: "Sign in",
    signOut: "Sign out",
  },
  zh: {
    logs: "日志",
    allergens: "过敏原",
    suppliers: "供应商",
    team: "团队",
    reports: "报告",
    settings: "设置",
    signIn: "登录",
    signOut: "退出登录",
  },
  hi: {
    logs: "लॉग्स",
    allergens: "एलर्जेन",
    suppliers: "सप्लायर्स",
    team: "टीम",
    reports: "रिपोर्ट्स",
    settings: "सेटिंग्स",
    signIn: "साइन इन",
    signOut: "साइन आउट",
  },
};

function resolveLang(l: string | undefined): Lang {
  if (l === "zh" || l === "hi") return l;
  return "en";
}

type I18nContextValue = {
  lang: Lang;
  t: (key: string) => string;
};

const I18nContext = React.createContext<I18nContextValue | undefined>(
  undefined
);

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const { language } = useSettings(); // always defined now
  const lang = resolveLang(language);
  const dict = STRINGS[lang] ?? STRINGS.en;

  const t = React.useCallback(
    (key: string) => dict[key] ?? key,
    [dict]
  );

  const value = React.useMemo<I18nContextValue>(() => ({ lang, t }), [lang, t]);

  return (
    <I18nContext.Provider value={value}>{children}</I18nContext.Provider>
  );
}

export function useI18n(): I18nContextValue {
  const ctx = React.useContext(I18nContext);
  if (!ctx) throw new Error("useI18n must be used within I18nProvider");
  return ctx;
}

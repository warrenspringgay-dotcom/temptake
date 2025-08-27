"use client";

import React, { createContext, useContext, useMemo } from "react";
import { STRINGS, type Dict, type Lang } from "./strings";
import { useSettings } from "@/components/SettingsProvider";

type I18nValue = {
  lang: Lang;
  t: (key: string, vars?: Record<string, string | number>) => string;
};

const I18nContext = createContext<I18nValue | null>(null);

function resolveLang(languageSetting: string): Lang {
  if (languageSetting !== "auto") return languageSetting as Lang;

  // Browser/device language -> our supported set
  const lower = (typeof navigator !== "undefined" ? navigator.language : "en").toLowerCase();
  if (lower.startsWith("zh")) return lower.includes("hant") ? "zh-Hant" : "zh-Hans";
  if (lower.startsWith("hi")) return "hi";
  if (lower.startsWith("bn")) return "bn";
  if (lower.startsWith("pa")) return "pa";
  if (lower.startsWith("ta")) return "ta";
  if (lower.startsWith("ur")) return "ur";
  return "en";
}

function compile(dict: Dict) {
  return (key: string, vars?: Record<string, string | number>) => {
    let s = dict[key] ?? key;
    if (vars) for (const [k, v] of Object.entries(vars)) s = s.replaceAll(`{${k}}`, String(v));
    return s;
  };
}

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const { settings } = useSettings();
  const lang = resolveLang(settings.language);
  const dict = STRINGS[lang] ?? STRINGS.en;

  const value = useMemo(() => ({ lang, t: compile(dict) }), [lang, dict]);
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n must be used within I18nProvider");
  return ctx;
}

// src/i18n.tsx
"use client";

import React, { createContext, useContext, useState, ReactNode } from "react";

// Supported languages
type Language = "en-GB" | "en-US" | "fr-FR" | "zh-CN" | "hi-IN" | "auto";

const translations: Record<Language, Record<string, string>> = {
  "en-GB": {
    dashboard: "Dashboard",
    allergens: "Allergens",
    team: "Team",
    suppliers: "Suppliers",
    reports: "Reports",
    settings: "Settings",
    signIn: "Sign in",
    signOut: "Sign out",
  },
  "en-US": {
    dashboard: "Dashboard",
    allergens: "Allergens",
    team: "Team",
    suppliers: "Suppliers",
    reports: "Reports",
    settings: "Settings",
    signIn: "Sign in",
    signOut: "Sign out",
  },
  "fr-FR": {
    dashboard: "Tableau de bord",
    allergens: "Allergènes",
    team: "Équipe",
    suppliers: "Fournisseurs",
    reports: "Rapports",
    settings: "Paramètres",
    signIn: "Se connecter",
    signOut: "Se déconnecter",
  },
  "zh-CN": {
    dashboard: "仪表盘",
    allergens: "过敏原",
    team: "团队",
    suppliers: "供应商",
    reports: "报告",
    settings: "设置",
    signIn: "登录",
    signOut: "登出",
  },
  "hi-IN": {
    dashboard: "डैशबोर्ड",
    allergens: "एलर्जन",
    team: "टीम",
    suppliers: "आपूर्तिकर्ता",
    reports: "रिपोर्ट्स",
    settings: "सेटिंग्स",
    signIn: "साइन इन",
    signOut: "साइन आउट",
  },
  auto: {}, // auto handled by browser, fallback to en-GB
};

type I18nContextType = {
  lang: Language;
  setLang: (l: Language) => void;
  t: (key: string) => string;
};

const I18nContext = createContext<I18nContextType | null>(null);

export function I18nProvider({ children }: { children: ReactNode }) {
  const browserLang =
    typeof navigator !== "undefined" ? (navigator.language as Language) : "en-GB";
  const [lang, setLang] = useState<Language>(browserLang in translations ? browserLang : "en-GB");

  function t(key: string) {
    return translations[lang]?.[key] || translations["en-GB"][key] || key;
  }

  return (
    <I18nContext.Provider value={{ lang, setLang, t }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n must be used within I18nProvider");
  return ctx;
}

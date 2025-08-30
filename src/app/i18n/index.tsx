"use client";

import * as React from "react";
import { useSettings } from "@/components/SettingsProvider";

/** Supported language codes */
export type LanguageCode = "en" | "zh" | "hi" | "ur";

/** Simple string dictionaries (extend as needed) */
const STRINGS: Record<LanguageCode, Record<string, string>> = {
  en: {
    nav_dashboard: "Dashboard",
    nav_allergens: "Allergens",
    nav_team: "Team",
    nav_suppliers: "Suppliers",
    nav_reports: "Reports",
    quick_entry: "Quick entry",
    full_entry: "Full entry",
    search: "Search",
    from: "From",
    to: "To",
    category: "Category",
    entries: "Entries",
    top_logger: "Top logger",
    needs_attention: "Needs attention",
    days_missed: "Days missed",
  },
  zh: {
    nav_dashboard: "仪表板",
    nav_allergens: "过敏原",
    nav_team: "团队",
    nav_suppliers: "供应商",
    nav_reports: "报告",
    quick_entry: "快速录入",
    full_entry: "完整录入",
    search: "搜索",
    from: "开始",
    to: "结束",
    category: "类别",
    entries: "记录",
    top_logger: "记录最多",
    needs_attention: "需要关注",
    days_missed: "缺失天数",
  },
  hi: {
    nav_dashboard: "डैशबोर्ड",
    nav_allergens: "एलर्जेन्स",
    nav_team: "टीम",
    nav_suppliers: "आपूर्तिकर्ता",
    nav_reports: "रिपोर्ट्स",
    quick_entry: "त्वरित प्रविष्टि",
    full_entry: "पूर्ण प्रविष्टि",
    search: "खोजें",
    from: "से",
    to: "तक",
    category: "श्रेणी",
    entries: "एंट्रीज़",
    top_logger: "शीर्ष लॉगर",
    needs_attention: "ध्यान आवश्यक",
    days_missed: "छूटे दिन",
  },
  ur: {
    nav_dashboard: "ڈیش بورڈ",
    nav_allergens: "الرجنز",
    nav_team: "ٹیم",
    nav_suppliers: "سپلائرز",
    nav_reports: "رپورٹس",
    quick_entry: "جلد اندراج",
    full_entry: "مکمل اندراج",
    search: "تلاش",
    from: "سے",
    to: "تک",
    category: "قسم",
    entries: "اندراجات",
    top_logger: "سب سے زیادہ لاگ کرنے والا",
    needs_attention: "توجہ درکار",
    days_missed: "چھوٹے دن",
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

const I18nContext = React.createContext<I18nContextValue | null>(null);

export function I18nProvider({ children }: { children: React.ReactNode }) {
  // ✅ read directly from SettingsProvider (no nested 'settings')
  const { language } = useSettings();
  const lang = resolveLang(language);
  const dict = STRINGS[lang] ?? STRINGS.en;

  const t = React.useCallback((key: string) => dict[key] ?? key, [dict]);
  const value = React.useMemo<I18nContextValue>(() => ({ lang, t }), [lang, t]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nContextValue {
  const ctx = React.useContext(I18nContext);
  if (!ctx) throw new Error("useI18n must be used within I18nProvider");
  return ctx;
}

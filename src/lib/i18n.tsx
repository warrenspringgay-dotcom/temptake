"use client";

import React, {
  createContext,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

type Dict = Record<string, string>;
type I18nCtx = {
  t: (key: string) => string;
  locale: string;
  setLocale: (l: string) => void;
  dicts: Record<string, Dict>;
};

const I18nContext = createContext<I18nCtx | null>(null);

const defaultDicts: Record<string, Dict> = {
  en: {
    // add more strings as you go
    "nav.user.menu.signOut": "Sign out",
    "nav.user.menu.settings": "Settings",
  },
};

export function I18nProvider({
  children,
  initialLocale = "en",
  dicts = defaultDicts,
}: {
  children: ReactNode;
  initialLocale?: string;
  dicts?: Record<string, Dict>;
}) {
  const [locale, setLocale] = useState(initialLocale);

  const value = useMemo<I18nCtx>(
    () => ({
      locale,
      setLocale,
      dicts,
      t: (key: string) => dicts[locale]?.[key] ?? key,
    }),
    [locale, dicts]
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) {
    throw new Error("useI18n must be used within I18nProvider");
  }
  return ctx;
}

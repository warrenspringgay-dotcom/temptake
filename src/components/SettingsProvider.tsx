"use client";

import * as React from "react";

/** Languages you plan to support */
export type Language = "en" | "zh" | "hi" | "ur";

/** Temperature units */
export type TempUnit = "C" | "F";

/** All app-wide settings kept in context */
export type Settings = {
  /** Display + branding (not necessarily editable in the Settings page) */
  brandName: string;
  brandAccent: string; // hex or CSS color
  logoUrl: string;     // path or absolute URL

  /** Functional settings */
  unit: TempUnit;
  language: Language;

  /** Auth / access shape you asked for */
  allowGuestEntries: boolean;
  requireLoginForEntries: boolean;
};

export type SettingsContextValue = Settings & {
  update: (patch: Partial<Settings>) => void;
};

const SettingsContext = React.createContext<SettingsContextValue | null>(null);

/** Default values shown before any persistence / user changes */
const defaultSettings: Settings = {
  brandName: "TempTake",
  brandAccent: "#F59E0B",
  logoUrl: "/temptake-192.png",

  unit: "C",
  language: "en",

  allowGuestEntries: true,
  requireLoginForEntries: false,
};

const STORAGE_KEY = "temptake.settings.v1";

/** Persist lightweight settings in localStorage (client-side only) */
function loadFromStorage(): Partial<Settings> | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? (parsed as Partial<Settings>) : null;
  } catch {
    return null;
  }
}

function saveToStorage(s: Settings) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
  } catch {
    // ignore
  }
}

/** Provider */
export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = React.useState<Settings>(() => {
    const fromLS = loadFromStorage();
    return { ...defaultSettings, ...(fromLS ?? {}) };
  });

  const update = React.useCallback((patch: Partial<Settings>) => {
    setState((prev) => {
      const next = { ...prev, ...patch };
      saveToStorage(next);
      return next;
    });
  }, []);

  const value = React.useMemo<SettingsContextValue>(() => ({ ...state, update }), [state, update]);

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

/** Hook */
export function useSettings(): SettingsContextValue {
  const ctx = React.useContext(SettingsContext);
  if (!ctx) throw new Error("useSettings must be used within SettingsProvider");
  return ctx;
}

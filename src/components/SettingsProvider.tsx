"use client";

import React, { createContext, useContext, useEffect, useMemo, useState } from "react";

/** App-wide, user-facing settings only */
export type TempUnit = "C" | "F";
export type Theme = "system" | "light" | "dark";
export type TimeFormat = "24h" | "12h";
/** Language codes we’ll support in-app; "auto" follows device/browser */
export type Language =
  | "auto"
  | "en"
  | "zh-Hans"   // Simplified Chinese
  | "zh-Hant"   // Traditional Chinese
  | "hi"        // Hindi
  | "bn"        // Bengali
  | "pa"        // Punjabi
  | "ta"        // Tamil
  | "ur";       // Urdu

export type Settings = {
  tempUnit: TempUnit;
  theme: Theme;
  timeFormat: TimeFormat;
  language: Language;
  /** If true, users must be in Team to log (disables guest entries) */
  requireTeamToLog: boolean;
  /** Default months for quick/inspection reports (e.g., 3) */
  defaultReportMonths: 1 | 2 | 3 | 6 | 12;
};

type SettingsContextValue = {
  settings: Settings;
  update: (patch: Partial<Settings>) => void;
  reset: () => void;
};

const DEFAULTS: Settings = {
  tempUnit: "C",
  theme: "system",
  timeFormat: "24h",
  language: "auto",
  requireTeamToLog: false,
  defaultReportMonths: 3,
};

const STORAGE_KEY = "tt_settings_v2"; // bumped to v2 after removing brand fields
const SettingsContext = createContext<SettingsContextValue | null>(null);

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<Settings>(DEFAULTS);
  const [ready, setReady] = useState(false);

  // Load once
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<Settings>;
        setSettings({ ...DEFAULTS, ...parsed });
      } else {
        // migrate old keys if present (best-effort)
        const oldRaw = localStorage.getItem("tt_settings_v1");
        if (oldRaw) {
          const old = JSON.parse(oldRaw) as Record<string, unknown>;
          const migrated: Partial<Settings> = {};
          if (old?.tempUnit === "F") migrated.tempUnit = "F";
          if (old?.theme === "light" || old?.theme === "dark") migrated.theme = old.theme as Theme;
          setSettings({ ...DEFAULTS, ...migrated });
        }
      }
    } catch {}
    setReady(true);
  }, []);

  // Persist + reflect theme on document
  useEffect(() => {
    if (!ready) return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    document.documentElement.dataset.theme = settings.theme;
  }, [settings, ready]);

  const value = useMemo<SettingsContextValue>(
    () => ({
      settings,
      update: (patch) => setSettings((prev) => ({ ...prev, ...patch })),
      reset: () => setSettings(DEFAULTS),
    }),
    [settings]
  );

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

export function useSettings(): SettingsContextValue {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error("useSettings must be used within SettingsProvider");
  return ctx;
}

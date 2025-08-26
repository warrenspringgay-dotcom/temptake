"use client";

import React, { createContext, useContext, useEffect, useMemo, useState } from "react";

export type TempUnit = "C" | "F";
export type Theme = "system" | "light" | "dark";

export type AppSettings = {
  tempUnit: TempUnit;
  theme: Theme;
  language: string; // BCP-47 like 'en-GB' or 'auto'
};

const DEFAULT_SETTINGS: AppSettings = { tempUnit: "C", theme: "system", language: "auto" };
const LS_KEY = "tt_settings_v1";

type Ctx = { settings: AppSettings; setSettings: (u: Partial<AppSettings>) => void };
const SettingsCtx = createContext<Ctx | null>(null);

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettingsState] = useState<AppSettings>(() => {
    try { const raw = localStorage.getItem(LS_KEY); if (raw) return JSON.parse(raw); } catch {}
    return DEFAULT_SETTINGS;
  });

  // First-run language auto-detect
  useEffect(() => {
    if (settings.language === "auto") {
      const detected = typeof navigator !== "undefined" ? (navigator.language || "en-GB") : "en-GB";
      update({ language: detected });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function update(u: Partial<AppSettings>) {
    setSettingsState(prev => {
      const next = { ...prev, ...u };
      localStorage.setItem(LS_KEY, JSON.stringify(next));
      return next;
    });
  }

  const value = useMemo(() => ({ settings, setSettings: update }), [settings]);
  return <SettingsCtx.Provider value={value}>{children}</SettingsCtx.Provider>;
}

export function useSettings() {
  const ctx = useContext(SettingsCtx);
  if (!ctx) throw new Error("useSettings must be used within SettingsProvider");
  return ctx;
}

/* Temp helpers */
export function toCelsius(input: number, unit: TempUnit): number {
  return unit === "C" ? input : (input - 32) * (5 / 9);
}
export function fromCelsius(c: number, unit: TempUnit): number {
  return unit === "C" ? c : c * (9 / 5) + 32;
}
export function formatTemp(celsiusValue: number, unit: TempUnit) {
  return unit === "C"
    ? `${celsiusValue.toFixed(1)}°C`
    : `${fromCelsius(celsiusValue, unit).toFixed(1)}°F`;
}

// src/components/SettingsProvider.tsx
"use client";

import React from "react";

export type Language = "en" | "zh" | "hi";
export type TempUnit = "C" | "F";

export type Settings = {
  language: Language;
  unit: TempUnit;
  allowGuestEntries: boolean;
  requireLoginForEntries: boolean;
  // brand shown in UI (kept to avoid breaking existing components)
  brandName: string;
  brandAccent: string;
  logoUrl: string;
};

const DEFAULTS: Settings = {
  language: "en",
  unit: "C",
  allowGuestEntries: true,
  requireLoginForEntries: false,
  brandName: "TempTake",
  brandAccent: "#F59E0B",
  logoUrl: "/temptake-192.png",
};

export type SettingsContextValue = {
  // whole object (used by Settings page)
  settings: Settings;
  // convenience “flattened” access (used across app)
  language: Language;
  unit: TempUnit;
  allowGuestEntries: boolean;
  requireLoginForEntries: boolean;
  brandName: string;
  brandAccent: string;
  logoUrl: string;

  update: (patch: Partial<Settings>) => void;
};

const SettingsContext = React.createContext<SettingsContextValue | undefined>(
  undefined
);

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  // persist to localStorage on the client; hydrate with defaults first
  const [settings, setSettings] = React.useState<Settings>(DEFAULTS);

  // hydrate once on mount
  React.useEffect(() => {
    try {
      const raw = localStorage.getItem("tt.settings");
      if (raw) {
        const parsed = JSON.parse(raw);
        setSettings({ ...DEFAULTS, ...parsed });
      }
    } catch {
      /* ignore */
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // persist on change
  React.useEffect(() => {
    try {
      localStorage.setItem("tt.settings", JSON.stringify(settings));
    } catch {
      /* ignore */
    }
  }, [settings]);

  const update = React.useCallback((patch: Partial<Settings>) => {
    setSettings((s) => ({ ...s, ...patch }));
  }, []);

  const value: SettingsContextValue = React.useMemo(
    () => ({
      settings,
      language: settings.language,
      unit: settings.unit,
      allowGuestEntries: settings.allowGuestEntries,
      requireLoginForEntries: settings.requireLoginForEntries,
      brandName: settings.brandName,
      brandAccent: settings.brandAccent,
      logoUrl: settings.logoUrl,
      update,
    }),
    [settings, update]
  );

  return (
    <SettingsContext.Provider value={value}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings(): SettingsContextValue {
  const ctx = React.useContext(SettingsContext);
  if (!ctx)
    throw new Error("useSettings must be used within SettingsProvider");
  return ctx;
}

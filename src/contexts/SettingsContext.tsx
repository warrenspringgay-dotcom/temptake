// src/contexts/SettingsContext.tsx
"use client";

import React, { createContext, useContext, useMemo, useState } from "react";
import { saveSettings, type AppSettings } from "@/app/actions/settings";

type Ctx = {
  settings: AppSettings | null;
  setSettings?: (next: AppSettings | null) => void;
  /** Merge a partial into current settings and persist */
  update: (patch: Partial<AppSettings>) => Promise<{ ok: boolean; message?: string }>;
};

const SettingsContext = createContext<Ctx>({
  settings: null,
  update: async () => ({ ok: true }),
});

function buildDefaults(base?: AppSettings | null): AppSettings {
  return {
    brandName: base?.brandName ?? "TempTake",
    tempUnits: base?.tempUnits ?? "C",
    timezone: base?.timezone ?? null,
    notifications: {
      email: base?.notifications?.email ?? true,
      sms: base?.notifications?.sms ?? false,
    },
  };
}

function deepMergeSettings(a: AppSettings, b: Partial<AppSettings>): AppSettings {
  return {
    brandName: b.brandName ?? a.brandName,
    tempUnits: b.tempUnits ?? a.tempUnits,
    timezone: b.timezone === undefined ? a.timezone : b.timezone,
    
    
  };
}

export function SettingsProvider({
  initial,
  children,
}: {
  initial?: AppSettings | null;
  children: React.ReactNode;
}) {
  const [settings, setSettings] = useState<AppSettings | null>(initial ?? null);

  async function update(patch: Partial<AppSettings>) {
    // 1) ensure we have a complete baseline
    const current = buildDefaults(settings);
    // 2) merge the user's patch
    const merged = deepMergeSettings(current, patch);
    // 3) persist full settings
    const res = await saveSettings(merged);
    if (res?.ok === false) return { ok: false, message: res.message || "Failed to save settings" };
    // 4) update local state
    setSettings(merged);
    return { ok: true };
  }

  const value = useMemo<Ctx>(() => ({ settings, setSettings, update }), [settings]);

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

export function useSettings() {
  return useContext(SettingsContext);
}

"use client";
import React, { createContext, useContext, useEffect, useState } from "react";
import { getSettings, saveSettings, type AppSettings } from "@/app/actions/settings";

type Ctx = {
  settings: AppSettings | null;
  loading: boolean;
  refresh: () => Promise<void>;
  update: (patch: Partial<AppSettings>) => Promise<void>;
};

const SettingsContext = createContext<Ctx | null>(null);

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [loading, setLoading] = useState(true);

  async function refresh() {
    setLoading(true);
    try {
      const s = await getSettings();
      setSettings(s);
    } finally {
      setLoading(false);
    }
  }

  async function update(patch: Partial<AppSettings>) {
    const next = await saveSettings(patch);
    setSettings(next);
  }

  useEffect(() => { void refresh(); }, []);

  return (
    <SettingsContext.Provider value={{ settings, loading, refresh, update }}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error("useSettings must be used within SettingsProvider");
  return ctx;
}

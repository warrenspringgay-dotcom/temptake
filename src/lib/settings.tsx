"use client";
import React, { createContext, useContext, useState } from "react";

type Settings = {
  org_name?: string | null;
  logo_url?: string | null;
  timezone?: string | null;
};

type Ctx = {
  settings: Settings | null;
  setSettings: React.Dispatch<React.SetStateAction<Settings | null>>;
};

const SettingsCtx = createContext<Ctx | undefined>(undefined);

export function SettingsProvider({ children, initial }: { children: React.ReactNode; initial?: Settings | null }) {
  const [settings, setSettings] = useState<Settings | null>(initial ?? null);
  return <SettingsCtx.Provider value={{ settings, setSettings }}>{children}</SettingsCtx.Provider>;
}

export function useSettings() {
  const ctx = useContext(SettingsCtx);
  if (!ctx) throw new Error("useSettings must be used inside <SettingsProvider>");
  return ctx;
}

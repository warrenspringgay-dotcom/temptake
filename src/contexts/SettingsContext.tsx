"use client";

import React, { createContext, useContext, useState } from "react";

type Settings = {
  theme: "light" | "dark";
  siteName: string;
  // add whatever you actually use here
};

type Ctx = {
  settings: Settings;
  setSettings: React.Dispatch<React.SetStateAction<Settings>>;
};

const SettingsContext = createContext<Ctx | null>(null);

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<Settings>({
    theme: "light",
    siteName: "TempTake",
  });

  return (
    <SettingsContext.Provider value={{ settings, setSettings }}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const ctx = useContext(SettingsContext);
  if (!ctx) {
    throw new Error("useSettings must be used within SettingsProvider");
  }
  return ctx;
}

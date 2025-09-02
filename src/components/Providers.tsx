// src/components/Providers.tsx
"use client";

import React from "react";
import { SettingsProvider } from "@/components/SettingsProvider";
import { I18nProvider } from "@/lib/i18n";

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SettingsProvider>
      <I18nProvider>{children}</I18nProvider>
    </SettingsProvider>
  );
}

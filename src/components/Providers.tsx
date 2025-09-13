// src/components/Providers.tsx
"use client";

import React from "react";
import { SettingsProvider } from "@/components/SettingsProvider";
import { I18nProvider } from "@/lib/i18n";
import ThemeClient from "@/components/ThemeClient";

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SettingsProvider>
      <I18nProvider>
        {children}
        {/* Runs theme + language side effects */}
        <ThemeClient />
      </I18nProvider>
    </SettingsProvider>
  );
}

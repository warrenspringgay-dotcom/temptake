// src/app/providers.tsx
"use client";

import React from "react";
import { SettingsProvider, useSettings } from "@/components/SettingsProvider";
import { I18nProvider } from "@/lib/i18n";

function WithI18n({ children }: { children: React.ReactNode }) {
  const { language = "en" } = useSettings() as { language?: "en" | "zh" | "ur" | "hi" };
  return <I18nProvider lang={language}>{children}</I18nProvider>;
}

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SettingsProvider>
      <WithI18n>{children}</WithI18n>
    </SettingsProvider>
  );
}

// src/app/settings/page.tsx
"use client";

import React, { useMemo } from "react";
import NavTabs from "@/components/NavTabs";
import { useSettings } from "@/components/SettingsProvider";

// If you added i18n, these types may live in your i18n module; otherwise keep simple unions here.
type LanguageCode = "en" | "zh" | "ur" | "hi";
type TempUnit = "C" | "F";

export default function SettingsPage() {
  // NOTE: useSettings exposes individual fields + update()
  const {
    language,       // "en" | "zh" | "ur" | "hi"
    unit,           // "C" | "F"
    allowGuestEntries,
    update,         // (partial) => void
  } = useSettings();

  // Helpers to coerce strings from <select> into our unions
  const langValue: LanguageCode = useMemo(() => (["en", "zh", "ur", "hi"].includes(language as string) ? (language as LanguageCode) : "en"), [language]);
  const unitValue: TempUnit = useMemo(() => (unit === "F" ? "F" : "C"), [unit]);

  function onLangChange(e: React.ChangeEvent<HTMLSelectElement>) {
    update({ language: e.target.value as LanguageCode });
  }
  function onUnitChange(e: React.ChangeEvent<HTMLSelectElement>) {
    update({ unit: e.target.value as TempUnit });
  }
  function onGuestModeChange(e: React.ChangeEvent<HTMLInputElement>) {
    update({ allowGuestEntries: e.target.checked });
  }

  return (
    <div className="min-h-screen w-full bg-gray-50">
      <NavTabs />

      <main className="mx-auto max-w-3xl p-4 space-y-6">
        <h1 className="text-xl font-semibold">Settings</h1>

        <section className="rounded-lg border bg-white p-4 space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Language</label>
            <select
              value={langValue}
              onChange={onLangChange}
              className="rounded border px-2 py-1"
            >
              <option value="en">English</option>
              <option value="zh">中文 (Chinese)</option>
              <option value="ur">اردو (Urdu)</option>
              <option value="hi">हिन्दी (Hindi)</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Temperature unit</label>
            <select
              value={unitValue}
              onChange={onUnitChange}
              className="rounded border px-2 py-1"
            >
              <option value="C">°C</option>
              <option value="F">°F</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <input
              id="guest"
              type="checkbox"
              checked={!!allowGuestEntries}
              onChange={onGuestModeChange}
              className="h-4 w-4"
            />
            <label htmlFor="guest" className="text-sm">
              Allow guest entries (no sign-in)
            </label>
          </div>
        </section>
      </main>
    </div>
  );
}

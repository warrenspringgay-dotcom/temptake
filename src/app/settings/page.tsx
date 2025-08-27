"use client";

import React, { useMemo } from "react";
import NavTabs from "@/components/NavTabs";
import { useSettings } from "@/components/SettingsProvider";
import type { Language } from "@/components/SettingsProvider";

type LanguageCode = "en" | "zh" | "hi";
type TempUnit = "C" | "F";
type TimeFormat = "24h" | "12h";

/** Map between UI codes and provider Language type */
const TO_PROVIDER_LANG: Record<LanguageCode, Language> = {
  en: "en" as Language,
  zh: "zh-CN" as Language,
  hi: "hi-IN" as Language,
};
const FROM_PROVIDER_LANG = new Map<Language, LanguageCode>([
  ["en" as Language, "en"],
  ["zh-CN" as Language, "zh"],
  ["hi-IN" as Language, "hi"],
]);

export default function SettingsPage() {
  const { settings, update } = useSettings();

  const lang: LanguageCode = useMemo(() => {
    const prov = settings.language as Language | undefined;
    return (prov && FROM_PROVIDER_LANG.get(prov)) || "en";
  }, [settings.language]);

  const unit: TempUnit = settings.tempUnit === "F" ? "F" : "C";
  const timeFmt: TimeFormat = settings.timeFormat === "12h" ? "12h" : "24h";

  function onLangChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const value = e.target.value as LanguageCode;
    update({ language: TO_PROVIDER_LANG[value] });
  }
  function onUnitChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const value = e.target.value as TempUnit;
    update({ tempUnit: value });
  }
  function onTimeFmtChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const value = e.target.value as TimeFormat;
    update({ timeFormat: value });
  }

  return (
    <div className="min-h-screen w-full bg-gray-50">
      <NavTabs />

      <main className="mx-auto max-w-6xl p-4 space-y-4">
        <header className="flex items-center justify-between">
          <h1 className="text-lg font-semibold">Settings</h1>
        </header>

        <section className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
          <h2 className="mb-3 text-base font-semibold">Language & Units</h2>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <label className="text-sm">
              <div className="mb-1 text-gray-600">Language</div>
              <select
                className="w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm"
                value={lang}
                onChange={onLangChange}
              >
                <option value="en">English</option>
                <option value="zh">中文 (Chinese)</option>
                <option value="hi">हिंदी (Hindi)</option>
              </select>
            </label>

            <label className="text-sm">
              <div className="mb-1 text-gray-600">Temperature unit</div>
              <select
                className="w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm"
                value={unit}
                onChange={onUnitChange}
              >
                <option value="C">°C</option>
                <option value="F">°F</option>
              </select>
            </label>

            <label className="text-sm">
              <div className="mb-1 text-gray-600">Time format</div>
              <select
                className="w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm"
                value={timeFmt}
                onChange={onTimeFmtChange}
              >
                <option value="24h">24-hour</option>
                <option value="12h">12-hour</option>
              </select>
            </label>
          </div>
        </section>

        {/* Future section (Access) – uncomment once fields exist in Settings type
        <section className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
          <h2 className="mb-3 text-base font-semibold">Access</h2>
          ...
        </section>
        */}
      </main>
    </div>
  );
}

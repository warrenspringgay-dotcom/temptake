// src/app/settings/SettingsInner.tsx
"use client";

import React, { useMemo } from "react";
import { useSettings, type Language, type TempUnit } from "@/components/SettingsProvider";

export default function SettingsInner() {
  const { settings, update } = useSettings();

  // language
  function onLangChange(e: React.ChangeEvent<HTMLSelectElement>) {
    update({ language: e.target.value as Language });
  }

  // unit
  function onUnitChange(e: React.ChangeEvent<HTMLSelectElement>) {
    update({ unit: e.target.value as TempUnit });
  }

  // guest + require login
  function onGuestChange(e: React.ChangeEvent<HTMLInputElement>) {
    update({ allowGuestEntries: e.target.checked });
  }
  function onRequireLoginChange(e: React.ChangeEvent<HTMLInputElement>) {
    update({ requireLoginForEntries: e.target.checked });
  }

  return (
    <main className="mx-auto max-w-3xl p-4 space-y-4">
      <h1 className="text-lg font-semibold">Settings</h1>

      <div className="rounded-lg border bg-white p-4 space-y-3">
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="text-sm">
            <div className="mb-1 text-gray-600">Language</div>
            <select
              value={settings.language}
              onChange={onLangChange}
              className="w-full rounded border px-2 py-1.5"
            >
              <option value="en">English</option>
              <option value="zh">中文</option>
              <option value="hi">हिन्दी</option>
            </select>
          </label>

          <label className="text-sm">
            <div className="mb-1 text-gray-600">Temperature unit</div>
            <select
              value={settings.unit}
              onChange={onUnitChange}
              className="w-full rounded border px-2 py-1.5"
            >
              <option value="C">°C</option>
              <option value="F">°F</option>
            </select>
          </label>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={settings.allowGuestEntries}
              onChange={onGuestChange}
            />
            Allow guest entries
          </label>

          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={settings.requireLoginForEntries}
              onChange={onRequireLoginChange}
            />
            Require login to submit entries
          </label>
        </div>
      </div>
    </main>
  );
}

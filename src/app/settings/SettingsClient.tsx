"use client";

import { useSettings } from "@/contexts/SettingsContext";

export default function SettingsClient() {
  const { settings, setSettings } = useSettings();

  return (
    <main className="p-4 space-y-4">
      <h1 className="text-xl font-semibold">Settings</h1>

      <div className="rounded-2xl border bg-white p-4 shadow-sm space-y-3">
        <div>
          <label className="mb-1 block text-xs text-gray-500">Site name</label>
          <input
            className="w-full rounded-xl border px-3 py-2"
            value={settings.siteName}
            onChange={(e) =>
              setSettings((s) => ({ ...s, siteName: e.target.value }))
            }
          />
        </div>

        <div>
          <label className="mb-1 block text-xs text-gray-500">Theme</label>
          <select
            className="w-full rounded-xl border px-3 py-2"
            value={settings.theme}
            onChange={(e) =>
              setSettings((s) => ({ ...s, theme: e.target.value as "light" | "dark" }))
            }
          >
            <option value="light">Light</option>
            <option value="dark">Dark</option>
          </select>
        </div>
      </div>
    </main>
  );
}

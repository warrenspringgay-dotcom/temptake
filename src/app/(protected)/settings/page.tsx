"use client";

import React, { useState } from "react";

export default function SettingsPage() {
  const [org, setOrg] = useState({ name: "", address: "" });
  const [prefs, setPrefs] = useState({ timezone: "Europe/London", units: "metric", notifications: true });

  function save() {
    // TODO: wire to Supabase
    alert("Settings saved.");
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-4">
      <h1 className="text-2xl font-bold">Settings</h1>

      <section className="rounded-2xl border bg-white p-4">
        <h2 className="mb-3 text-lg font-semibold">Organisation</h2>
        <div className="grid gap-3">
          <input className="h-11 rounded-xl border px-3" placeholder="Organisation name" value={org.name} onChange={(e) => setOrg({ ...org, name: e.target.value })} />
          <textarea className="min-h-[90px] rounded-xl border px-3 py-2" placeholder="Address" value={org.address} onChange={(e) => setOrg({ ...org, address: e.target.value })} />
        </div>
      </section>

      <section className="rounded-2xl border bg-white p-4">
        <h2 className="mb-3 text-lg font-semibold">Preferences</h2>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <label className="text-sm">
            <div className="mb-1 text-gray-600">Timezone</div>
            <select className="h-11 w-full rounded-xl border px-3" value={prefs.timezone} onChange={(e) => setPrefs({ ...prefs, timezone: e.target.value })}>
              <option value="Europe/London">Europe/London</option>
              <option value="Europe/Dublin">Europe/Dublin</option>
              <option value="Europe/Paris">Europe/Paris</option>
            </select>
          </label>
          <label className="text-sm">
            <div className="mb-1 text-gray-600">Units</div>
            <select className="h-11 w-full rounded-xl border px-3" value={prefs.units} onChange={(e) => setPrefs({ ...prefs, units: e.target.value })}>
              <option value="metric">Metric (°C)</option>
              <option value="imperial">Imperial (°F)</option>
            </select>
          </label>
          <label className="mt-2 flex items-center gap-2 text-sm md:col-span-2">
            <input type="checkbox" checked={prefs.notifications} onChange={(e) => setPrefs({ ...prefs, notifications: e.target.checked })} />
            Enable email notifications
          </label>
        </div>
      </section>

      <div className="flex justify-end">
        <button onClick={save} className="rounded-xl bg-black px-4 py-2 text-sm font-medium text-white hover:bg-gray-900">
          Save settings
        </button>
      </div>
    </div>
  );
}

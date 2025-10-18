// src/app/settings/SettingsClient.tsx
"use client";

import React, { useEffect, useMemo, useState } from "react";
import { saveSettings, type AppSettings } from "@/app/actions/settings";
import { useSettings } from "@/contexts/SettingsContext";

type FormState = {
  brandName: string;
  tempUnits: "C" | "F";
  timezone: string | null;
  emailNotif: boolean;
  smsNotif: boolean;
};

function toAppSettings(f: FormState): AppSettings {
  return {
    brandName: f.brandName.trim() || "TempTake",
    tempUnits: f.tempUnits,
    timezone: f.timezone || null,
    notifications: {
      email: !!f.emailNotif,
      sms: !!f.smsNotif,
    },
  };
}

export default function SettingsClient() {
  // Some SettingsContext implementations only expose `settings`.
  // We'll read it, and only call `setSettings` if it exists.
  const ctx = useSettings() as any;
  const settings = ctx?.settings as AppSettings | null;
  const setSettings: ((s: AppSettings | null) => void) | undefined = ctx?.setSettings;

  const [form, setForm] = useState<FormState>({
    brandName: "TempTake",
    tempUnits: "C",
    timezone: null,
    emailNotif: true,
    smsNotif: false,
  });

  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  // Seed the form from current settings when available
  useEffect(() => {
    if (!settings) return;
    setForm({
      brandName: settings.brandName ?? "TempTake",
      tempUnits: settings.tempUnits ?? "C",
      timezone: settings.timezone ?? null,
      emailNotif: !!settings.notifications?.email,
      smsNotif: !!settings.notifications?.sms,
    });
  }, [settings]);

  const canSave = useMemo(
    () => form.brandName.trim().length > 0 && (form.tempUnits === "C" || form.tempUnits === "F"),
    [form.brandName, form.tempUnits]
  );

  async function onSave() {
    setSaving(true);
    setMsg(null);

    const payload: AppSettings = toAppSettings(form);
    const res = await saveSettings(payload);

    if (!res.ok) {
      setMsg(res.message || "Save failed");
    } else {
      setMsg("Saved ✔");
      // Update context if it supports it; otherwise ignore
      try {
        setSettings?.(payload);
      } catch {}
    }

    setSaving(false);
  }

  return (
    <main className="p-4 space-y-4">
      <h1 className="text-xl font-semibold">Settings</h1>

      <div className="rounded-2xl border bg-white p-4 space-y-4 max-w-xl">
        <div>
          <label className="block text-xs text-gray-500 mb-1">Brand name</label>
          <input
            className="w-full rounded-md border px-3 py-2"
            value={form.brandName}
            onChange={(e) => setForm((f) => ({ ...f, brandName: e.target.value }))}
          />
        </div>

        <div>
          <label className="block text-xs text-gray-500 mb-1">Temperature units</label>
          <select
            className="w-full rounded-md border px-3 py-2"
            value={form.tempUnits}
            onChange={(e) => setForm((f) => ({ ...f, tempUnits: e.target.value as "C" | "F" }))}
          >
            <option value="C">Celsius (°C)</option>
            <option value="F">Fahrenheit (°F)</option>
          </select>
        </div>

        <div>
          <label className="block text-xs text-gray-500 mb-1">Timezone (optional)</label>
          <input
            className="w-full rounded-md border px-3 py-2"
            placeholder="e.g. Europe/London"
            value={form.timezone ?? ""}
            onChange={(e) => setForm((f) => ({ ...f, timezone: e.target.value || null }))}
          />
        </div>

        <fieldset className="space-y-2">
          <legend className="text-xs text-gray-500 mb-1">Notifications</legend>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={form.emailNotif}
              onChange={(e) => setForm((f) => ({ ...f, emailNotif: e.target.checked }))}
            />
            <span className="text-sm">Email</span>
          </label>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={form.smsNotif}
              onChange={(e) => setForm((f) => ({ ...f, smsNotif: e.target.checked }))}
            />
            <span className="text-sm">SMS</span>
          </label>
        </fieldset>

        {msg && <div className="text-sm">{msg}</div>}

        <div className="pt-2">
          <button
            onClick={onSave}
            disabled={!canSave || saving}
            className="rounded-md bg-black px-4 py-2 text-white disabled:opacity-50"
          >
            {saving ? "Saving…" : "Save settings"}
          </button>
        </div>
      </div>
    </main>
  );
}

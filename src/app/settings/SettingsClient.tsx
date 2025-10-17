"use client";

import { useEffect, useState } from "react";
import { useSettings } from "@/lib/settings"; // assumed read-only context { settings }
import { saveSettings } from "@/app/actions/settings";

type FormState = {
  org_name: string;
  logo_url: string;
  timezone: string;
};

export default function SettingsClient() {
  // read-only settings from context (no setSettings here)
  const { settings } = useSettings() as { settings: Partial<FormState> | null };

  const [form, setForm] = useState<FormState>({
    org_name: "",
    logo_url: "",
    timezone: "Europe/London",
  });
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  // prime the form from context when it loads/changes
  useEffect(() => {
    if (!settings) return;
    setForm((f) => ({
      org_name: settings.org_name ?? f.org_name,
      logo_url: settings.logo_url ?? f.logo_url,
      timezone: settings.timezone ?? f.timezone,
    }));
  }, [settings]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMsg(null);
    const res = await saveSettings(form);
    if (!res.ok) {
      setMsg(res.message || "Save failed");
    } else {
      setMsg("Saved ✔");
      // If your context re-hydrates from server props, a refresh will show new values:
      // location.reload();
    }
    setSaving(false);
  }

  return (
    <main className="p-4 space-y-4">
      <h1 className="text-lg font-semibold">Organisation Settings</h1>

      {msg && (
        <div className="rounded-md border px-3 py-2 text-sm
                        border-emerald-200 bg-emerald-50 text-emerald-900">
          {msg}
        </div>
      )}

      <form onSubmit={onSubmit} className="max-w-md space-y-4 rounded-2xl border bg-white p-4 shadow-sm">
        <div>
          <label className="mb-1 block text-xs text-gray-500">Organisation name</label>
          <input
            className="w-full rounded-xl border px-3 py-2"
            value={form.org_name}
            onChange={(e) => setForm((f) => ({ ...f, org_name: e.target.value }))}
            placeholder="My Restaurant Ltd"
          />
        </div>

        <div>
          <label className="mb-1 block text-xs text-gray-500">Logo URL</label>
          <input
            className="w-full rounded-xl border px-3 py-2"
            value={form.logo_url}
            onChange={(e) => setForm((f) => ({ ...f, logo_url: e.target.value }))}
            placeholder="https://…/logo.png"
          />
        </div>

        <div>
          <label className="mb-1 block text-xs text-gray-500">Timezone</label>
          <input
            className="w-full rounded-xl border px-3 py-2"
            value={form.timezone}
            onChange={(e) => setForm((f) => ({ ...f, timezone: e.target.value }))}
            placeholder="Europe/London"
          />
        </div>

        <div className="pt-2">
          <button
            type="submit"
            disabled={saving}
            className={`rounded-xl px-4 py-2 text-sm font-medium text-white ${
              saving ? "bg-gray-400" : "bg-black hover:bg-gray-900"
            }`}
          >
            {saving ? "Saving…" : "Save settings"}
          </button>
        </div>
      </form>
    </main>
  );
}

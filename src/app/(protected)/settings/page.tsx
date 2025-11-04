// src/app/settings/page.tsx
"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseBrowser";
import { getActiveOrgIdClient } from "@/lib/orgClient";

export default function SettingsPage() {
  const [businessName, setBusinessName] = useState("");
  const [defaultLocation, setDefaultLocation] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  // Load current settings for active org
  useEffect(() => {
    (async () => {
      try {
        const orgId = await getActiveOrgIdClient();
        if (!orgId) return;

        const { data, error } = await supabase
          .from("settings")
          .select("org_name, default_location")
          .eq("org_id", orgId)
          .maybeSingle();

        if (error) {
          console.warn("Failed to load settings", error);
          return;
        }

        if (data) {
          setBusinessName(data.org_name ?? "");
          setDefaultLocation(data.default_location ?? "");
        }
      } catch (err) {
        console.warn("Failed to load settings", err);
      }
    })();
  }, []);

  async function handleSave(e?: React.FormEvent) {
    e?.preventDefault();
    setSaving(true);
    setMessage(null);

    try {
      const orgId = await getActiveOrgIdClient();
      if (!orgId) {
        alert("No organisation found.");
        return;
      }

      const payload = {
        org_id: orgId,                             // ← UUID here
        org_name: businessName.trim(),
        default_location: defaultLocation.trim() || null,
      };

      const { error } = await supabase
        .from("settings")
        .upsert(payload, { onConflict: "org_id" }); // one row per org

      if (error) throw error;
      setMessage("✅ Settings saved.");
    } catch (err: any) {
      console.error(err);
      setMessage(
        `⚠️ Failed to save: ${err.message ?? "Unknown error"}`
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="max-w-xl rounded-2xl border bg-white p-4 shadow-sm">
      <h1 className="mb-4 text-xl font-semibold">Settings</h1>

      <form onSubmit={handleSave} className="grid gap-4">
        {/* Business name */}
        <label className="block">
          <span className="mb-1 block text-xs text-gray-500">
            Business name
          </span>
          <input
            className="h-10 w-full rounded-xl border px-3"
            placeholder="e.g., Springgays Limited"
            value={businessName}
            onChange={(e) => setBusinessName(e.target.value)}
            required
          />
        </label>

        {/* Preferred location */}
        <label className="block">
          <span className="mb-1 block text-xs text-gray-500">
            Preferred location
          </span>
          <input
            className="h-10 w-full rounded-xl border px-3"
            placeholder="e.g., Kitchen"
            value={defaultLocation}
            onChange={(e) => setDefaultLocation(e.target.value)}
          />
        </label>

        <button
          type="submit"
          disabled={saving}
          className="mt-1 rounded-xl bg-black px-4 py-2 text-sm font-medium text-white hover:bg-gray-900 disabled:opacity-60"
        >
          {saving ? "Saving…" : "Save changes"}
        </button>
      </form>

      {message && (
        <div className="mt-3 text-sm text-gray-700">
          {message}
        </div>
      )}
    </div>
  );
}

// src/app/(protected)/settings/page.tsx
"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseBrowser";
import { getActiveOrgIdClient } from "@/lib/orgClient";

type SettingsRow = {
  org_id: string;
  org_name: string | null;
  preferred_location: string | null;
};

export default function SettingsPage() {
  const [businessName, setBusinessName] = useState("");
  const [preferredLocation, setPreferredLocation] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Load current settings for this org
  useEffect(() => {
    (async () => {
      setLoading(true);
      setError(null);
      setSuccess(null);

      try {
        const orgId = await getActiveOrgIdClient();
        if (!orgId) {
          setError("No organisation found for this user.");
          setLoading(false);
          return;
        }

        const { data, error } = await supabase
          .from("settings")
          .select("org_id, org_name, preferred_location")
          .eq("org_id", orgId)
          .maybeSingle();

        // If there is no row yet, that's OK – user will create it
        if (error && error.code !== "PGRST116") {
          console.warn("Failed to load settings", error);
          setError(error.message);
        }

        const row = (data as SettingsRow | null) || null;

        if (row) {
          setBusinessName(row.org_name ?? "");
          setPreferredLocation(row.preferred_location ?? "");
        }
      } catch (err: any) {
        console.warn("Settings load failed", err);
        setError(err?.message || "Failed to load settings.");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const orgId = await getActiveOrgIdClient();
      if (!orgId) {
        setError("No organisation found.");
        setSaving(false);
        return;
      }

      const payload: SettingsRow = {
        org_id: orgId,
        org_name: businessName.trim() || null,
        preferred_location: preferredLocation.trim() || null,
      };

      // Upsert by org_id so there is one row per org
      const { error } = await supabase
        .from("settings")
        .upsert(payload, { onConflict: "org_id" });

      if (error) {
        console.error("Settings save failed", error);
        setError(error.message || "Failed to save settings.");
      } else {
        setSuccess("Settings saved.");

        // 🔔 Tell OrgName to reload
        try {
          window.dispatchEvent(new Event("tt-settings-updated"));
        } catch {
          // ignore if window not available
        }
      }
    } catch (err: any) {
      console.error("Settings save failed", err);
      setError(err?.message || "Failed to save settings.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto max-w-xl rounded-2xl border bg-white p-4 shadow-sm">
      <h1 className="mb-3 text-xl font-semibold">Settings</h1>

      <form className="space-y-4" onSubmit={handleSubmit}>
        <label className="block">
          <span className="mb-1 block text-xs text-gray-500">
            Business name
          </span>
          <input
            className="h-10 w-full rounded-xl border px-3"
            placeholder="e.g., Pier Vista"
            value={businessName}
            onChange={(e) => setBusinessName(e.target.value)}
            disabled={loading || saving}
          />
        </label>

        <label className="block">
          <span className="mb-1 block text-xs text-gray-500">
            Preferred location
          </span>
          <input
            className="h-10 w-full rounded-xl border px-3"
            placeholder="e.g., Kitchen"
            value={preferredLocation}
            onChange={(e) => setPreferredLocation(e.target.value)}
            disabled={loading || saving}
          />
        </label>

        <button
          type="submit"
          disabled={saving || loading}
          className={`mt-2 flex h-10 w-full items-center justify-center rounded-2xl text-sm font-medium text-white ${
            saving || loading
              ? "bg-gray-500 cursor-not-allowed"
              : "bg-black hover:bg-gray-900"
          }`}
        >
          {saving ? "Saving..." : "Save changes"}
        </button>
      </form>

      {/* Messages */}
      <div className="mt-3 space-y-1 text-sm">
        {error && (
          <div className="rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-amber-900">
            ⚠️ Failed to save: {error}
          </div>
        )}
        {success && !error && (
          <div className="rounded-md border border-emerald-300 bg-emerald-50 px-3 py-2 text-emerald-900">
            ✅ {success}
          </div>
        )}
      </div>
    </div>
  );
}

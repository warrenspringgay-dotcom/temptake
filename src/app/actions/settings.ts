// src/app/actions/settings.ts
"use server";

import { revalidatePath } from "next/cache";
import { getServerSupabase } from "@/lib/supabaseServer";
import { getActiveOrgIdServer } from "@/lib/orgServer";

/** Shape of settings your client expects. Extend safely as you need. */
export type AppSettings = {
  brandName: string;
  tempUnits: "C" | "F";
  timezone?: string | null;
  notifications?: {
    email?: boolean;
    sms?: boolean;
  };
};

/** Defaults used when the org has no saved settings yet. */
function getDefaultSettings(): AppSettings {
  return {
    brandName: "TempTake",
    tempUnits: "C",
    timezone: null,
    notifications: { email: true, sms: false },
  };
}

/**
 * Load org-scoped settings.
 * Assumes a table named `app_settings` with:
 *   - org_id (uuid) PK/FK
 *   - data (jsonb)  -- the whole settings object
 * Adjust table/column names if yours differ.
 */
export async function getSettings(): Promise<AppSettings> {
  const supabase = await getServerSupabase();
  const orgId = await getActiveOrgIdServer();
  if (!orgId) {
    // Return defaults if there is no active org
    return getDefaultSettings();
  }

  const { data, error } = await supabase
    .from("app_settings")
    .select("data")
    .eq("org_id", orgId)
    .maybeSingle();

  if (error) {
    // On read failure, fall back to defaults rather than throw
    return getDefaultSettings();
  }

  // Merge saved data over defaults to tolerate partial rows / schema changes
  const saved = (data?.data as AppSettings | null) ?? null;
  return { ...getDefaultSettings(), ...(saved ?? {}) };
}

/**
 * Save org-scoped settings (UPSERT).
 * Only the fields the client sends are persisted; we don’t try to diff.
 */
export async function saveSettings(next: AppSettings): Promise<{ ok: true } | { ok: false; message: string }> {
  const supabase = await getServerSupabase();
  const orgId = await getActiveOrgIdServer();
  if (!orgId) {
    return { ok: false, message: "No active organisation." };
  }

  // Upsert by org_id; ensure your Supabase table has a unique constraint on org_id.
  const { error } = await supabase
    .from("app_settings")
    .upsert(
      { org_id: orgId, data: next },
      { onConflict: "org_id" }
    );

  if (error) {
    return { ok: false, message: error.message };
  }

  // Revalidate any pages that read settings
  revalidatePath("/");
  revalidatePath("/settings");
  return { ok: true };
}

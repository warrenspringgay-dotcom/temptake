// src/app/actions/settings.ts
"use server";
import { requireUser } from '@/lib/requireUser';
import { getServerSupabase } from "@/lib/supabaseServer"; // ← fixed path

export type AppSettings = {
  org_name: string | null;
  locale: string | null;
  date_format: string | null;
};

const DEFAULTS: AppSettings = {
  org_name: "TempTake",
  locale: "en-GB",
  date_format: "dd/MM/yyyy",
};

function isMissingTable(errMsg?: string) {
  return !!errMsg && (/42P01/.test(errMsg) || /does not exist/i.test(errMsg) || /schema cache/i.test(errMsg));
}

export async function getSettings(): Promise<AppSettings> {
  const supabase = await getServerSupabase();
  const { data, error } = await supabase.from("settings").select("*").limit(1).maybeSingle();
  if (error) {
    if (isMissingTable(error.message)) return DEFAULTS;
    console.error("getSettings:", error.message);
    return DEFAULTS;
  }
  return { ...DEFAULTS, ...data };
}

export async function saveSettings(patch: Partial<AppSettings>): Promise<AppSettings> {
 const supabase = await getServerSupabase();
  const payload = { id: 1, ...patch };

  const { data, error } = await supabase
    .from("settings")
    .upsert(payload, { onConflict: "id" })
    .select("*")
    .single();

  if (error) {
    if (isMissingTable(error.message)) return { ...DEFAULTS, ...patch };
    console.error("saveSettings:", error.message);
    return { ...DEFAULTS, ...patch };
  }
  return { ...DEFAULTS, ...data };
}

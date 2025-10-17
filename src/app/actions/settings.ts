"use server";

import { getServerSupabase } from "@/lib/supabaseServer";
import { getActiveOrgIdServer } from "@/lib/orgServer";
import { requireUser } from "@/lib/requireUser";

type Payload = {
  org_name?: string;
  logo_url?: string;
  timezone?: string;
};

export async function saveSettings(input: Payload): Promise<{ ok: true } | { ok: false; message: string }> {
  await requireUser(); // ensure logged in
  const supabase = await getServerSupabase();
  const orgId = await getActiveOrgIdServer();
  if (!orgId) return { ok: false, message: "No active org." };

  // upsert into a single-row-per-org table (adjust table/columns if different)
  const { error } = await supabase
    .from("org_settings")
    .upsert(
      {
        org_id: orgId,
        org_name: input.org_name ?? null,
        logo_url: input.logo_url ?? null,
        timezone: input.timezone ?? null,
      },
      { onConflict: "org_id" }
    );

  if (error) return { ok: false, message: error.message };
  return { ok: true };
}

"use server";

import { getServerSupabase } from "@/lib/supabaseServer";
import { getActiveOrgIdServer } from "@/lib/orgServer";


export type TrainingInput = {
  id?: string;
  staffId?: string | null;        // team_members.id
  staffInitials?: string | null;  // fallback create/lookup by initials
  type: string;
  awarded_on: string;             // YYYY-MM-DD
  expires_on?: string | null;
  certificate_url?: string | null;
  notes?: string | null;
};

function addDaysISO(baseISO: string, days: number) {
  const d = new Date(baseISO);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

async function ensureStaffExists(supabase: any, org_id: string, opts: { staffId?: string | null; staffInitials?: string | null; }) {
  const { staffId, staffInitials } = opts;

  if (staffId) {
    const { data, error } = await supabase
      .from("team_members")
      .select("id").eq("id", staffId).eq("org_id", org_id).maybeSingle();
    if (error) throw new Error(`Failed to verify staff: ${error.message}`);
    if (!data?.id) throw new Error("Selected staff not found.");
    return data.id;
  }

  const ini = staffInitials?.trim().toUpperCase() ?? "";
  if (!ini) throw new Error("No staff selected: provide staffId or staffInitials.");

  const { data, error } = await supabase
    .from("team_members")
    .select("id").eq("initials", ini).eq("org_id", org_id).maybeSingle();
  if (error) throw new Error(`Failed to lookup staff by initials: ${error.message}`);
  if (data?.id) return data.id;

  const { data: created, error: createErr } = await supabase
    .from("team_members")
    .insert({ org_id, initials: ini, name: ini })
    .select("id")
    .single();
  if (createErr) throw new Error(`Failed to create staff: ${createErr.message}`);
  if (!created?.id) throw new Error("Failed to create staff (no id returned).");
  return created.id;
}

export async function saveTrainingServer(input: TrainingInput) {
  const supabase = await getServerSupabase();
  const org_id = await getActiveOrgIdServer();

  if (!org_id) throw new Error("No org selected.");

  const staff_id = await ensureStaffExists(supabase, org_id, {
    staffId: input.staffId,
    staffInitials: input.staffInitials,
  });

  const expires_on =
    input.expires_on && input.expires_on.trim()
      ? input.expires_on
      : addDaysISO(input.awarded_on, 365);

  const payload = {
    id: input.id,
    org_id,
    staff_id,
    type: input.type,
    awarded_on: input.awarded_on,
    expires_on,
    certificate_url: input.certificate_url ?? null,
    notes: input.notes ?? null,
  };

  const { data, error } = await supabase
    .from("trainings")
    .upsert(payload, { onConflict: "id" })
    .select("id")
    .single();

  if (error) throw new Error(`[trainings.upsert] ${error.message}`);
  return { id: data.id as string };
}

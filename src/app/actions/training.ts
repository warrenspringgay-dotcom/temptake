// src/app/actions/trainings.ts
"use server";

import { createServerClient } from "@/lib/supabaseServer";

export type TrainingInput = {
  id?: string;
  staffId?: string | null;
  staffInitials?: string | null;
  type: string;
  awarded_on: string;
  expires_on?: string | null;
  certificate_url?: string | null;
  notes?: string | null;
};

function addDaysISO(baseISO: string, days: number) {
  const d = new Date(baseISO);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

async function ensureStaffExists(supabase: any, opts: { staffId?: string | null; staffInitials?: string | null; }) {
  const { staffId, staffInitials } = opts;

  if (staffId) {
    const { data, error } = await supabase.from("staff").select("id").eq("id", staffId).maybeSingle();
    if (error) throw new Error(`Failed to verify staff: ${error.message}`);
    if (!data?.id) throw new Error("Selected staff not found.");
    return data.id;
  }

  const ini = staffInitials?.trim().toUpperCase() ?? "";
  if (!ini) throw new Error("No staff selected: provide staffId or staffInitials.");

  const { data, error } = await supabase.from("staff").select("id").eq("initials", ini).maybeSingle();
  if (error) throw new Error(`Failed to lookup staff by initials: ${error.message}`);
  if (data?.id) return data.id;

  const { data: created, error: createErr } = await supabase.from("staff").insert({ initials: ini }).select("id").single();
  if (createErr) throw new Error(`Failed to create staff: ${createErr.message}`);
  if (!created?.id) throw new Error("Failed to create staff (no id returned).");
  return created.id;
}

export async function saveTrainingServer(input: TrainingInput) {
  const supabase = await createServerClient();

  const staff_id = await ensureStaffExists(supabase, {
    staffId: input.staffId,
    staffInitials: input.staffInitials,
  });

  const expires_on =
    input.expires_on && input.expires_on.trim() ? input.expires_on : addDaysISO(input.awarded_on, 365);

  const payload = {
    id: input.id,
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

// src/components/TeamManagerCloud.tsx
"use client";

import { supabase } from "@/lib/supabaseBrowser";


/** Shape coming from your UI */
export type TrainingInput = {
  id?: string;                 // existing training id when editing
  staffId?: string | null;     // direct selection from a staff picker (optional)
  staffInitials?: string | null; // or initials typed/selected (optional)
  type: string;                // e.g. "Level 2", "Induction", etc.
  awarded_on: string;          // "yyyy-mm-dd"
  expires_on?: string | null;  // "yyyy-mm-dd" (optional, will default if missing)
  certificate_url?: string | null;
  notes?: string | null;
};

/** Add N days to an ISO yyyy-mm-dd date (safe for DATE columns). */
function addDaysISO(baseISO: string, days: number): string {
  const d = new Date(baseISO);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

/**
 * Ensure a row exists in public.staff and return its id.
 * - If staffId is passed, verify it exists.
 * - Else, use initials to find or create a staff row.
 */
async function ensureStaffExists(opts: {
  staffId?: string | null;
  staffInitials?: string | null;
}): Promise<string> {
  const { staffId, staffInitials } = opts;

  // 1) Explicit staffId → verify it exists
  if (staffId) {
    const { data, error } = await supabase
      .from("staff")
      .select("id")
      .eq("id", staffId)
      .maybeSingle();

    if (error) throw new Error(`Failed to verify staff: ${error.message}`);
    if (!data?.id) throw new Error("Selected staff not found.");
    return data.id;
  }

  // 2) Resolve by initials (find or create minimal row)
  const ini = staffInitials?.trim().toUpperCase() ?? "";
  if (!ini) throw new Error("No staff selected: provide staffId or staffInitials.");

  // Try find by initials
  {
    const { data, error } = await supabase
      .from("staff")
      .select("id, initials")
      .eq("initials", ini)
      .maybeSingle();

    if (error) throw new Error(`Failed to lookup staff by initials: ${error.message}`);
    if (data?.id) return data.id;
  }

  // Not found → create minimal staff row
  const { data: created, error: createErr } = await supabase
    .from("staff")
    .insert({ initials: ini }) // add any other defaults your table allows
    .select("id")
    .single();

  if (createErr) throw new Error(`Failed to create staff: ${createErr.message}`);
  if (!created?.id) throw new Error("Failed to create staff (no id returned).");
  return created.id;
}

/**
 * Upsert a training row **with a valid staff_id** (FK to public.staff).
 * Matches your current `public.trainings` schema:
 * (id, staff_id, type, awarded_on, expires_on, certificate_url, notes)
 * Does **not** send created_by/updated_at/org_id since they don't exist in your table.
 */
export async function upsertTrainingCloud(input: TrainingInput): Promise<{ id: string }> {
  // 1) Make sure we have a real staff.id
  const staff_id = await ensureStaffExists({
    staffId: input.staffId,
    staffInitials: input.staffInitials,
  });

  // 2) Compute expiry if not supplied (default 12 months = 365 days)
  const expires_on =
    input.expires_on && input.expires_on.trim().length > 0
      ? input.expires_on
      : addDaysISO(input.awarded_on, 365);

  // 3) Build payload that matches your columns exactly
  const payload = {
    id: input.id, // allow undefined for insert
    staff_id,
    type: input.type,
    awarded_on: input.awarded_on,
    expires_on,
    certificate_url: input.certificate_url ?? null,
    notes: input.notes ?? null,
  };

  // 4) Upsert by primary key id (if provided). If id is undefined, it inserts.
  const { data, error } = await supabase
    .from("trainings")
    .upsert(payload, { onConflict: "id" })
    .select("id")
    .single();

  if (error) throw new Error(`[trainings.upsert] ${error.message}`);
  if (!data?.id) throw new Error("Upsert succeeded but no id was returned from trainings.");

  return { id: data.id };
}

/** Convenience wrapper you can call from your UI form. */
export async function saveTraining(form: TrainingInput) {
  return upsertTrainingCloud(form);
}

/**
 * Minimal placeholder component so imports don’t break pages that render it.
 * You can replace this with a real UI later (or remove the default export and stop importing it).
 */
export default function TeamManagerCloud() {
  return null;
}

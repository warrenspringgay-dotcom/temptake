// src/app/actions/training.ts
"use server";

import { getServerSupabase } from "@/lib/supabaseServer";
import { getActiveOrgIdServer } from "@/lib/orgServer";

export type TrainingInput = {
  id?: string;
  staffId?: string | null;        // staff.id
  staffInitials?: string | null;  // fallback: create/lookup by initials
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

/**
 * Ensure there is a row in the `staff` table for this staffId/initials,
 * and return the REAL `staff.id` to use as trainings.staff_id.
 *
 * NOTE: staff table has NO org_id column, so we don't filter by org.
 */
async function ensureStaffExists(
  supabase: any,
  opts: { staffId?: string | null; staffInitials?: string | null }
): Promise<string> {
  const { staffId, staffInitials } = opts;

  // 1) If staffId was explicitly passed, verify it exists in `staff`
  if (staffId) {
    const { data, error } = await supabase
      .from("staff")
      .select("id")
      .eq("id", staffId)
      .maybeSingle();

    if (error) {
      throw new Error(`Failed to verify staff: ${error.message}`);
    }
    if (!data?.id) {
      throw new Error("Selected staff not found.");
    }

    return String(data.id);
  }

  // 2) Fallback: use initials to find/create staff row
  const ini = staffInitials?.trim().toUpperCase() ?? "";
  if (!ini) {
    throw new Error("No staff selected: provide staffId or staffInitials.");
  }

  // Look up existing staff by initials (no org filter – staff has no org_id)
  const { data, error } = await supabase
    .from("staff")
    .select("id")
    .eq("initials", ini)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to lookup staff by initials: ${error.message}`);
  }

  if (data?.id) {
    return String(data.id);
  }

  // Create new staff row if not found
  const { data: created, error: createErr } = await supabase
    .from("staff")
    .insert({
      initials: ini,
      name: ini,
    })
    .select("id")
    .single();

  if (createErr) {
    throw new Error(`Failed to create staff: ${createErr.message}`);
  }
  if (!created?.id) {
    throw new Error("Failed to create staff (no id returned).");
  }

  return String(created.id);
}

export async function saveTrainingServer(input: TrainingInput) {
  const supabase = await getServerSupabase();
  const org_id = await getActiveOrgIdServer();

  if (!org_id) throw new Error("No org selected.");

  // ✅ Always resolve to a real staff.id in `staff`
  const staff_id = await ensureStaffExists(supabase, {
    staffId: input.staffId,
    staffInitials: input.staffInitials,
  });

  const expires_on =
    input.expires_on && input.expires_on.trim()
      ? input.expires_on
      : addDaysISO(input.awarded_on, 365);

  const payload: any = {
    org_id,
    staff_id,
    type: input.type,
    awarded_on: input.awarded_on,
    expires_on,
    certificate_url: input.certificate_url ?? null,
    notes: input.notes ?? null,
  };

  // Only include id when updating (upsert on PK)
  if (input.id) {
    payload.id = input.id;
  }

  const { data, error } = await supabase
    .from("trainings")
    .upsert(payload, { onConflict: "id" })
    .select("id")
    .single();

  if (error) throw new Error(`[trainings.upsert] ${error.message}`);

  return { id: data.id as string };
}

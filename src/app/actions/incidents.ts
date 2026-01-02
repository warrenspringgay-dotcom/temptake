"use server";

import { revalidatePath } from "next/cache";
import { getServerSupabase } from "@/lib/supabaseServer";
import { requireUser } from "@/lib/requireUser";
import { getActiveOrgIdServer } from "@/lib/orgServer";

type Result = { ok: true } | { ok: false; message: string };

export type IncidentPayload = {
  // org
  org_id?: string | null;
  orgId?: string | null;

  // location
  location_id?: string | null;
  locationId?: string | null;

  // date
  happened_on?: string | null; // YYYY-MM-DD
  happenedOn?: string | null;  // YYYY-MM-DD

  // incident core
  type?: string | null;
  details?: string | null;

  // actions (DB columns)
  immediate_action?: string | null;
  immediateAction?: string | null;

  preventive_action?: string | null;
  preventiveAction?: string | null;

  // legacy/client fields (map to DB columns)
  corrective_action?: string | null;
  correctiveAction?: string | null;

  // initials / author (many aliases because humans)
  created_by?: string | null;
  createdBy?: string | null;
  createdByInitials?: string | null;
};

function clean(v: unknown): string | null {
  if (v === undefined || v === null) return null;
  const s = String(v).trim();
  return s ? s : null;
}

/**
 * Inserts into public.incidents.
 */
export async function createIncident(payload: IncidentPayload): Promise<Result> {
  try {
    await requireUser();
    const supabase = await getServerSupabase();

    const orgId =
      clean(payload.org_id) ??
      clean(payload.orgId) ??
      (await getActiveOrgIdServer());

    const locationId = clean(payload.location_id) ?? clean(payload.locationId);

    const happenedOn =
      clean(payload.happened_on) ??
      clean(payload.happenedOn) ??
      new Date().toISOString().slice(0, 10);

    // Map any "corrective" field into immediate_action if immediate_action not provided.
    const immediate =
      clean(payload.immediate_action) ??
      clean(payload.immediateAction) ??
      clean(payload.corrective_action) ??
      clean(payload.correctiveAction);

    const preventive =
      clean(payload.preventive_action) ?? clean(payload.preventiveAction);

    const createdBy =
      clean(payload.created_by) ??
      clean(payload.createdBy) ??
      clean(payload.createdByInitials);

    if (!locationId) {
      return { ok: false, message: "Location is required." };
    }

    const insertRow = {
      org_id: String(orgId),
      location_id: String(locationId),
      happened_on: happenedOn,
      type: clean(payload.type),
      details: clean(payload.details),
      immediate_action: immediate,
      preventive_action: preventive,
      created_by: createdBy,
    };

    const { error } = await supabase.from("incidents").insert(insertRow);

    if (error) return { ok: false, message: error.message };

    revalidatePath("/manager");
    revalidatePath("/reports");
    revalidatePath("/staff");

    return { ok: true };
  } catch (e: any) {
    return { ok: false, message: e?.message ?? "Failed to log incident." };
  }
}

/**
 * Backwards-compatible alias.
 */
export async function logIncident(payload: IncidentPayload): Promise<Result> {
  return createIncident(payload);
}

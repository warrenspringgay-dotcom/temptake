// src/app/actions/incidents.ts
"use server";

import { revalidatePath } from "next/cache";
import { getServerSupabase } from "@/lib/supabaseServer";
import { requireUser } from "@/lib/requireUser";
import { getActiveOrgIdServer } from "@/lib/orgServer";

export type NewIncident = {
  happenedOn: string; // yyyy-mm-dd
  locationId: string | null;
  type: string;
  details: string;
  correctiveAction?: string;
  preventiveAction?: string;
  createdByInitials: string; // e.g. WS
};

type Result = { ok: true } | { ok: false; message: string };

export async function logIncident(payload: NewIncident): Promise<Result> {
  try {
    // Auth required
    await requireUser();

    const supabase = await getServerSupabase();
    const orgId = await getActiveOrgIdServer();

    const happened_on = (payload.happenedOn ?? "").trim();
    const location_id = payload.locationId ?? null;
    const type = (payload.type ?? "").trim();
    const details = (payload.details ?? "").trim();
    const corrective_action = (payload.correctiveAction ?? "").trim() || null;
    const preventive_action = (payload.preventiveAction ?? "").trim() || null;
    const created_by = (payload.createdByInitials ?? "").trim().toUpperCase();

    if (!happened_on) return { ok: false, message: "Date is required." };
    if (!type) return { ok: false, message: "Type is required." };
    if (!details) return { ok: false, message: "Details are required." };
    if (!created_by) return { ok: false, message: "Initials are required." };

    const insertRow = {
      org_id: orgId,
      location_id,
      happened_on,
      type,
      details,
      corrective_action,
      preventive_action,
      created_by,
    };

    const { error } = await supabase.from("cleaning_incidents").insert(insertRow);

    if (error) return { ok: false, message: error.message };

    // Refresh UI pages that show incidents
    revalidatePath("/manager");
    revalidatePath("/reports");
    revalidatePath("/staff");

    return { ok: true };
  } catch (e: any) {
    return { ok: false, message: e?.message ?? "Failed to log incident." };
  }
}

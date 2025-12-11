// src/lib/allergenAudit.ts
import { supabase } from "@/lib/supabaseBrowser";
import { getActiveOrgIdClient } from "@/lib/orgClient";
import { getActiveLocationIdClient } from "@/lib/locationClient";

export type AllergenChangeAction = "create" | "update" | "delete";

export type AllergenChangePayload = {
  action: AllergenChangeAction;
  itemId?: string | null;
  itemName?: string | null;
  categoryBefore?: string | null;
  categoryAfter?: string | null;
  flagsBefore?: Record<string, boolean> | null;
  flagsAfter?: Record<string, boolean> | null;
  notesBefore?: string | null;
  notesAfter?: string | null;
};

export async function logAllergenChange(
  payload: AllergenChangePayload
): Promise<void> {
  try {
    const orgId = await getActiveOrgIdClient();
    if (!orgId) return;

    let locationId: string | null = null;
    try {
      locationId = (await getActiveLocationIdClient()) ?? null;
    } catch {
      locationId = null;
    }

    // Try to get staff initials from team_members
    let staffInitials: string | null = null;

    try {
      const userRes = await supabase.auth.getUser();
      const email = userRes.data.user?.email?.toLowerCase() ?? null;

      if (email) {
        const { data: tm } = await supabase
          .from("team_members")
          .select("initials")
          .eq("org_id", orgId)
          .eq("email", email)
          .maybeSingle();

        if (tm?.initials) {
          staffInitials = String(tm.initials).toUpperCase().trim();
        }
      }
    } catch {
      // ignore, logging is best-effort
    }

    const { error } = await supabase.from("allergen_change_logs").insert({
      org_id: orgId,
      location_id: locationId,
      action: payload.action,
      item_id: payload.itemId ?? null,
      item_name: payload.itemName ?? null,
      category_before: payload.categoryBefore ?? null,
      category_after: payload.categoryAfter ?? null,
      flags_before: payload.flagsBefore ?? null,
      flags_after: payload.flagsAfter ?? null,
      notes_before: payload.notesBefore ?? null,
      notes_after: payload.notesAfter ?? null,
      staff_initials: staffInitials,
    });

    if (error) {
      console.error("[allergen-audit] insert failed", error.message);
    }
  } catch (e) {
    console.error("[allergen-audit] unexpected failure", e);
  }
}

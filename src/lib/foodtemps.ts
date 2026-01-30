// /src/lib/foodtemps.ts (replace your current file)

import { getServerSupabase } from "@/lib/getServerSupabase";
import { getActiveOrgIdServer } from "@/lib/orgServer";
import { getActiveLocationIdServer } from "@/lib/locationServer";

type LogTempArgs = {
  area: string;
  targetKey: string;
  tempC: number;
  note?: string | null;
  staffInitials?: string | null;
  teamMemberId?: string | null;
};

export async function logTemp({
  area,
  targetKey,
  tempC,
  note = null,
  staffInitials = null,
  teamMemberId = null,
}: LogTempArgs) {
  const supabase = await getServerSupabase();

  const orgId = await getActiveOrgIdServer();
  const locationId = await getActiveLocationIdServer();

  if (!orgId) throw new Error("No active org");
  if (!locationId) throw new Error("No active location");

  const { error } = await supabase.from("food_temp_logs").insert({
    org_id: orgId,
    location_id: locationId,
    area,
    target_key: targetKey,
    temp_c: tempC,
    note,
    staff_initials: staffInitials ? staffInitials.toUpperCase() : null,
    team_member_id: teamMemberId,
    // created_by + at handled by defaults/triggers
  });

  if (error) throw error;
}

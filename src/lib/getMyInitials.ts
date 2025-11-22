import { supabase } from "@/lib/supabaseBrowser";
import { getActiveOrgIdClient } from "@/lib/orgClient";

export async function getMyInitials(): Promise<string | null> {
  try {
    const { data: auth } = await supabase.auth.getUser();
    const email = auth?.user?.email;
    if (!email) return null;

    const orgId = await getActiveOrgIdClient();
    if (!orgId) return null;

    const { data } = await supabase
      .from("team_members")
      .select("initials")
      .eq("org_id", orgId)
      .eq("email", email)
      .limit(1);

    const ini = data?.[0]?.initials;
    return ini ? ini.toUpperCase() : null;
  } catch {
    return null;
  }
}

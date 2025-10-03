// src/lib/org.ts
import { supabaseServer } from "./supabase-server";

/** Resolve the active org for the current user.
 *  Strategy:
 *   - if only one membership in user_orgs, use it
 *   - else prefer membership with role IN ('owner','admin')
 *   - else first one
 */
export async function getOrgId(): Promise<string> {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not signed in");

  const { data: uos, error } = await supabase
    .from("user_orgs")
    .select("org_id, role")
    .eq("user_id", user.id)
    .limit(20);

  if (error) throw new Error(error.message);
  if (!uos?.length) throw new Error("No org membership found");

  if (uos.length === 1) return uos[0].org_id;

  const owner = uos.find(u => u.role === "owner" || u.role === "admin");
  return (owner ?? uos[0]).org_id;
}

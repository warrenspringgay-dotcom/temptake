// src/lib/get-user-role.ts
import { ServerSupabase } from "@/lib/supabase-server";

export type Role = "staff" | "manager" | "owner";

/**
 * Resolve the current user's role.
 * It checks (in order):
 *  1) user.metadata.role (app_metadata or user_metadata)
 *  2) public.user_roles table (columns: user_id UUID, role text)
 *  3) defaults to "staff"
 */
export async function getRole(): Promise<Role> {
  const supabase = await ServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return "staff";

  const metaRole =
    (user.app_metadata as any)?.role ||
    (user.user_metadata as any)?.role;
  if (metaRole === "owner" || metaRole === "manager" || metaRole === "staff") {
    return metaRole;
  }

  const { data: row } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", user.id)
    .maybeSingle();

  const tableRole = row?.role;
  if (tableRole === "owner" || tableRole === "manager" || tableRole === "staff") {
    return tableRole;
  }

  return "staff";
}

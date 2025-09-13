// Server-only helper
import { getServerSupabase } from "@/lib/supabase-server";

export type Role = "owner" | "manager" | "staff" | null;

export async function getUserRole(): Promise<Role> {
  const supabase = await getServerSupabase();
  const { data: userRes } = await supabase.auth.getUser();
  if (!userRes?.user) return null;

  // Calls the SECURITY DEFINER function (bypasses RLS safely)
  const { data, error } = await supabase.rpc("get_current_role");
  if (error) {
    console.error("[roles] lookup error:", error);
    return null;
  }
  return (data as Role) ?? null;
}

/** Convenience: check if user has at least one required role */
export async function hasRole(required: Array<Exclude<Role, null>>): Promise<boolean> {
  const role = await getUserRole();
  return !!role && required.includes(role);
}

// src/lib/get-user-role.ts
import { createServerClient } from "@/lib/supabaseServer";

export type Role = "staff" | "manager" | "owner";

/**
 * Reads the current user's role (or a specific userId if provided).
 * Adjust the table/column names to match your schema.
 */
export async function getUserRole(userId?: string): Promise<Role | null> {
  const supabase = await createServerClient();

  // Resolve a user id if not supplied
  const id =
    userId ?? (await supabase.auth.getUser()).data.user?.id ?? null;
  if (!id) return null;

  // Example: read from a user_roles table. Change as needed.
  const { data, error } = await supabase
    .from("user_roles")            // <- change to your table if different (e.g. "profiles")
    .select("role")
    .eq("user_id", id)
    .maybeSingle();

  if (error || !data?.role) return null;

  const role = String(data.role);
  if (role === "owner" || role === "manager" || role === "staff") {
    return role as Role;
  }
  return null;
}

// src/lib/org.ts
import { createServerClient } from "@/lib/supabaseServer";

/**
 * Resolve the active org for the current signed-in user (server-side).
 * Looks in user_orgs → team_members → user/app metadata.
 */
export async function getOrgId(): Promise<string | null> {
  const supabase = await createServerClient();

  // current user
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  // 1) user_orgs (preferred)
  try {
    const { data: uos } = await supabase
      .from("user_orgs")
      .select("org_id, role")
      .eq("user_id", user.id)
      .order("role", { ascending: true }); // owner/admin first if you use lexicographic roles

    if (uos && uos.length > 0) {
      // pick an owner/admin if present, else first
      const owner = uos.find((u: { role?: string | null }) =>
        (u.role ?? "").toLowerCase() === "owner" ||
        (u.role ?? "").toLowerCase() === "admin"
      );
      return String((owner ?? uos[0]).org_id);
    }
  } catch { /* ignore */ }

  // 2) team_members fallback
  try {
    const { data: tm } = await supabase
      .from("team_members")
      .select("org_id, owner_id")
      .eq("user_id", user.id)
      .maybeSingle();

    if (tm?.org_id) return String(tm.org_id);
    if (tm?.owner_id) return String(tm.owner_id);
  } catch { /* ignore */ }

  // 3) metadata fallback
  const metaOrg =
    (user.user_metadata as any)?.org_id ??
    (user.app_metadata as any)?.org_id ??
    null;

  return metaOrg ? String(metaOrg) : null;
}

/**
 * Resolve org id for a specific user id (when you already know it).
 */
export async function getOrgIdFor(userId: string): Promise<string | null> {
  const supabase = await createServerClient();

  try {
    const { data: uos } = await supabase
      .from("user_orgs")
      .select("org_id, role")
      .eq("user_id", userId);

    if (uos && uos.length > 0) {
      const owner = uos.find((u: { role?: string | null }) =>
        (u.role ?? "").toLowerCase() === "owner" ||
        (u.role ?? "").toLowerCase() === "admin"
      );
      return String((owner ?? uos[0]).org_id);
    }
  } catch {}

  try {
    const { data: tm } = await supabase
      .from("team_members")
      .select("org_id, owner_id")
      .eq("user_id", userId)
      .maybeSingle();

    if (tm?.org_id) return String(tm.org_id);
    if (tm?.owner_id) return String(tm.owner_id);
  } catch {}

  // if you need metadata lookup here, you’d need the user session; skipping
  return null;
}

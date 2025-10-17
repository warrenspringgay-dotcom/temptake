// Add to: src/app/actions/team.ts
import { getServerSupabase } from "@/lib/supabaseServer";
import { getActiveOrgIdServer } from "@/lib/orgServer";

function deriveInitials(name?: string | null, email?: string | null) {
  const fromName = (name ?? "").trim();
  if (fromName) {
    const parts = fromName.split(/\s+/);
    const a = parts[0]?.[0] ?? "";
    const b = parts[1]?.[0] ?? "";
    const ini = (a + (b || "")).toUpperCase();
    if (ini) return ini;
  }
  const fromEmail = (email ?? "").trim();
  if (fromEmail) return fromEmail[0]?.toUpperCase() ?? "";
  return "";
}

/** Used by temp logs: return a unique, uppercased list of staff initials for the active org. */
export async function listStaffInitials(): Promise<string[]> {
  const supabase = await getServerSupabase();
  const orgId = await getActiveOrgIdServer();
  if (!orgId) return [];

  const { data, error } = await supabase
    .from("team_members")
    .select("initials,name,email,active")
    .eq("org_id", orgId);

  if (error) throw new Error(error.message);

  const initials = (data ?? [])
    .filter((r: any) => r.active !== false) // treat null/true as active
    .map((r: any) => (r.initials?.toString().trim().toUpperCase()) || deriveInitials(r.name, r.email))
    .filter(Boolean);

  return Array.from(new Set(initials));
}

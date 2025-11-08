// src/lib/ensureOrg.ts
import { getServerSupabase } from "@/lib/supabaseServer";

/**
 * Ensure the logged-in user has an organisation + membership.
 * Uses:
 *   - organisations
 *   - team_members (matched by email)
 *
 * Returns the org_id or null.
 */
export async function ensureOrgForCurrentUser(): Promise<string | null> {
  const supabase = await getServerSupabase();

  // 1) Get current user from auth
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError) {
    console.warn(
      "[Server] ensureOrgForCurrentUser: failed to get user",
      userError?.message || userError
    );
    return null;
  }

  if (!user) {
    // Not logged in – nothing to do
    return null;
  }

  const email = user.email;
  if (!email) {
    console.warn("[Server] ensureOrgForCurrentUser: user has no email");
    return null;
  }

  // 2) Check if they already have a team_members row (match by email)
  try {
    const { data: memberRows, error: tmErr } = await supabase
      .from("team_members")
      .select("org_id, email")
      .eq("email", email)
      .limit(1);

    if (tmErr) {
      console.warn(
        "[Server] ensureOrgForCurrentUser: failed to load membership",
        tmErr?.message || tmErr
      );
    } else if (memberRows && memberRows.length > 0) {
      const existingOrgId = memberRows[0].org_id as string | null;
      if (existingOrgId) {
        return existingOrgId;
      }
    }
  } catch (err: any) {
    console.warn(
      "[Server] ensureOrgForCurrentUser: membership query threw",
      err?.message || err
    );
    // carry on – we can still try to create an org
  }

  // 3) No membership found – try to create a new organisation
  const defaultNameFromEmail =
    email.split("@")[0]?.replace(/[^\w\s-]/g, " ") || "My business";

  const defaultName =
    (user.user_metadata?.business_name as string | undefined) ||
    defaultNameFromEmail ||
    "My business";

  let orgId: string | null = null;

  try {
    const { data: org, error: orgErr } = await supabase
      .from("organisations") // 👈 table name
      .insert({ name: defaultName })
      .select("id")
      .single();

    if (orgErr || !org) {
      const msg = orgErr?.message || String(orgErr || "");

      if (msg.includes("row-level security")) {
        console.warn(
          "[Server] ensureOrgForCurrentUser: could not auto-create org due to RLS. You can add a policy to allow inserts, or create orgs manually.",
          msg
        );
        return null;
      }

      console.warn(
        "[Server] ensureOrgForCurrentUser: failed to create org",
        msg
      );
      return null;
    }

    orgId = org.id as string;
  } catch (err: any) {
    console.warn(
      "[Server] ensureOrgForCurrentUser: org insert threw",
      err?.message || err
    );
    return null;
  }

  if (!orgId) return null;

  // 4) Create team_members row linking user to this org (by email)
  try {
    const initialsFromMeta =
      (user.user_metadata?.initials as string | undefined)?.toUpperCase();
    const initialsFromEmail = email.slice(0, 2).toUpperCase();

    const initials = initialsFromMeta || initialsFromEmail || null;
    const nameFromMeta =
      (user.user_metadata?.full_name as string | undefined) || null;

    const { error: memberErr } = await supabase.from("team_members").insert({
      org_id: orgId,
      email,
      name: nameFromMeta || email,
      initials,
      role: "owner",
    });

    if (memberErr) {
      console.warn(
        "[Server] ensureOrgForCurrentUser: failed to create team member",
        memberErr?.message || memberErr
      );
      // org exists even if membership failed
      return orgId;
    }
  } catch (err: any) {
    console.warn(
      "[Server] ensureOrgForCurrentUser: member insert threw",
      err?.message || err
    );
    return orgId;
  }

  return orgId;
}

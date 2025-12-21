// src/lib/ensureOrg.ts
import { getServerSupabase } from "@/lib/supabaseServer";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

type EnsureOrgResult =
  | { ok: true; orgId: string; locationId: string | null }
  | { ok: false; reason: string };

// Super defensive initials generator – never returns empty / null
function deriveInitialsSafe(name?: string | null, email?: string | null) {
  const cleanName = (name ?? "").trim();

  let base = "";

  if (cleanName) {
    const parts = cleanName.split(/\s+/).filter(Boolean);
    const a = parts[0]?.[0] ?? "";
    const b = parts[1]?.[0] ?? "";
    base = (a + b || a).toUpperCase();
  }

  if (!base && email) {
    const firstChunk = email
      .trim()
      .split(/[@\s.]+/)
      .filter(Boolean)[0];
    if (firstChunk?.[0]) {
      base = firstChunk[0].toUpperCase();
    }
  }

  if (!base) {
    base = "O";
  }

  return base.slice(0, 4);
}

// New: ensure a 14-day trial row exists for this org if it has no billing_subscriptions yet
async function ensureTrialForOrg(orgId: string, userId: string) {
  const { data: existing, error } = await supabaseAdmin
    .from("billing_subscriptions")
    .select("id, stripe_subscription_id, status, trial_ends_at")
    .eq("org_id", orgId)
    .maybeSingle();

  if (error) {
    console.error("[ensureOrg] billing_subscriptions lookup failed", error);
    return;
  }

  // If there is already any billing row for this org, don't mess with it
  if (existing) {
    return;
  }

  const trialEnds = new Date();
  trialEnds.setDate(trialEnds.getDate() + 14);

  const { error: insErr } = await supabaseAdmin
    .from("billing_subscriptions")
    .insert({
      org_id: orgId,
      user_id: userId,
      status: "trialing",
      trial_ends_at: trialEnds.toISOString(),
      // stripe_subscription_id stays null until Stripe checkout happens
    } as any);

  if (insErr) {
    console.error(
      "[ensureOrg] billing_subscriptions insert failed",
      insErr
    );
  }
}

export async function ensureOrgForCurrentUser(args?: {
  ownerName?: string;
  businessName?: string;
  locationName?: string;
}): Promise<EnsureOrgResult> {
  const supabase = await getServerSupabase();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { ok: false, reason: "no-auth" };
  }

  const userId = user.id;
  const email = (user.email ?? "").toLowerCase() || null;

  const ownerNameRaw =
    (args?.ownerName ?? "").trim() ||
    (user.user_metadata?.full_name ?? "").trim() ||
    (email ?? "Owner");

  const ownerName = ownerNameRaw.trim();

  const businessName =
    (args?.businessName ?? "").trim() || "My Business";

  // use business name as default location label, nicer than "Main site"
  const locationName =
    (args?.locationName ?? "").trim() || businessName || "Main site";

  const initials = deriveInitialsSafe(ownerName, email);

  // 1) Ensure profile row exists (role NOT NULL etc.)
  const { error: profileUpsertErr } = await supabaseAdmin
    .from("profiles")
    .upsert(
      {
        id: userId,
        email,
        role: "owner",
        full_name: ownerName || null,
      } as any,
      { onConflict: "id" }
    );

  if (profileUpsertErr) {
    console.error("[ensureOrg] profile upsert failed", profileUpsertErr);
    return { ok: false, reason: "profile-upsert-failed" };
  }

  // 2) Load profile org_id (might already be set for existing accounts)
  const { data: profile, error: profErr } = await supabaseAdmin
    .from("profiles")
    .select("org_id")
    .eq("id", userId)
    .maybeSingle();

  if (profErr) {
    console.error("[ensureOrg] profile lookup failed", profErr);
    return { ok: false, reason: "profile-lookup-failed" };
  }

  // Helper: ensure membership row exists
  async function ensureMembershipOwner(orgId: string) {
    const { error } = await supabaseAdmin
      .from("user_orgs")
      .upsert(
        { user_id: userId, org_id: orgId, role: "owner", active: true },
        { onConflict: "user_id" } // you already have UNIQUE(user_id)
      );

    if (error) {
      console.error("[ensureOrg] user_orgs upsert failed", error);
      return { ok: false as const, reason: "membership-upsert-failed" };
    }

    return { ok: true as const };
  }

  // Helper: ensure an owner row exists in team_members
  async function ensureTeamMemberOwner(orgId: string) {
    if (!email) return { ok: true as const }; // nothing sensible to key on

    const payload = {
      org_id: orgId,
      user_id: userId as any, // drop this if the column doesn't exist
      email,
      name: ownerName || email,
      initials, // always non-empty string here
      role: "owner",
      active: true,
    };

    const { error } = await supabaseAdmin
      .from("team_members")
      .upsert(payload, {
        onConflict: "org_id,email",
      });

    if (error) {
      console.error("[ensureOrg] team_members upsert failed", error);
      return { ok: false as const, reason: "team-upsert-failed" };
    }

    return { ok: true as const };
  }

  // Helper: ensure at least one active location and return its id
  async function ensureDefaultLocation(orgId: string): Promise<string | null> {
    const { data: existing, error: findErr } = await supabaseAdmin
      .from("locations")
      .select("id")
      .eq("org_id", orgId)
      .eq("active", true)
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();

    if (findErr) {
      console.error("[ensureOrg] locations lookup failed", findErr);
      return null;
    }

    if (existing?.id) return String(existing.id);

    const { data: created, error: insErr } = await supabaseAdmin
      .from("locations")
      .insert({
        org_id: orgId,
        name: locationName,
        active: true,
      })
      .select("id")
      .single();

    if (insErr) {
      console.error("[ensureOrg] locations insert failed", insErr);
      return null;
    }

    return created?.id ? String(created.id) : null;
  }

  // 3) Either reuse existing org or create a new one
  let orgId: string;

  if (profile?.org_id) {
    orgId = String(profile.org_id);
  } else {
    const { data: orgRow, error: orgErr } = await supabaseAdmin
      .from("orgs")
      .insert({ name: businessName })
      .select("id")
      .single();

    if (orgErr || !orgRow?.id) {
      console.error("[ensureOrg] org create failed", orgErr);
      return { ok: false, reason: "org-create-failed" };
    }

    orgId = String(orgRow.id);

    const { error: profileUpdateErr } = await supabaseAdmin
      .from("profiles")
      .update({ org_id: orgId })
      .eq("id", userId);

    if (profileUpdateErr) {
      console.error("[ensureOrg] profile update failed", profileUpdateErr);
      return { ok: false, reason: "profile-update-failed" };
    }
  }

  // 4) Membership + owner team row + default location
  const mem = await ensureMembershipOwner(orgId);
  if (!mem.ok) return mem;

  const tm = await ensureTeamMemberOwner(orgId);
  if (!tm.ok) return tm;

  const locationId = await ensureDefaultLocation(orgId);

  // 5) Ensure a billing_subscriptions trial row for this org (if none exists)
  await ensureTrialForOrg(orgId, userId);

  return { ok: true, orgId, locationId };
}

// src/lib/ensureOrg.ts
import { getServerSupabaseAction } from "@/lib/supabaseServer";

type EnsureOrgResult =
  | { ok: true; orgId: string; created: boolean }
  | {
      ok: false;
      reason: "not-authenticated" | "db-error";
      detail?: string;
    };

const TRIAL_DAYS = 14;

function makeInitials(
  name: string | null | undefined,
  email: string | null | undefined
) {
  const base = (name && name.trim().length > 0 ? name : email || "")
    .split(/\s+/)
    .filter(Boolean);

  if (base.length === 0) return "TT";

  const raw = base.map((p) => p[0] || "").join("").slice(0, 3);
  return raw.toUpperCase() || "TT";
}

async function ensureDefaultLocation(params: {
  supabase: any;
  orgId: string;
  userId: string;
}): Promise<string> {
  const { supabase, orgId, userId } = params;

  // 1) Find earliest location
  const { data: existingLoc, error: locSelErr } = await supabase
    .from("locations")
    .select("id")
    .eq("org_id", orgId)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (locSelErr) {
    console.error("[ensureOrg] locations select error", locSelErr);
    throw new Error("locations-select");
  }

  let locationId: string | null = existingLoc?.id ? String(existingLoc.id) : null;

  // 2) Create one if none
  if (!locationId) {
    const { data: newLoc, error: locInsErr } = await supabase
      .from("locations")
      .insert({ org_id: orgId, name: "Main Location" })
      .select("id")
      .single();

    if (locInsErr || !newLoc?.id) {
      console.error("[ensureOrg] locations insert error", locInsErr);
      throw new Error("locations-insert");
    }

    locationId = String(newLoc.id);
  }

  // 3) Ensure profile has active_location_id set
  const { error: activeLocErr } = await supabase
    .from("profiles")
    .update({ active_location_id: locationId })
    .eq("id", userId);

  if (activeLocErr) {
    console.error("[ensureOrg] active location update error", activeLocErr);
    throw new Error("active-location-update");
  }

  return locationId;
}

export async function ensureOrgForCurrentUser(opts?: {
  ownerName?: string;
  businessName?: string;
}): Promise<EnsureOrgResult> {
  const supabase = await getServerSupabaseAction();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { ok: false, reason: "not-authenticated" };
  }

  const userId = user.id;
  const ownerName = (opts?.ownerName || "").trim() || null;
  const businessName = (opts?.businessName || "").trim() || "My Business";
  const email = (user.email ?? "").trim().toLowerCase() || null;

  // 1) Get existing profile to see if they already have an org
  const { data: profile, error: profileErr } = await supabase
    .from("profiles")
    .select("id, org_id, full_name, active_location_id")
    .eq("id", userId)
    .maybeSingle();

  if (profileErr) {
    console.error("[ensureOrg] profile error", profileErr);
    return { ok: false, reason: "db-error", detail: "profile" };
  }

  let orgId = (profile?.org_id as string | null) ?? null;
  let orgCreated = false;

  // 2) Create org if missing
  if (!orgId) {
    const { data: org, error: orgErr } = await supabase
      .from("orgs")
      .insert({ name: businessName })
      .select("id")
      .single();

    if (orgErr || !org?.id) {
      console.error("[ensureOrg] org insert error", orgErr);
      return { ok: false, reason: "db-error", detail: "org-insert" };
    }

    orgId = String(org.id);
    orgCreated = true;

    // 2a) Update profile with org + name (keep existing name if present)
    const { error: profUpdateErr } = await supabase
      .from("profiles")
      .update({
        org_id: orgId,
        full_name: ownerName || profile?.full_name || null,
      })
      .eq("id", userId);

    if (profUpdateErr) {
      console.error("[ensureOrg] profile update error", profUpdateErr);
      return { ok: false, reason: "db-error", detail: "profile-update" };
    }

    // 2b) Link user ↔ org (user_orgs)
    const { error: uoErr } = await supabase
      .from("user_orgs")
      .upsert(
        { user_id: userId, org_id: orgId },
        { onConflict: "user_id,org_id" }
      );

    if (uoErr) {
      console.error("[ensureOrg] user_orgs upsert error", uoErr);
      return { ok: false, reason: "db-error", detail: "user-orgs" };
    }

    // 2c) Ensure default location exists + set active_location_id
    let locationId: string;
    try {
      locationId = await ensureDefaultLocation({ supabase, orgId, userId });
    } catch (e: any) {
      return { ok: false, reason: "db-error", detail: e?.message ?? "location" };
    }

    // 2d) Ensure an owner team_member row exists (LOCATION-SCOPED)
    const initials = makeInitials(ownerName || profile?.full_name, email);

    const { error: tmErr } = await supabase.from("team_members").upsert(
      {
        org_id: orgId,
        location_id: locationId,
        user_id: userId,
        email,
        role: "owner",
        active: true,
        login_enabled: true,
        initials,
        name: ownerName || profile?.full_name || email,
      } as any,
      {
        // ✅ This is the whole point: one user can exist in multiple locations in same org.
        onConflict: "org_id,location_id,user_id",
      }
    );

    if (tmErr) {
      console.error("[ensureOrg] team_members upsert error", tmErr);
      // If you want to be strict, return db-error here. I'm leaving it non-fatal like your original,
      // but realistically: if this fails, your UI will act weird later.
    }
  }

  if (!orgId) {
    return { ok: false, reason: "db-error", detail: "no-org-id" };
  }

  // 2e) Retro-safety: if org exists but active_location_id missing, set it
  // (old accounts created before you started tracking locations properly)
  if (!profile?.active_location_id) {
    try {
      await ensureDefaultLocation({ supabase, orgId, userId });
    } catch (e: any) {
      // Not fatal, but will cause “no active location” downstream
      console.error("[ensureOrg] retro active location failed", e);
    }
  }

  // 3) Ensure there's a billing_subscriptions row for this org
  const { data: existingSub, error: subErr } = await supabase
    .from("billing_subscriptions")
    .select("id, trial_ends_at")
    .eq("org_id", orgId)
    .maybeSingle();

  if (subErr) {
    console.error("[ensureOrg] billing_subscriptions select error", subErr);
    return { ok: false, reason: "db-error", detail: "billing-select" };
  }

  if (!existingSub) {
    const trialEnd = new Date();
    trialEnd.setDate(trialEnd.getDate() + TRIAL_DAYS);

    const { error: insErr } = await supabase.from("billing_subscriptions").insert({
      org_id: orgId,
      user_id: userId,
      stripe_subscription_id: null,
      status: "trialing",
      price_id: null,
      current_period_end: trialEnd.toISOString(),
      cancel_at_period_end: false,
      trial_ends_at: trialEnd.toISOString(),
    });

    if (insErr) {
      console.error("[ensureOrg] billing_subscriptions insert error", insErr);
      return { ok: false, reason: "db-error", detail: "billing-insert" };
    }
  }

  return { ok: true, orgId, created: orgCreated };
}

// src/app/api/onboarding/bootstrap/route.ts
import { NextResponse } from "next/server";
import { ensureOrgForCurrentUser } from "@/lib/ensureOrg";
import { getServerSupabase } from "@/lib/supabaseServer";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const dynamic = "force-dynamic";

function addDays(date: Date, days: number) {
  const d = new Date(date);
  d.setUTCDate(d.getUTCDate() + days);
  return d;
}

function deriveInitials(nameOrEmail: string) {
  const s = (nameOrEmail ?? "").trim();
  if (!s) return "ME";

  if (s.includes("@")) {
    const local = s.split("@")[0] ?? "";
    return local.replace(/[^a-z0-9]/gi, "").slice(0, 4).toUpperCase() || "ME";
  }

  const parts = s.split(/\s+/).filter(Boolean);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + (parts[1]?.[0] ?? "")).toUpperCase().slice(0, 4);
}

async function getUserFromRequest(req: Request) {
  // 1) Cookie session
  const supabase = await getServerSupabase();
  const { data: cookieAuth, error: cookieErr } = await supabase.auth.getUser();

  if (!cookieErr && cookieAuth?.user) {
    return { user: cookieAuth.user, via: "cookie" as const };
  }

  // 2) Bearer token (useful right after sign-up)
  const auth = req.headers.get("authorization") || "";
  const token = auth.toLowerCase().startsWith("bearer ") ? auth.slice(7).trim() : "";

  if (token) {
    const { data: tokenAuth, error: tokenErr } = await supabase.auth.getUser(token);
    if (!tokenErr && tokenAuth?.user) {
      return { user: tokenAuth.user, via: "bearer" as const };
    }
  }

  return { user: null, via: "none" as const };
}

async function ensureFirstLocation(orgId: string, locationName?: string) {
  const desiredName = (locationName ?? "").trim();

  // If a name is provided, try to find it first (idempotent, because humans double-click everything)
  if (desiredName) {
    const { data: existingByName, error: findErr } = await supabaseAdmin
      .from("locations")
      .select("id")
      .eq("org_id", orgId)
      .ilike("name", desiredName)
      .limit(1)
      .maybeSingle();

    if (findErr) throw findErr;
    if (existingByName?.id) return String(existingByName.id);

    const { data: locRow, error: locErr } = await supabaseAdmin
      .from("locations")
      .insert({ org_id: orgId, name: desiredName, active: true })
      .select("id")
      .single();

    if (locErr) throw locErr;
    return String(locRow.id);
  }

  // Otherwise: find an existing location
  const { data: existing, error: selErr } = await supabaseAdmin
    .from("locations")
    .select("id")
    .eq("org_id", orgId)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (selErr) throw selErr;
  if (existing?.id) return String(existing.id);

  // None exists, create a default
  const { data: created, error: insErr } = await supabaseAdmin
    .from("locations")
    .insert({ org_id: orgId, name: "Main Location", active: true })
    .select("id")
    .single();

  if (insErr) throw insErr;
  return String(created.id);
}

async function ensureOwnerTeamMember(params: {
  orgId: string;
  locationId: string;
  userId: string;
  email: string | null;
  name: string;
  initials: string;
}) {
  const { orgId, locationId, userId, email, name, initials } = params;

  // IMPORTANT:
  // Do NOT use upsert with onConflict unless you 100% have the matching unique constraint.
  // We'll do: find -> update else insert.
  const { data: existing, error: findErr } = await supabaseAdmin
    .from("team_members")
    .select("id, role")
    .eq("org_id", orgId)
    .eq("location_id", locationId)
    .eq("user_id", userId)
    .limit(1)
    .maybeSingle();

  if (findErr) throw findErr;

  if (existing?.id) {
    const { error: updErr } = await supabaseAdmin
      .from("team_members")
      .update({
        email,
        name,
        initials,
        role: "owner",
        active: true,
        login_enabled: true,
      })
      .eq("id", existing.id);

    if (updErr) throw updErr;
    return String(existing.id);
  }

  // Secondary fallback: sometimes older rows are keyed by email, not user_id
  if (email) {
    const { data: existingByEmail, error: emailFindErr } = await supabaseAdmin
      .from("team_members")
      .select("id, user_id")
      .eq("org_id", orgId)
      .eq("location_id", locationId)
      .ilike("email", email)
      .limit(1)
      .maybeSingle();

    if (emailFindErr) throw emailFindErr;

    if (existingByEmail?.id) {
      const { error: updErr2 } = await supabaseAdmin
        .from("team_members")
        .update({
          user_id: userId, // backfill
          name,
          initials,
          role: "owner",
          active: true,
          login_enabled: true,
        })
        .eq("id", existingByEmail.id);

      if (updErr2) throw updErr2;
      return String(existingByEmail.id);
    }
  }

  const { data: created, error: insErr } = await supabaseAdmin
    .from("team_members")
    .insert({
      org_id: orgId,
      location_id: locationId,
      user_id: userId,
      email,
      name,
      initials,
      role: "owner",
      active: true,
      login_enabled: true,
      pin_enabled: false,
    })
    .select("id")
    .single();

  if (insErr) throw insErr;
  return String(created.id);
}

async function ensureTrialSubscription(orgId: string, userId: string) {
  const { data: existing, error: selErr } = await supabaseAdmin
    .from("billing_subscriptions")
    .select("id")
    .eq("org_id", orgId)
    .maybeSingle();

  if (selErr) throw selErr;

  if (!existing) {
    const trialEndsAt = addDays(new Date(), 14);

    const { error: insErr } = await supabaseAdmin.from("billing_subscriptions").insert({
      org_id: orgId,
      user_id: userId,
      status: "trialing",
      trial_ends_at: trialEndsAt.toISOString(),
      current_period_end: trialEndsAt.toISOString(),
      cancel_at_period_end: false,
    });

    if (insErr) throw insErr;
  }
}

export async function POST(req: Request) {
  try {
    const { user } = await getUserFromRequest(req);

    if (!user) {
      return NextResponse.json({ ok: false, reason: "no-auth" }, { status: 401 });
    }

    const body = await req.json().catch(() => ({} as any));
    const ownerName = String(body.ownerName ?? "").trim();
    const businessName = String(body.businessName ?? "").trim();
    const locationName = String(body.locationName ?? "").trim();

    // 1) Ensure org
    const ensured = await ensureOrgForCurrentUser({
      ownerName: ownerName || undefined,
      businessName: businessName || undefined,
    });

    if (!ensured || (ensured as any).ok === false) {
      return NextResponse.json(
        { ok: false, reason: "ensure-org-failed", detail: (ensured as any)?.reason ?? null },
        { status: 400 }
      );
    }

    const orgId =
      String((ensured as any).orgId ?? (ensured as any).org_id ?? "").trim();

    if (!orgId) {
      return NextResponse.json({ ok: false, reason: "missing-org-id" }, { status: 400 });
    }

    const email = (user.email ?? "").trim().toLowerCase();
    const displayName = ownerName || (email ? email.split("@")[0] : "Owner");
    const initials = deriveInitials(displayName || email);

    // 2) Ensure location
    let locationId: string;
    try {
      locationId = await ensureFirstLocation(orgId, locationName || businessName || undefined);
    } catch (e: any) {
      return NextResponse.json(
        { ok: false, reason: "location-create-failed", detail: e?.message ?? String(e) },
        { status: 400 }
      );
    }

    // 3) Ensure owner team member exists FOR THIS LOCATION
    try {
      await ensureOwnerTeamMember({
        orgId,
        locationId,
        userId: user.id,
        email: email || null,
        name: displayName || "Owner",
        initials,
      });
    } catch (e: any) {
      return NextResponse.json(
        { ok: false, reason: "team-member-ensure-failed", detail: e?.message ?? String(e) },
        { status: 400 }
      );
    }

    // 4) Ensure trial exists (don’t brick onboarding if your billing table has opinions)
    try {
      await ensureTrialSubscription(orgId, user.id);
    } catch (e: any) {
      // We still return ok:true because role/location is the real blocker for UX.
      console.error("[onboarding/bootstrap] trial ensure failed", e);
    }

    // 5) Best-effort: keep profile aligned (don’t fail if schema differs)
    try {
      await supabaseAdmin.from("profiles").upsert(
        {
          id: user.id,
          org_id: orgId,
          full_name: ownerName || null,
          active_location_id: locationId,
        },
        { onConflict: "id" }
      );
    } catch (e) {
      console.error("[onboarding/bootstrap] profile upsert failed", e);
    }

    // 6) Return ids for client localStorage + immediate gating context
    return NextResponse.json({ ok: true, orgId, locationId }, { status: 200 });
  } catch (e: any) {
    console.error("[onboarding/bootstrap] unexpected error", e);
    return NextResponse.json(
      { ok: false, reason: "exception", detail: e?.message ?? String(e) },
      { status: 500 }
    );
  }
}
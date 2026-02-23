// src/app/api/onboarding/bootstrap/route.ts
import { NextRequest, NextResponse } from "next/server";
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

/**
* Your client is using supabase-js (localStorage session) and calling a Next.js route.
* Server routes cannot magically read your browser localStorage.
* So we accept either:
*  - Cookie session (normal)
*  - Authorization: Bearer <access_token> (critical right after signup)
*/
async function getUserFromRequest(req: NextRequest) {
  // 1) Cookie session
  const supabase = await getServerSupabase();
  const { data: cookieAuth, error: cookieErr } = await supabase.auth.getUser();
  if (!cookieErr && cookieAuth?.user) {
    return { user: cookieAuth.user, via: "cookie" as const };
  }

  // 2) Bearer token
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
  const name = (locationName ?? "").trim() || "Main Location";

  // 1) Try to find existing by (org_id, name)
  const { data: existing, error: selErr } = await supabaseAdmin
    .from("locations")
    .select("id")
    .eq("org_id", orgId)
    .ilike("name", name)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (selErr) throw selErr;
  if (existing?.id) return String(existing.id);

  // 2) Create it
  const { data: created, error: insErr } = await supabaseAdmin
    .from("locations")
    .insert({ org_id: orgId, name, active: true })
    .select("id")
    .single();

  if (!insErr && created?.id) return String(created.id);

  // 3) If insert failed (duplicate, race), re-select and return
  const { data: existing2, error: selErr2 } = await supabaseAdmin
    .from("locations")
    .select("id")
    .eq("org_id", orgId)
    .ilike("name", name)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (selErr2) throw insErr || selErr2;
  if (existing2?.id) return String(existing2.id);

  throw insErr || new Error("location-create-failed");
}

async function upsertOwnerTeamMember(args: {
  orgId: string;
  locationId: string;
  userId: string;
  email: string | null;
  name: string;
  initials: string;
}) {
  const row = {
    org_id: args.orgId,
    location_id: args.locationId,
    user_id: args.userId,
    email: args.email,
    name: args.name,
    initials: args.initials,
    role: "owner",
    active: true,
    login_enabled: true,
  };

  // First attempt: by user_id (best)
  const { error: e1 } = await supabaseAdmin.from("team_members").upsert(row, {
    onConflict: "org_id,location_id,user_id",
  });

  if (!e1) return;

  // Second attempt: some schemas unique on email instead
  const { error: e2 } = await supabaseAdmin.from("team_members").upsert(row, {
    onConflict: "org_id,location_id,email",
  });

  if (!e2) return;

  // If both fail, bubble the second error (usually more relevant)
  throw e2;
}

export async function POST(req: NextRequest) {
  try {
    const { user } = await getUserFromRequest(req);

    if (!user) {
      return NextResponse.json(
        { ok: false as const, reason: "no-auth", detail: "No cookie session or bearer token" },
        { status: 401 }
      );
    }

    const body = (await req.json().catch(() => ({}))) as any;

    const ownerName = String(body.ownerName ?? "").trim();
    const businessName = String(body.businessName ?? "").trim();
    const locationName = String(body.locationName ?? "").trim();

    // 1) ensure org
    const ensured = await ensureOrgForCurrentUser({
      ownerName: ownerName || undefined,
      businessName: businessName || undefined,
    });

    if (!ensured?.ok) {
      return NextResponse.json(
        {
          ok: false as const,
          reason: "ensure-org-failed",
          detail: (ensured as any)?.reason ?? (ensured as any)?.detail ?? "unknown",
        },
        { status: 400 }
      );
    }

    const orgId: string = String((ensured as any).orgId ?? (ensured as any).org_id ?? "");
    if (!orgId) {
      return NextResponse.json(
        { ok: false as const, reason: "missing-org-id" },
        { status: 500 }
      );
    }

    const email = (user.email ?? "").trim().toLowerCase() || null;
    const displayName =
      ownerName || (email ? email.split("@")[0] : "") || businessName || "Owner";
    const initials = deriveInitials(displayName || email || "Owner");

    // 2) ensure at least one location
    let locationId: string;
    try {
      locationId = await ensureFirstLocation(orgId, locationName || businessName);
    } catch (e: any) {
      return NextResponse.json(
        { ok: false as const, reason: "location-create-failed", detail: e?.message ?? String(e) },
        { status: 400 }
      );
    }

    // 3) upsert owner team member in that location
    try {
      await upsertOwnerTeamMember({
        orgId,
        locationId,
        userId: user.id,
        email,
        name: displayName,
        initials,
      });
    } catch (e: any) {
      return NextResponse.json(
        { ok: false as const, reason: "team-upsert-failed", detail: e?.message ?? String(e) },
        { status: 400 }
      );
    }

    // 4) profile: set org + active location
    const { error: profErr } = await supabaseAdmin.from("profiles").upsert(
      {
        id: user.id,
        org_id: orgId,
        full_name: ownerName || null,
        active_location_id: locationId,
      },
      { onConflict: "id" }
    );

    if (profErr) {
      return NextResponse.json(
        { ok: false as const, reason: "profile-upsert-failed", detail: profErr.message },
        { status: 400 }
      );
    }

    // 5) trial subscription (idempotent)
    const { data: existingSub, error: existingErr } = await supabaseAdmin
      .from("billing_subscriptions")
      .select("id")
      .eq("org_id", orgId)
      .maybeSingle();

    if (existingErr) {
      return NextResponse.json(
        { ok: false as const, reason: "billing-subscriptions-lookup-failed", detail: existingErr.message },
        { status: 400 }
      );
    }

    if (!existingSub) {
      const trialEndsAt = addDays(new Date(), 14);

      const { error: insErr } = await supabaseAdmin.from("billing_subscriptions").insert({
        org_id: orgId,
        user_id: user.id,
        status: "trialing",
        trial_ends_at: trialEndsAt.toISOString(),
        current_period_end: trialEndsAt.toISOString(),
        cancel_at_period_end: false,
      });

      if (insErr) {
        return NextResponse.json(
          { ok: false as const, reason: "billing-subscriptions-insert-failed", detail: insErr.message },
          { status: 400 }
        );
      }
    }

    return NextResponse.json({ ok: true, orgId, locationId }, { status: 200 });
  } catch (err: any) {
    return NextResponse.json(
      { ok: false as const, reason: "exception", detail: err?.message ?? String(err) },
      { status: 500 }
    );
  }
}

// src/app/api/onboarding/bootstrap/route.ts
import { NextResponse } from "next/server";
import { ensureOrgForCurrentUser } from "@/lib/ensureOrg";
import { getServerSupabase } from "@/lib/supabaseServer";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const dynamic = "force-dynamic";

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

function addDaysUtc(d: Date, days: number) {
  const x = new Date(d);
  x.setUTCDate(x.getUTCDate() + days);
  return x;
}

async function ensureFirstLocation(orgId: string, locationName?: string) {
  // If name provided, create that location
  if (locationName && locationName.trim()) {
    const { data: locRow, error: locErr } = await supabaseAdmin
      .from("locations")
      .insert({ org_id: orgId, name: locationName.trim(), active: true })
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

export async function POST(req: Request) {
  const supabase = await getServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ ok: false, reason: "no-auth" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const ownerName = String(body.ownerName ?? "").trim();
  const businessName = String(body.businessName ?? "").trim();
  const locationName = String(body.locationName ?? "").trim();

  // 1) ensure org
  const ensured = await ensureOrgForCurrentUser({
    ownerName: ownerName || undefined,
    businessName: businessName || undefined,
  });

  if (!(ensured as any)?.ok) {
    return NextResponse.json(ensured, { status: 400 });
  }

  const orgId: string | undefined = (ensured as any).orgId ?? (ensured as any).org_id;
  if (!orgId) {
    return NextResponse.json({ ok: false, reason: "missing-org-id" }, { status: 400 });
  }

  const email = (user.email ?? "").trim().toLowerCase();
  const initials = deriveInitials(ownerName || email);

  // 2) ensure at least one location (or create the provided one)
  let locationId: string;
  try {
    locationId = await ensureFirstLocation(orgId, locationName || undefined);
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, reason: "location-create-failed", details: e?.message ?? String(e) },
      { status: 400 }
    );
  }

  // 3) upsert owner team member IN THAT LOCATION (multi-location friendly)
  // Requires unique constraint on (org_id, location_id, user_id) OR adjust onConflict accordingly.
  const { error: tmErr } = await supabaseAdmin.from("team_members").upsert(
    {
      org_id: orgId,
      location_id: locationId,
      user_id: user.id,
      email: email || null,
      name: ownerName || email || "Owner",
      initials,
      role: "owner",
      active: true,
      login_enabled: true,
    },
    { onConflict: "org_id,location_id,user_id" }
  );

  if (tmErr) {
    // Fallback if your unique is email-based
    const { error: tmErr2 } = await supabaseAdmin.from("team_members").upsert(
      {
        org_id: orgId,
        location_id: locationId,
        user_id: user.id,
        email: email || null,
        name: ownerName || email || "Owner",
        initials,
        role: "owner",
        active: true,
        login_enabled: true,
      },
      { onConflict: "org_id,location_id,email" }
    );

    if (tmErr2) {
      return NextResponse.json(
        { ok: false, reason: "team-upsert-failed", details: tmErr2.message },
        { status: 400 }
      );
    }
  }

  // 4) set active location on profile (best-effort)
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
      { ok: false, reason: "profile-upsert-failed", details: profErr.message },
      { status: 400 }
    );
  }

  // 5) ensure trial subscription exists for org (idempotent)
  const { data: existingSub, error: subErr } = await supabaseAdmin
    .from("billing_subscriptions")
    .select("id")
    .eq("org_id", orgId)
    .maybeSingle();

  if (subErr) {
    return NextResponse.json(
      { ok: false, reason: "billing-sub-lookup-failed", details: subErr.message },
      { status: 400 }
    );
  }

  if (!existingSub) {
    const trialEndsAt = addDaysUtc(new Date(), 14);

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
        { ok: false, reason: "billing-sub-insert-failed", details: insErr.message },
        { status: 400 }
      );
    }
  }

  // 6) set active org/location cookies (so middleware + server checks have context immediately)
  const res = NextResponse.json({ ok: true, orgId, locationId }, { status: 200 });

  res.cookies.set("tt_active_org", orgId, {
    path: "/",
    httpOnly: false,
    sameSite: "lax",
    secure: true,
    maxAge: 60 * 60 * 24 * 365,
  });

  res.cookies.set("tt_active_location", locationId, {
    path: "/",
    httpOnly: false,
    sameSite: "lax",
    secure: true,
    maxAge: 60 * 60 * 24 * 365,
  });

  return res;
}

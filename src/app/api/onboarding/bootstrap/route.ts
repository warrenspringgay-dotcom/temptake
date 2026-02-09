// src/app/api/onboarding/bootstrap/route.ts
import { NextResponse } from "next/server";
import { ensureOrgForCurrentUser } from "@/lib/ensureOrg";
import { getServerSupabase } from "@/lib/supabaseServer";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const dynamic = "force-dynamic";

function deriveInitials(nameOrEmail: string) {
  const s = (nameOrEmail ?? "").trim();
  if (!s) return "ME";

  // If it looks like an email, use first char(s) of local-part
  if (s.includes("@")) {
    const local = s.split("@")[0] ?? "";
    return local.replace(/[^a-z0-9]/gi, "").slice(0, 4).toUpperCase() || "ME";
  }

  const parts = s.split(/\s+/).filter(Boolean);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + (parts[1]?.[0] ?? "")).toUpperCase().slice(0, 4);
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
  const locationName = String(body.locationName ?? "").trim();

  // 1) ensure org + membership
  const ensured = await ensureOrgForCurrentUser();
  if (!ensured.ok) {
    return NextResponse.json(ensured, { status: 400 });
  }

  const orgId = ensured.orgId;
  const email = (user.email ?? "").trim().toLowerCase();

  // 2) ensure owner exists in team_members (ORG-WIDE ROLE ROW = location_id NULL)
  // IMPORTANT: link to auth user_id so nav gating is stable even if email casing changes.
  const initials = deriveInitials(ownerName || email);

  const { error: tmErr } = await supabaseAdmin
    .from("team_members")
    .upsert(
      {
        org_id: orgId,
        location_id: null, // ✅ org-wide role (Option A)
        user_id: user.id,  // ✅ stable linkage
        email: email || null,
        name: ownerName || email || "Owner",
        initials,
        role: "owner",
        active: true,
        login_enabled: true,
      },
      { onConflict: "org_id,email" } // keep this, but we also normalize email above
    );

  if (tmErr) {
    return NextResponse.json(
      { ok: false, reason: "team-upsert-failed", details: tmErr },
      { status: 400 }
    );
  }

  // 3) create first location (if provided)
  let locationId: string | null = null;

  if (locationName) {
    const { data: locRow, error: locErr } = await supabaseAdmin
      .from("locations")
      .insert({ org_id: orgId, name: locationName, active: true })
      .select("id")
      .single();

    if (locErr) {
      return NextResponse.json(
        { ok: false, reason: "location-create-failed", details: locErr },
        { status: 400 }
      );
    }

    locationId = String(locRow.id);
  }

  // 4) set profile active_location_id so location switcher & pages behave immediately
  // (Your locationServer reads profiles.active_location_id)
  if (locationId) {
    await supabaseAdmin
      .from("profiles")
      .upsert(
        {
          id: user.id,
          active_location_id: locationId,
        },
        { onConflict: "id" }
      );
  }

  return NextResponse.json({ ok: true, orgId, locationId }, { status: 200 });
}

// src/app/api/onboarding/bootstrap/route.ts
import { NextResponse } from "next/server";
import { ensureOrgForCurrentUser } from "@/lib/ensureOrg";
import { getServerSupabase } from "@/lib/supabaseServer";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const dynamic = "force-dynamic";

function normEmail(email: string | null | undefined) {
  return (email ?? "").trim().toLowerCase();
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

  const email = normEmail(user.email);
  if (!email) {
    return NextResponse.json(
      { ok: false, reason: "missing-email" },
      { status: 400 }
    );
  }

  // 1) ensure org + membership
  const ensured = await ensureOrgForCurrentUser();
  if (!ensured.ok) {
    return NextResponse.json(ensured, { status: 400 });
  }

  const orgId = ensured.orgId;

  /**
   * 2) Ensure owner exists in team_members as ORG-WIDE identity row:
   * - location_id MUST be NULL (Option A: org-wide role)
   * - user_id MUST be set (so role lookup is stable)
   * - email normalised
   *
   * IMPORTANT:
   * Your existing unique constraint is (org_id, email) but can be case-sensitive.
   * We still normalise here to avoid duplicates.
   */
  const upsertPayload: any = {
    org_id: orgId,
    email, // normalized
    name: ownerName || email,
    role: "owner",
    active: true,
    user_id: user.id,         // ✅ critical
    location_id: null,        // ✅ critical (org-wide row)
    login_enabled: true,
    created_by: user.id,
    updated_at: new Date().toISOString(),
  };

  const { error: tmErr } = await supabaseAdmin
    .from("team_members")
    .upsert(upsertPayload, { onConflict: "org_id,email" });

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

    /**
     * 4) Assign owner to this location (if you have team_member_locations table).
     * If you DON’T have this table, remove this block.
     */
    try {
      await supabaseAdmin
        .from("team_member_locations")
        .upsert(
          {
            org_id: orgId,
            user_id: user.id,
            location_id: locationId,
          },
          { onConflict: "org_id,user_id,location_id" }
        );
    } catch {
      // Don’t fail onboarding if this table isn’t present or policy blocks it.
      // But ideally this should exist and work.
    }

    /**
     * 5) Set profile active location so server + client are aligned.
     * This fixes the “multi-site but location pill useless” experience.
     */
    await supabaseAdmin
      .from("profiles")
      .update({ active_location_id: locationId })
      .eq("id", user.id);
  }

  return NextResponse.json({ ok: true, orgId, locationId }, { status: 200 });
}

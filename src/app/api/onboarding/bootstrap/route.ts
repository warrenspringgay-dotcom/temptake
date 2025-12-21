// src/app/api/onboarding/bootstrap/route.ts
import { NextResponse } from "next/server";
import { ensureOrgForCurrentUser } from "@/lib/ensureOrg";
import { getServerSupabase } from "@/lib/supabaseServer";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const dynamic = "force-dynamic";

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

  // 2) ensure owner exists in team_members
  // Adjust column names here to match your schema.
  const { error: tmErr } = await supabaseAdmin
    .from("team_members")
    .upsert(
      {
        org_id: orgId,
        email: user.email,
        name: ownerName || user.email, // fallback
        role: "owner",
        active: true,
      },
      { onConflict: "org_id,email" }
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

  return NextResponse.json({ ok: true, orgId, locationId }, { status: 200 });
}

import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { getServerSupabase } from "@/lib/supabaseServer";

export async function POST() {
  try {
    const supabase = await getServerSupabase();

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json(
        { ok: false, reason: "no-user" },
        { status: 401 }
      );
    }

    // -------------------------------------------------
    // 1️⃣ Prevent duplicate bootstrap
    // -------------------------------------------------

    const { data: existingMember } = await supabaseAdmin
      .from("team_members")
      .select("org_id, location_id")
      .eq("user_id", user.id)
      .maybeSingle();

    if (existingMember?.org_id && existingMember?.location_id) {
      return NextResponse.json({
        ok: true,
        orgId: existingMember.org_id,
        locationId: existingMember.location_id,
        alreadyBootstrapped: true,
      });
    }

    // -------------------------------------------------
    // 2️⃣ Create Organisation
    // -------------------------------------------------

    const { data: org, error: orgError } = await supabaseAdmin
      .from("organisations")
      .insert({
        name: user.user_metadata?.business_name ?? "My Organisation",
        created_by: user.id,
      })
      .select()
      .single();

    if (orgError || !org) {
      return NextResponse.json(
        { ok: false, reason: "org-create-failed", detail: orgError?.message },
        { status: 500 }
      );
    }

    // -------------------------------------------------
    // 3️⃣ Create Default Location
    // -------------------------------------------------

    const { data: location, error: locationError } = await supabaseAdmin
      .from("locations")
      .insert({
        org_id: org.id,
        name: "Main Site",
        active: true,
      })
      .select()
      .single();

    if (locationError || !location) {
      return NextResponse.json(
        {
          ok: false,
          reason: "location-create-failed",
          detail: locationError?.message,
        },
        { status: 500 }
      );
    }

    // -------------------------------------------------
    // 4️⃣ Create Owner Team Member (MANDATORY)
    // -------------------------------------------------

    const displayName =
      user.user_metadata?.full_name ??
      user.email ??
      "Owner";

    const initials = displayName
      .split(" ")
      .map((p: string) => p[0])
      .join("")
      .slice(0, 2)
      .toUpperCase();

    const { error: teamError } = await supabaseAdmin
      .from("team_members")
      .insert({
        org_id: org.id,
        location_id: location.id,
        user_id: user.id,
        name: displayName,
        initials,
        role: "owner",
        active: true,
        login_enabled: true,
        pin_enabled: true,
      });

    if (teamError) {
      return NextResponse.json(
        {
          ok: false,
          reason: "team-member-create-failed",
          detail: teamError.message,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ok: true,
      orgId: org.id,
      locationId: location.id,
    });

  } catch (err: any) {
    return NextResponse.json(
      { ok: false, reason: "unexpected-error", detail: err?.message },
      { status: 500 }
    );
  }
}
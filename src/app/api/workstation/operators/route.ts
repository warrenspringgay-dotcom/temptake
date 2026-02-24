// app/api/workstation/operators/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSupabase } from "@/lib/supabaseServer";

export async function GET(req: NextRequest) {
  const supabase = await getServerSupabase();

  const { data: auth, error: authErr } = await supabase.auth.getUser();
  if (authErr || !auth?.user) {
    return NextResponse.json({ ok: false, reason: "unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const orgId = searchParams.get("orgId");
  const locationId = searchParams.get("locationId");

  if (!orgId || !locationId) {
    return NextResponse.json(
      { ok: false, reason: "missing_org_or_location" },
      { status: 400 }
    );
  }

  // 1) Load all active, login-enabled team members for this org.
  // Include both:
  // - members assigned to this location
  // - members with location_id NULL (treat as "all locations")
  // IMPORTANT: We do NOT require a pin row to exist.
  const { data: members, error: membersErr } = await supabase
    .from("team_members")
    .select("id, name, initials, role, pin_enabled, login_enabled, active, location_id")
    .eq("org_id", orgId)
    .eq("active", true)
    .eq("login_enabled", true)
    .or(`location_id.eq.${locationId},location_id.is.null`)
    .order("name", { ascending: true });

  if (membersErr) {
    return NextResponse.json(
      { ok: false, reason: "members_query_failed", details: membersErr.message },
      { status: 500 }
    );
  }

  const memberList = members ?? [];
  const memberIds = memberList.map((m) => m.id);

  // 2) Load pins (if any exist) for those members (separate table)
  const pinsByMemberId = new Set<string>();

  if (memberIds.length > 0) {
    const { data: pins, error: pinsErr } = await supabase
      .from("team_member_pins")
      .select("team_member_id")
      .eq("org_id", orgId)
      .in("team_member_id", memberIds);

    if (pinsErr) {
      return NextResponse.json(
        { ok: false, reason: "pins_query_failed", details: pinsErr.message },
        { status: 500 }
      );
    }

    for (const p of pins ?? []) {
      if (p?.team_member_id) pinsByMemberId.add(p.team_member_id);
    }
  }

  // 3) Shape for UI
  const operators = memberList.map((m) => ({
    id: m.id,
    name: m.name ?? null,
    initials: m.initials ?? null,
    role: m.role ?? null,
    pin_enabled: !!m.pin_enabled,
    has_pin: pinsByMemberId.has(m.id),
  }));

  return NextResponse.json({ ok: true, operators });
}

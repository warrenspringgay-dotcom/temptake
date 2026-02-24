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
  const locationId = searchParams.get("locationId"); // optional

  if (!orgId) {
    return NextResponse.json({ ok: false, reason: "missing_org" }, { status: 400 });
  }

  // Active + pin_enabled is the operator population rule
  let q = supabase
    .from("team_members")
    .select("id, name, initials, role, pin_enabled, active")
    .eq("org_id", orgId)
    .eq("active", true)
    .eq("pin_enabled", true)
    .order("name", { ascending: true });

  if (locationId) q = q.eq("location_id", locationId);

  const { data: members, error: membersErr } = await q;
  if (membersErr) {
    return NextResponse.json(
      { ok: false, reason: "members_query_failed", details: membersErr.message },
      { status: 500 }
    );
  }

  const operators = (members ?? []).map((m) => ({
    id: m.id,
    name: m.name ?? null,
    initials: m.initials ?? null,
    role: m.role ?? null,
    pin_enabled: !!m.pin_enabled,
  }));

  return NextResponse.json({ ok: true, operators });
}

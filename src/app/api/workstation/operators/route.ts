
// src/app/api/workstation/operators/route.ts
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { getServerSupabase } from "@/lib/supabaseServer";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  // Require normal app auth
  const supabase = await getServerSupabase();
  const { data: auth } = await supabase.auth.getUser();
  const userId = auth?.user?.id ?? null;
  if (!userId) return NextResponse.json({ ok: false, reason: "no-auth" }, { status: 401 });

  const url = new URL(req.url);
  const orgId = String(url.searchParams.get("orgId") ?? "").trim();
  const locationId = String(url.searchParams.get("locationId") ?? "").trim();
  if (!orgId || !locationId) {
    return NextResponse.json({ ok: false, reason: "missing" }, { status: 400 });
  }

  // Pull active members for this location
  const { data: members, error: mErr } = await supabaseAdmin
    .from("team_members")
    .select("id, name, initials, role, active, pin_enabled, login_enabled")
    .eq("org_id", orgId)
    .eq("location_id", locationId)
    .eq("active", true)
    .order("name", { ascending: true });

  if (mErr) {
    return NextResponse.json(
      { ok: false, reason: "fetch-failed", detail: mErr.message },
      { status: 400 }
    );
  }

  const memberIds = (members ?? []).map((m: any) => String(m.id));
  if (memberIds.length === 0) {
    // No staff at all, so locking is pointless.
    return NextResponse.json({ ok: true, lockRequired: false, operators: [] });
  }

  // Who has a PIN actually set?
  const { data: pins, error: pErr } = await supabaseAdmin
    .from("team_member_pins")
    .select("team_member_id")
    .eq("org_id", orgId)
    .in("team_member_id", memberIds);

  if (pErr) {
    return NextResponse.json(
      { ok: false, reason: "pins-fetch-failed", detail: pErr.message },
      { status: 400 }
    );
  }

  const pinSet = new Set((pins ?? []).map((r: any) => String(r.team_member_id)));

  // Operators are members that are pin_enabled AND have a PIN row
  const operatorsWithPin = (members ?? [])
    .filter((m: any) => !!m.pin_enabled && pinSet.has(String(m.id)))
    .map((m: any) => ({
      id: String(m.id),
      name: m.name ?? "—",
      initials: m.initials ?? null,
      role: String(m.role ?? "staff"),
    }));

  // ✅ Best UX: only require workstation lock if there is at least one configured operator.
  // New orgs without any PINs should NOT be blocked by a lock screen they cannot pass.
  const lockRequired = operatorsWithPin.length > 0;

  return NextResponse.json({
    ok: true,
    lockRequired,
    operators: operatorsWithPin,
  });
}
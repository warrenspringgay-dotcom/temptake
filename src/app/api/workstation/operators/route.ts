// src/app/api/workstation/operators/route.ts
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { getServerSupabase } from "@/lib/supabaseServer";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const supabase = await getServerSupabase();
  const { data: auth } = await supabase.auth.getUser();
  const userId = auth?.user?.id ?? null;
  if (!userId) {
    return NextResponse.json({ ok: false, reason: "no-auth" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const orgId = String(searchParams.get("orgId") ?? "").trim();
  const locationId = String(searchParams.get("locationId") ?? "").trim();

  if (!orgId || !locationId) {
    return NextResponse.json({ ok: false, reason: "missing" }, { status: 400 });
  }

  // ✅ IMPORTANT CHANGE:
  // Return ALL active/login_enabled/pin_enabled members for this org/location
  // even if they don't have a PIN row yet (left join).
  // Also tolerate location_id NULL (common for owner bootstrap rows).
  const { data, error } = await supabaseAdmin
    .from("team_members")
    .select(
      `
        id,
        name,
        initials,
        role,
        active,
        login_enabled,
        pin_enabled,
        location_id,
        team_member_pins!left(pin_hash)
      `
    )
    .eq("org_id", orgId)
    .eq("active", true)
    .eq("login_enabled", true)
    .eq("pin_enabled", true)
    .or(`location_id.eq.${locationId},location_id.is.null`)
    .order("name", { ascending: true });

  if (error) {
    return NextResponse.json(
      { ok: false, reason: "query-failed", detail: error.message },
      { status: 400 }
    );
  }

  const operators =
    (data ?? []).map((row: any) => {
      const pinHash =
        Array.isArray(row.team_member_pins) && row.team_member_pins.length > 0
          ? row.team_member_pins[0]?.pin_hash
          : null;

      return {
        id: row.id,
        name: row.name ?? null,
        initials: row.initials ?? null,
        role: row.role ?? null,
        // extra field is safe (UI doesn't have to use it)
        hasPin: Boolean(pinHash),
        // keep location available if you want it later
        location_id: row.location_id ?? null,
      };
    }) ?? [];

  // ✅ If you have eligible operators but some have no PIN yet,
  // we still want the lock screen and allow setup-on-unlock.
  const lockRequired = operators.length > 0;

  return NextResponse.json({ ok: true, lockRequired, operators });
}
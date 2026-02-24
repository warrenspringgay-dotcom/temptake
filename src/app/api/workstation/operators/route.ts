import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const orgId = url.searchParams.get("orgId");
    const locationId = url.searchParams.get("locationId");

    if (!orgId || !locationId) {
      return NextResponse.json(
        { ok: false, reason: "missing_params" },
        { status: 400 }
      );
    }

    // IMPORTANT:
    // We must return operators EVEN IF they have no PIN row yet.
    // So: left join team_member_pins, don't inner join / pin_hash filter.
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
        team_member_pins!left (
          pin_hash
        )
      `
      )
      .eq("org_id", orgId)
      .eq("location_id", locationId)
      .eq("active", true)
      .eq("login_enabled", true)
      .eq("pin_enabled", true)
      .order("name", { ascending: true });

    if (error) {
      return NextResponse.json(
        { ok: false, reason: "query_failed", error: error.message },
        { status: 500 }
      );
    }

    const operators =
      (data ?? []).map((m: any) => ({
        id: m.id,
        name: m.name ?? null,
        initials: m.initials ?? null,
        role: m.role ?? null,
        // Optional: useful for debugging/UI later, harmless if ignored
        has_pin: Array.isArray(m.team_member_pins)
          ? Boolean(m.team_member_pins[0]?.pin_hash)
          : Boolean(m.team_member_pins?.pin_hash),
      })) ?? [];

    return NextResponse.json({
      ok: true,
      lockRequired: operators.length > 0,
      operators,
    });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, reason: "server_error", error: e?.message ?? String(e) },
      { status: 500 }
    );
  }
}
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

/**
* Returns operators that can be used for PIN unlock.
* IMPORTANT: filter by pin_enabled (NOT login_enabled), otherwise you only see managers.
*/
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const orgId = searchParams.get("orgId");
    const locationId = searchParams.get("locationId");

    if (!orgId || !locationId) {
      return NextResponse.json(
        { ok: false, reason: "missing orgId/locationId", operators: [] },
        { status: 400 }
      );
    }

    const { data, error } = await supabaseAdmin
      .from("team_members")
      .select("id,name,initials,role,pin_enabled")
      .eq("org_id", orgId)
      .eq("location_id", locationId)
      .eq("pin_enabled", true)
      .order("name", { ascending: true });

    if (error) {
      return NextResponse.json(
        { ok: false, reason: error.message, operators: [] },
        { status: 500 }
      );
    }

    const operators = (data ?? []).map((r) => ({
      id: r.id,
      name: r.name ?? null,
      initials: r.initials ?? null,
      role: r.role ?? null,
    }));

    return NextResponse.json({ ok: true, operators });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, reason: e?.message ?? "unknown error", operators: [] },
      { status: 500 }
    );
  }
}

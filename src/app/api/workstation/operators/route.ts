import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const orgId = searchParams.get("orgId");
    const locationId = searchParams.get("locationId");

    if (!orgId) {
      return NextResponse.json({ ok: false, reason: "missing orgId" }, { status: 400 });
    }
    if (!locationId) {
      return NextResponse.json({ ok: false, reason: "missing locationId" }, { status: 400 });
    }

    // Include staff with location_id NULL as a fallback (common on newer accounts)
    const { data, error } = await supabaseAdmin
      .from("team_members")
      .select("id,name,initials,role,active,login_enabled,location_id")
      .eq("org_id", orgId)
      .eq("active", true)
      .eq("login_enabled", true)
      .or(`location_id.eq.${locationId},location_id.is.null`)
      .order("name", { ascending: true });

    if (error) {
      return NextResponse.json(
        { ok: false, reason: "query_failed", details: error.message },
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
      { ok: false, reason: "server_error", details: String(e?.message ?? e) },
      { status: 500 }
    );
  }
}
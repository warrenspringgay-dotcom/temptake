import { NextRequest, NextResponse } from "next/server";
import { getServerSupabase } from "@/lib/supabaseServer";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const orgId = searchParams.get("orgId");
    const locationId = searchParams.get("locationId");

    if (!orgId || !locationId) {
      return NextResponse.json(
        { ok: false, message: "Missing orgId/locationId", operators: [] },
        { status: 400 }
      );
    }

    // Authenticated requester (normal cookie auth)
    const sb = await getServerSupabase();
    const { data: auth, error: authErr } = await sb.auth.getUser();
    if (authErr || !auth?.user) {
      return NextResponse.json(
        { ok: false, message: "Unauthenticated", operators: [] },
        { status: 401 }
      );
    }

    const userId = auth.user.id;

    // Authorize: requester must be manager/owner in this org
    const { data: me, error: meErr } = await supabaseAdmin
      .from("team_members")
      .select("id, role, active")
      .eq("org_id", orgId)
      .eq("user_id", userId)
      .eq("active", true)
      .maybeSingle();

    const role = (me?.role ?? "").toLowerCase();
    const allowed = role === "owner" || role === "manager";

    if (meErr || !me || !allowed) {
      return NextResponse.json(
        { ok: false, message: "Forbidden", operators: [] },
        { status: 403 }
      );
    }

    // Fetch operators for that location (service role = no RLS surprises)
    const { data: rows, error } = await supabaseAdmin
      .from("team_members")
      .select("id, name, initials, role")
      .eq("org_id", orgId)
      .eq("location_id", locationId)
      .eq("active", true)
      .eq("login_enabled", true)
      .order("role", { ascending: false }) // managers first (usually)
      .order("name", { ascending: true });

    if (error) {
      return NextResponse.json(
        { ok: false, message: error.message, operators: [] },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ok: true,
      operators: (rows ?? []).map((r) => ({
        id: r.id,
        name: r.name ?? null,
        initials: r.initials ?? null,
        role: r.role ?? null,
      })),
    });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, message: e?.message ?? "Server error", operators: [] },
      { status: 500 }
    );
  }
}
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { getServerSupabase } from "@/lib/supabaseServer";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const orgId = searchParams.get("orgId");
  const locationId = searchParams.get("locationId");

  if (!orgId || !locationId) {
    return NextResponse.json(
      { ok: false, error: "Missing orgId/locationId" },
      { status: 400 }
    );
  }

  // Optional: ensure caller is authenticated
  const supabase = await getServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ ok: false, error: "Unauthenticated" }, { status: 401 });
  }

  // IMPORTANT: pin_enabled NOT login_enabled
  const { data, error } = await supabaseAdmin
    .from("team_members")
    .select("id, name, initials, role")
    .eq("org_id", orgId)
    .eq("location_id", locationId)
    .eq("pin_enabled", true)
    .order("name", { ascending: true });

  if (error) {
    return NextResponse.json(
      { ok: false, error: error.message },
      { status: 500 }
    );
  }

  return NextResponse.json({
    ok: true,
    operators: (data ?? []).map((r) => ({
      id: r.id,
      name: r.name ?? null,
      initials: r.initials ?? null,
      role: r.role ?? null,
    })),
  });
}
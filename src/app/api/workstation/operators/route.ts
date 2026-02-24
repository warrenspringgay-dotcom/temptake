// src/app/api/workstation/operators/route.ts
import { NextResponse } from "next/server";
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
  const orgId = searchParams.get("orgId");
  const locationId = searchParams.get("locationId");

  if (!orgId || !locationId) {
    return NextResponse.json({ ok: false, reason: "missing_org_or_location" }, { status: 400 });
  }

  // ✅ PIN operators should be based on pin_enabled, not login_enabled
  const { data, error } = await supabase
    .from("team_members")
    .select("id, name, initials, role, active, pin_enabled, location_id")
    .eq("org_id", orgId)
    .eq("active", true)
    .eq("pin_enabled", true)
    .or(`location_id.eq.${locationId},location_id.is.null`)
    .order("name", { ascending: true });

  if (error) {
    return NextResponse.json(
      { ok: false, reason: "members_query_failed", details: error.message },
      { status: 500 }
    );
  }

  const operators = (data ?? []).map((m: any) => ({
    id: m.id,
    name: m.name ?? null,
    initials: m.initials ?? null,
    role: m.role ?? null,
  }));

  return NextResponse.json({ ok: true, operators });
}
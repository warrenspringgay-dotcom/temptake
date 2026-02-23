// src/app/api/workstation/operators/route.ts
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { getServerSupabase } from "@/lib/supabaseServer";

export const dynamic = "force-dynamic";

function escOrValue(v: string) {
  // basic escape for Supabase .or string: commas and parentheses are the main offenders
  return v.replaceAll(",", "%2C").replaceAll("(", "%28").replaceAll(")", "%29");
}

export async function GET(req: Request) {
  // Require normal app auth (manager session etc.)
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

  // Operators = active + pin_enabled + pin_set (exists in team_member_pins)
  // IMPORTANT: include org-level rows (location_id IS NULL) as fallback.
  const loc = escOrValue(locationId);

  const { data, error } = await supabaseAdmin
    .from("team_members")
    .select("id, name, initials, role, active, pin_enabled, location_id")
    .eq("org_id", orgId)
    .eq("active", true)
    .eq("pin_enabled", true)
    .or(`location_id.eq.${loc},location_id.is.null`)
    .order("name", { ascending: true });

  if (error) {
    return NextResponse.json(
      { ok: false, reason: "fetch-failed", detail: error.message },
      { status: 400 }
    );
  }

  const memberIds = (data ?? []).map((m: any) => String(m.id));
  if (memberIds.length === 0) {
    return NextResponse.json({ ok: true, operators: [] });
  }

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

  const operators = (data ?? [])
    .filter((m: any) => pinSet.has(String(m.id)))
    .map((m: any) => ({
      id: String(m.id),
      name: m.name ?? "—",
      initials: m.initials ?? null,
      role: (m.role ?? "staff") as string,
    }));

  return NextResponse.json({ ok: true, operators });
}
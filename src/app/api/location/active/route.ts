// src/app/api/location/active/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSupabase } from "@/lib/supabaseServer";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const runtime = "nodejs";

async function getOrgIdForUser(userId: string) {
  const { data, error } = await supabaseAdmin
    .from("profiles")
    .select("org_id")
    .eq("id", userId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data?.org_id) throw new Error("No organisation found for this user.");
  return String(data.org_id);
}

export async function GET() {
  try {
    const supabase = await getServerSupabase();
    const {
      data: { user },
      error: userErr,
    } = await supabase.auth.getUser();

    if (userErr || !user) {
      return NextResponse.json({ ok: true, loggedIn: false, activeLocationId: null }, { status: 200 });
    }

    const { data: profile, error } = await supabaseAdmin
      .from("profiles")
      .select("active_location_id")
      .eq("id", user.id)
      .maybeSingle();

    if (error) throw new Error(error.message);

    return NextResponse.json(
      { ok: true, loggedIn: true, activeLocationId: profile?.active_location_id ?? null },
      { status: 200 }
    );
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, activeLocationId: null, reason: e?.message ?? "unknown_error" },
      { status: 200 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await getServerSupabase();
    const {
      data: { user },
      error: userErr,
    } = await supabase.auth.getUser();

    if (userErr || !user) {
      return NextResponse.json({ ok: false, reason: "not_authenticated" }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const activeLocationId = typeof body?.activeLocationId === "string" ? body.activeLocationId : null;

    // Allow clearing it (null) if you ever want that.
    if (activeLocationId) {
      const orgId = await getOrgIdForUser(user.id);

      // Validate location belongs to org (prevents cross-org nonsense)
      const { data: loc, error: locErr } = await supabaseAdmin
        .from("locations")
        .select("id")
        .eq("id", activeLocationId)
        .eq("org_id", orgId)
        .maybeSingle();

      if (locErr) throw new Error(locErr.message);
      if (!loc?.id) {
        return NextResponse.json({ ok: false, reason: "invalid_location" }, { status: 400 });
      }
    }

    const { error: updErr } = await supabaseAdmin
      .from("profiles")
      .update({ active_location_id: activeLocationId })
      .eq("id", user.id);

    if (updErr) throw new Error(updErr.message);

    return NextResponse.json({ ok: true, activeLocationId }, { status: 200 });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, reason: e?.message ?? "unknown_error" },
      { status: 200 }
    );
  }
}

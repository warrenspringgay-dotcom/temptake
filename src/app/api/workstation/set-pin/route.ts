// src/app/api/workstation/set-pin/route.ts
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { getServerSupabase } from "@/lib/supabaseServer";

export const dynamic = "force-dynamic";

function cleanPin(pin: unknown) {
  const digits = String(pin ?? "").trim().replace(/\D+/g, "");
  return digits.slice(0, 8);
}

export async function POST(req: Request) {
  const supabase = await getServerSupabase();
  const { data: auth } = await supabase.auth.getUser();
  const userId = auth?.user?.id;
  const email = (auth?.user?.email ?? "").trim().toLowerCase();
  if (!userId) return NextResponse.json({ ok: false, reason: "no-auth" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const orgId = String(body.orgId ?? "").trim();
  const locationId = String(body.locationId ?? "").trim();
  const teamMemberId = String(body.teamMemberId ?? "").trim();
  const pin = cleanPin(body.pin);

  if (!orgId || !locationId || !teamMemberId || pin.length < 4) {
    return NextResponse.json({ ok: false, reason: "missing" }, { status: 400 });
  }

  // Permission check: current logged-in user must be manager-like for this org+location.
  const { data: me, error: meErr } = await supabaseAdmin
    .from("team_members")
    .select("role")
    .eq("org_id", orgId)
    .eq("location_id", locationId)
    .or(`user_id.eq.${userId},email.eq.${email}`)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (meErr || !me) {
    return NextResponse.json({ ok: false, reason: "not-member" }, { status: 403 });
  }

  const r = String(me.role ?? "staff").toLowerCase();
  const managerLike = r === "owner" || r === "admin" || r === "manager";
  if (!managerLike) {
    return NextResponse.json({ ok: false, reason: "forbidden" }, { status: 403 });
  }

  // Ensure target member belongs to org+location
  const { data: target, error: tErr } = await supabaseAdmin
    .from("team_members")
    .select("id, org_id, location_id")
    .eq("org_id", orgId)
    .eq("location_id", locationId)
    .eq("id", teamMemberId)
    .maybeSingle();

  if (tErr || !target) {
    return NextResponse.json({ ok: false, reason: "target-not-found" }, { status: 404 });
  }

  // Hash PIN using crypt(gen_salt('bf'))
  const { data: hashed, error: hErr } = await supabaseAdmin.rpc("hash_pin_bcrypt", { p_pin: pin });
  if (hErr || !hashed) {
    return NextResponse.json({ ok: false, reason: "hash-failed", detail: hErr?.message }, { status: 400 });
  }

  const { error: upErr } = await supabaseAdmin
    .from("team_member_pins")
    .upsert(
      {
        org_id: orgId,
        team_member_id: teamMemberId,
        pin_hash: String(hashed),
        failed_attempts: 0,
        locked_until: null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "org_id,team_member_id" }
    );

  if (upErr) {
    return NextResponse.json({ ok: false, reason: "upsert-failed", detail: upErr.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}

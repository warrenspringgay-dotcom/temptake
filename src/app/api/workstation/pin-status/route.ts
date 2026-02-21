import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { getServerSupabase } from "@/lib/supabaseServer";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const supabase = await getServerSupabase();
  const { data: auth } = await supabase.auth.getUser();
  const userId = auth?.user?.id ?? null;
  if (!userId) return NextResponse.json({ ok: false, reason: "no-auth" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const orgId = String(body.orgId ?? "").trim();
  const memberIds = Array.isArray(body.memberIds) ? body.memberIds.map((x: any) => String(x)) : [];

  if (!orgId || memberIds.length === 0) {
    return NextResponse.json({ ok: false, reason: "missing" }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin
    .from("team_member_pins")
    .select("team_member_id")
    .eq("org_id", orgId)
    .in("team_member_id", memberIds);

  if (error) {
    return NextResponse.json({ ok: false, reason: "fetch-failed", detail: error.message }, { status: 400 });
  }

  const setIds = (data ?? []).map((r: any) => String(r.team_member_id));
  return NextResponse.json({ ok: true, pinSetIds: setIds });
}
import { NextRequest, NextResponse } from "next/server";
import { getServerSupabase } from "@/lib/supabaseServer";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function GET(req: NextRequest) {
  const supabase = await getServerSupabase();

  const {
    data: { user },
    error: userErr,
  } = await supabase.auth.getUser();

  if (userErr || !user?.email) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  const email = user.email.toLowerCase();

  // Find org from team_members (authoritative for invites)
  const { data: tm, error: tmErr } = await supabaseAdmin
    .from("team_members")
    .select("org_id")
    .eq("email", email)
    .maybeSingle();

  if (tmErr || !tm?.org_id) {
    return NextResponse.redirect(new URL("/login?invite=missing", req.url));
  }

  // Set profiles.org_id so getActiveOrgIdServer stops being awkward
  await supabaseAdmin
    .from("profiles")
    .update({ org_id: tm.org_id })
    .eq("id", user.id);

  return NextResponse.redirect(new URL("/manager/team?invite=1", req.url));
}

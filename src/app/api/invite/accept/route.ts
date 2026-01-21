// src/app/api/invite/accept/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSupabase } from "@/lib/supabaseServer";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function GET(req: NextRequest) {
  const supabase = await getServerSupabase();

  const {
    data: { user },
    error: userErr,
  } = await supabase.auth.getUser();

  // Must have a logged-in user with an email
  const emailRaw = user?.email;
  if (userErr || !user || !emailRaw) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  const email = emailRaw.toLowerCase();

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
  const { error: profErr } = await supabaseAdmin
    .from("profiles")
    .update({ org_id: tm.org_id })
    .eq("id", user.id);

  if (profErr) {
    return NextResponse.redirect(new URL("/login?invite=profile", req.url));
  }

  return NextResponse.redirect(new URL("/manager/team?invite=1", req.url));
}

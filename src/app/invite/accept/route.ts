// src/app/invite/accept/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

function getOrigin(req: NextRequest) {
  const env =
    process.env.NEXT_PUBLIC_SITE_URL ||
    (process.env.NEXT_PUBLIC_VERCEL_URL
      ? `https://${process.env.NEXT_PUBLIC_VERCEL_URL}`
      : "");

  if (env) return env.replace(/\/$/, "");
  return req.nextUrl.origin;
}

export async function GET(req: NextRequest) {
  const origin = getOrigin(req);

  // We'll redirect at the end. Create the response now so Supabase can set cookies on it.
  const res = NextResponse.redirect(new URL("/manager/team?invite=1", origin));

  // Supabase SSR client that CAN write auth cookies to the response
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return req.cookies.get(name)?.value;
        },
        set(name: string, value: string, options: any) {
          res.cookies.set({ name, value, ...options });
        },
        remove(name: string, options: any) {
          res.cookies.set({ name, value: "", ...options, maxAge: 0 });
        },
      },
    }
  );

  // If we arrived from an email link, exchange the code for a session
  const code = req.nextUrl.searchParams.get("code");
  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      return NextResponse.redirect(new URL("/login?invite=code", origin));
    }
  }

  // Now we should have a user (either already logged in or via exchanged code)
  const {
    data: { user },
    error: userErr,
  } = await supabase.auth.getUser();

  const emailRaw = user?.email?.trim();
  if (userErr || !user || !emailRaw) {
    return NextResponse.redirect(new URL("/login?invite=no-session", origin));
  }

  const email = emailRaw.toLowerCase();

  // Find org from team_members (source of truth for invites)
  const { data: tm, error: tmErr } = await supabaseAdmin
    .from("team_members")
    .select("org_id")
    .eq("email", email)
    .maybeSingle();

  if (tmErr || !tm?.org_id) {
    return NextResponse.redirect(new URL("/login?invite=missing", origin));
  }

  // Update profiles.org_id so your "active org" helpers stop being awkward
  const { error: profErr } = await supabaseAdmin
    .from("profiles")
    .update({ org_id: tm.org_id })
    .eq("id", user.id);

  if (profErr) {
    return NextResponse.redirect(new URL("/login?invite=profile", origin));
  }

  // Success: send them to team page with a flag
  return res;
}

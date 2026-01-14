// src/app/auth/callback/route.ts
import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");

  // Where to go immediately after callback
  const next = url.searchParams.get("next") || "/dashboard";

  // Where to go after /setup is completed (optional)
  const after = url.searchParams.get("after") || "/dashboard";

  // We create a response now so Supabase can write cookies onto it
  const res = NextResponse.redirect(new URL(next, url.origin));

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return req.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            res.cookies.set(name, value, options);
          });
        },
      },
    }
  );

  // If no code, just go where we were heading (probably user cancelled)
  if (!code) return res;

  // Exchange code for session cookie
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    // If auth fails, dump them on login with a polite hint
    const fail = NextResponse.redirect(new URL("/login?error=oauth", url.origin));
    return fail;
  }

  // Persist the "after" destination so /setup knows where to send them
  // (We keep it simple: store in a cookie for a few minutes)
  res.cookies.set("tt_after_setup", after, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 10, // 10 minutes
  });

  return res;
}

// src/app/auth/callback/route.ts
import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

export async function GET(req: NextRequest) {
  const url = new URL(req.url);

  // Supabase will send ?code=...
  const code = url.searchParams.get("code");

  // Where to go after callback (we pass this in redirectTo)
  const next = url.searchParams.get("next") || "/dashboard";

  // Create response early so Supabase can attach cookies
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

  // If the user cancelled or code missing, just bounce to next
  if (!code) return res;

  const { error } = await supabase.auth.exchangeCodeForSession(code);

  // If exchange fails, send them back to login with a flag
  if (error) {
    return NextResponse.redirect(new URL(`/login?error=oauth&next=${encodeURIComponent(next)}`, url.origin));
  }

  return res;
}

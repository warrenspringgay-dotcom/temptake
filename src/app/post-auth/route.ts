// src/app/post-auth/route.ts
import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

export async function GET(req: NextRequest) {
  const url = new URL(req.url);

  // "dest" is where the user actually wanted to go (e.g. /dashboard, /reports etc.)
  const dest = url.searchParams.get("dest") || "/dashboard";

  const res = NextResponse.redirect(new URL(dest, url.origin));

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

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    // Not authed: go login
    return NextResponse.redirect(new URL(`/login?next=${encodeURIComponent(dest)}`, url.origin));
  }

  // Ensure trial exists (if org exists). If no org yet, redirect to setup.
  const ensure = await fetch(new URL("/api/billing/ensure-trial", url.origin), {
    method: "POST",
    headers: {
      // Pass cookies through so the API sees the session
      cookie: req.headers.get("cookie") ?? "",
    },
    cache: "no-store",
  });

  const j = await ensure.json().catch(() => null);

  if (!j || j.ok === false) {
    // No org means they need to complete setup first
    if (j?.reason === "no_org") {
      const setupUrl = new URL("/setup", url.origin);
      setupUrl.searchParams.set("next", dest);
      return NextResponse.redirect(setupUrl);
    }
    // Anything else: shove them to billing as a safe fallback
    return NextResponse.redirect(new URL("/billing", url.origin));
  }

  // All good. Go where they intended.
  return res;
}

// src/middleware.ts
import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export async function middleware(req: NextRequest) {
  // Always start with a pass-through response
  const res = NextResponse.next({ request: { headers: req.headers } });

  // Skip non-HTML requests early (helps avoid noisy loops)
  const pathname = req.nextUrl.pathname;
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api") ||
    pathname === "/favicon.ico" ||
    pathname === "/robots.txt" ||
    pathname === "/sitemap.xml"
  ) {
    return res;
  }

  const supabase = createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      get: (name: string) => req.cookies.get(name)?.value,
      // set only when changed (prevents endless refreshes)
      set: (name: string, value: string, options?: Record<string, any>) => {
        const current = req.cookies.get(name)?.value;
        if (current !== value) {
          res.cookies.set(name, value, options);
        }
      },
      remove: (name: string, options?: Record<string, any>) => {
        if (req.cookies.has(name)) {
          res.cookies.set(name, "", { ...options, maxAge: 0 });
        }
      },
    },
  });

  // Touch the session so cookies stay fresh; ignore if signed out
  try {
    await supabase.auth.getUser();
  } catch {}

  return res;
}

export const config = {
  matcher: [
    // everything except Next assets & common static files
    "/((?!_next/|favicon.ico|robots.txt|sitemap.xml|.*\\.(?:png|jpg|jpeg|gif|svg|webp)).*)",
  ],
};

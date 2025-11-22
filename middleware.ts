// src/middleware.ts  ← REPLACE YOUR CURRENT FILE WITH THIS
import { NextRequest, NextResponse } from "next/server";
import { supabaseForMiddleware } from "@/lib/supabaseServer";

export const config = {
  matcher: [
    /*
      Only these routes require login
      Everything else (including /, /wall, /login, static files) stays PUBLIC
    */
    "/dashboard/:path*",
    "/routines/:path*",
    "/allergens/:path*",
    "/cleaning-rota/:path*",
    "/team/:path*",
    "/leaderboard/:path*",
    "/suppliers/:path*",
    "/reports/:path*",
    "/foodtemps/:path*",
  ],
};

export async function middleware(req: NextRequest) {
  const url = new URL(req.url);
  const pathname = url.pathname;

  // 1. Let these paths be 100% public — no auth check, no redirect
  if (
    pathname === "/" ||
    pathname.startsWith("/login") ||
    pathname.startsWith("/wall") ||        // ← your public wall preview
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api/auth") ||
    pathname.includes(".")                 // ← static files (images, favicon, etc.)
  ) {
    return NextResponse.next();
  }

  // 2. Everything else in the matcher → require login
  const { supabase, res } = supabaseForMiddleware(req);
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    const redirectTo = `/login?next=${encodeURIComponent(pathname + url.search)}`;
    return NextResponse.redirect(new URL(redirectTo, req.url));
  }

  return res || NextResponse.next();
}
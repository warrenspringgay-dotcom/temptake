// src/middleware.ts
import { NextRequest, NextResponse } from "next/server";
import { createMiddlewareClient } from "@supabase/auth-helpers-nextjs";

const PUBLIC_PATHS = new Set<string>([
  "/",
  "/launch",
  "/login",
  "/signup",
  "/reset-password",
  "/demo-wall",
]);

export async function middleware(req: NextRequest) {
  const { pathname, search } = req.nextUrl;

  // Allow Next internals & static assets
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon") ||
    pathname.startsWith("/assets") ||
    pathname.match(/\.(ico|png|jpg|jpeg|gif|webp|svg|css|js|txt|map|woff2?)$/)
  ) {
    return NextResponse.next();
  }

  // Create a mutable response FIRST and hand it to the Supabase middleware client
  const res = NextResponse.next();
  const supabase = createMiddlewareClient({ req, res });

  // Check current session
  const {
    data: { session },
  } = await supabase.auth.getSession();

  const isPublic = PUBLIC_PATHS.has(pathname);

  // Not signed in and not public -> go to login (preserve deep link)
  if (!session && !isPublic) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("redirect", pathname + (search || ""));
    return NextResponse.redirect(url);
  }

  // Signed in but visiting /login or /signup -> push to redirect or home
  if (session && (pathname === "/login" || pathname === "/signup")) {
    const target = req.nextUrl.searchParams.get("redirect") || "/";
    const url = req.nextUrl.clone();
    url.pathname = target;
    url.searchParams.delete("redirect");
    return NextResponse.redirect(url);
  }

  // Otherwise just continue
  return res;
}

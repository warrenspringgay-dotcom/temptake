// middleware.ts
import { NextRequest, NextResponse } from "next/server";

const PUBLIC_PATHS = [
  "/login",
  "/signup",
  "/forgot-password",
  "/privacy-policy",
  "/cookie-policy",
];

const MANAGER_ONLY_PREFIXES = [
  "/team",
  "/suppliers",
  "/billing",
  "/reports",
  "/manager-dashboard",
];

function isPublic(pathname: string) {
  return PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(p + "/"));
}

function isManagerOnly(pathname: string) {
  return MANAGER_ONLY_PREFIXES.some((p) => pathname === p || pathname.startsWith(p + "/"));
}

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (isPublic(pathname)) return NextResponse.next();

  // If not authed, bounce to login
  const sb = req.cookies.get("sb-access-token")?.value || req.cookies.get("supabase-auth-token")?.value;
  // Your app may store supabase auth token under a different cookie name; this middleware was already best-effort.
  if (!sb) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  // IMPORTANT:
  // Do NOT gate manager routes using workstation operator role.
  // Operator PIN is not your auth permission model.
  // Also: org/location can be unset at signup, so don't block access just because cookies aren't there.
  if (isManagerOnly(pathname)) {
    // Allow through. Supabase RLS + page logic should protect data.
    return NextResponse.next();
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
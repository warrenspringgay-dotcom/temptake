// src/middleware.ts
import { NextRequest, NextResponse } from "next/server";

function isPublicRoute(pathname: string) {
  return (
    pathname === "/login" ||
    pathname.startsWith("/login") ||
    pathname === "/signup" ||
    pathname.startsWith("/signup") ||
    pathname === "/privacy-policy" ||
    pathname === "/cookie-policy" ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api") ||
    pathname === "/favicon.ico" ||
    pathname === "/manifest.webmanifest"
  );
}

/**
* IMPORTANT:
* Middleware should not try to be clever about “operator lock”.
* It should only gate app routes based on auth/org/location presence.
*/
export async function middleware(req: NextRequest) {
  const url = req.nextUrl.clone();
  const pathname = url.pathname;

  if (isPublicRoute(pathname)) {
    return NextResponse.next();
  }

  // If you require org+location for app pages:
  const orgId = req.cookies.get("tt_active_org_id")?.value ?? null;
  const locationId = req.cookies.get("tt_active_location_id")?.value ?? null;

  // If those cookies aren’t set, send user to dashboard (or locations) after login.
  if (!orgId || !locationId) {
    url.pathname = "/dashboard";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};

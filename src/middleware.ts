// src/middleware.ts
import { NextResponse, type NextRequest } from "next/server";

/**
 * Paths that never require auth.
 * Add your public pages here (login, marketing, etc.)
 */
const PUBLIC_PATHS = new Set<string>([
  "/",
  "/login",
  "/sign-in",
  "/api/auth/callback",
  "/_next",      // framework assets
  "/images",
  "/favicon.ico",
  "/robots.txt",
  "/sitemap.xml",
]);

function isPublicPath(pathname: string) {
  for (const p of PUBLIC_PATHS) {
    if (pathname === p || pathname.startsWith(p + "/")) return true;
  }
  return false;
}

/**
 * Supabase SSR cookie names look like:
 *   sb-<project-ref>-auth-token
 * We consider presence of any such cookie as "authenticated".
 */
function hasSupabaseAuthCookie(req: NextRequest) {
  const all = req.cookies.getAll();
  return all.some(
    (c) => c.name.startsWith("sb-") && c.name.endsWith("-auth-token") && c.value
  );
}

export async function middleware(req: NextRequest) {
  const { pathname, search } = req.nextUrl;

  // Allow public paths
  if (isPublicPath(pathname)) return NextResponse.next();

  // If no Supabase auth cookie → redirect to /login
  if (!hasSupabaseAuthCookie(req)) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    // Preserve where they were heading
    const dest = pathname + (search || "");
    url.searchParams.set("redirect", dest);
    return NextResponse.redirect(url);
  }

  // Otherwise, proceed as normal
  return NextResponse.next();
}

export const config = {
  matcher: [
    // Run on all app paths except static assets & public files
    "/((?!_next/static|_next/image|favicon.ico|images|api/public).*)",
  ],
};

// middleware.ts
import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

const PUBLIC_PATHS = new Set<string>([
  "/",
  "/login",
  "/signup",
  "/sectors",
  "/auth/callback",
  "/pricing",
  "/guides",
  "/app",
   "/demo",
  "/privacy",
  "/terms",
  "/cookies",
  "/food-hygiene-app",
  "/templates",
  "/cafe-food-safety-app",
  "/takeaway-food-safety-app",
  "/restaurant-food-safety-app",
  "/fish-and-chip-shop-food-safety-app",
  "/pub-food-safety-app",
  "/mobile-catering-food-safety-app",
  "/sitemap.xml"
]);

const OPERATOR_ROLE_COOKIE = "tt_operator_role";

// ✅ Routes that require manager/admin/owner
const MANAGER_ONLY_PREFIXES = [
  "/team",
  "/suppliers",
  "/billing",
  "/settings",
  "/manager",
];

function isStaticAsset(pathname: string) {
  return (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon") ||
    pathname.startsWith("/assets") ||
     pathname.startsWith("/downloads") ||
    pathname.match(
      /\.(ico|png|jpg|jpeg|gif|webp|svg|css|js|txt|map|json|pdf|webmanifest|woff2?)$/
    )
  );
}

function startsWithAny(pathname: string, prefixes: string[]) {
  return prefixes.some((p) => pathname === p || pathname.startsWith(p + "/"));
}

function sanitizeNext(nextRaw: string | null | undefined) {
  if (!nextRaw) return null;

  let next = nextRaw;
  try {
    next = decodeURIComponent(nextRaw);
  } catch {}

  if (!next.startsWith("/")) return null;
  if (next.startsWith("//")) return null;

  const lower = next.toLowerCase();
  if (lower.startsWith("/http:") || lower.startsWith("/https:")) return null;

  if (next === "/login" || next === "/signup") return "/dashboard";

  return next;
}

function normalizeRole(role: string | undefined | null) {
  const r = String(role ?? "").trim().toLowerCase();
  return r || null;
}

function isManagerRole(role: string | null) {
  if (!role) return false;
  return role === "owner" || role === "admin" || role === "manager";
}

export async function middleware(req: NextRequest) {
  const { pathname, search } = req.nextUrl;

  if (pathname.startsWith("/api/stripe/webhook")) return NextResponse.next();
  if (isStaticAsset(pathname)) return NextResponse.next();

  const res = NextResponse.next();

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
    data: { session },
  } = await supabase.auth.getSession();

  const isPublic =
    PUBLIC_PATHS.has(pathname) ||
    pathname.startsWith("/guides/") ||
     pathname.startsWith("/templates/") ||
    pathname.startsWith("/demo-wall");

  if (!session && !isPublic) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", pathname + (search || ""));
    return NextResponse.redirect(url);
  }

  if (session && (pathname === "/login" || pathname === "/signup")) {
    const nextRaw = req.nextUrl.searchParams.get("next");
    const next = sanitizeNext(nextRaw) || "/dashboard";

    const url = req.nextUrl.clone();
    const parsed = new URL(next, req.nextUrl.origin);
    url.pathname = parsed.pathname;
    url.search = parsed.search;
    return NextResponse.redirect(url);
  }

  // ✅ Only check manager-only routes if the requested path is manager-only
  if (startsWithAny(pathname, MANAGER_ONLY_PREFIXES)) {
    // 1) Prefer workstation operator role (PIN mode)
    const operatorRole = normalizeRole(req.cookies.get(OPERATOR_ROLE_COOKIE)?.value ?? null);

    if (operatorRole) {
      if (!isManagerRole(operatorRole)) {
        const url = req.nextUrl.clone();
        url.pathname = "/dashboard";
        url.searchParams.set("blocked", "manager-only");
        url.searchParams.set("mode", "operator");
        return NextResponse.redirect(url);
      }
      return res;
    }

    // 2) Fallback: normal login role check (server-side)
    // You need org_id/location_id stored somewhere accessible server-side.
    // If you store active org/location in cookies or session metadata, read them here.
    const orgId = req.cookies.get("tt_active_org")?.value ?? null;
    const locationId = req.cookies.get("tt_active_location")?.value ?? null;

    // If we can't determine org/location, be conservative: block.
    if (!orgId || !locationId) {
      const url = req.nextUrl.clone();
      url.pathname = "/dashboard";
      url.searchParams.set("blocked", "manager-only");
      url.searchParams.set("mode", "unknown-context");
      return NextResponse.redirect(url);
    }

    const userId = session?.user?.id ?? null;
    if (!userId) {
      const url = req.nextUrl.clone();
      url.pathname = "/dashboard";
      url.searchParams.set("blocked", "manager-only");
      url.searchParams.set("mode", "no-user");
      return NextResponse.redirect(url);
    }

    const { data, error } = await supabase
      .from("team_members")
      .select("role")
      .eq("org_id", orgId)
      .eq("user_id", userId)
      .or(`location_id.eq.${locationId},location_id.is.null`)
      .order("location_id", { ascending: false }) // prefers location row over null if both exist
      .limit(1)
      .maybeSingle();
    const role = !error ? normalizeRole(data?.role ?? null) : null;

    if (!isManagerRole(role)) {
      const url = req.nextUrl.clone();
      url.pathname = "/dashboard";
      url.searchParams.set("blocked", "manager-only");
      url.searchParams.set("mode", "auth");
      return NextResponse.redirect(url);
    }
  }

  return res;
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
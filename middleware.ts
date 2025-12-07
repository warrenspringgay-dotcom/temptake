// middleware.ts
import { NextResponse, type NextRequest } from 'next/server';
import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs';

const PUBLIC_PATHS = new Set<string>([
  '/',             // landing page – public
  '/login',
  '/signup',
  '/auth/callback',
]);

export async function middleware(req: NextRequest) {
  const { pathname, search } = req.nextUrl;

  // Allow Next internals & static assets
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon') ||
    pathname.startsWith('/assets') ||
    pathname.match(/\.(ico|png|jpg|jpeg|gif|webp|svg|css|js|txt|map|woff2?)$/)
  ) {
    return NextResponse.next();
  }

  // Create a mutable response FIRST and hand it to the Supabase middleware client
  const res = NextResponse.next();
  const supabase = createMiddlewareClient({ req, res });

  // getSession() syncs refreshed tokens onto `res` cookies
  const {
    data: { session },
  } = await supabase.auth.getSession();

  // Public routes:
  // - Exact matches in PUBLIC_PATHS
  // - Any route under /demo (public demo dashboard)
  const isPublic =
    PUBLIC_PATHS.has(pathname) ||
    pathname.startsWith('/demo'); // <-- allow /demo, /demo/... without auth

  // Not signed in and not public -> go to login (preserve deep link)
  if (!session && !isPublic) {
    const url = req.nextUrl.clone();
    url.pathname = '/login';
    url.searchParams.set('redirect', pathname + (search || ''));
    return NextResponse.redirect(url);
  }

  // Signed in but visiting /login or /signup -> push to redirect or home
  if (session && (pathname === '/login' || pathname === '/signup')) {
    const target = req.nextUrl.searchParams.get('redirect') || '/';
    const url = req.nextUrl.clone();
    url.pathname = target;
    url.search = '';
    return NextResponse.redirect(url);
  }

  // Proceed, returning the same mutated `res` so cookies persist across pages
  return res;
}

export const config = {
  matcher: ['/((?!api/cron).*)'],
};

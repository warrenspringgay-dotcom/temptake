
// Optional: respond to fetch events here if you want offline caching.
// public/sw.js
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', event => event.waitUntil(self.clients.claim()));
self.addEventListener('fetch', () => { /* pass-through; hook is enough for installability */ });


/* public/sw.js
 *
 * Minimal SW rules that won't sabotage auth.
 * Key points:
 * - Never cache /api/* (including /api/auth/me)
 * - Never cache auth-related pages/routes
 * - Use NETWORK-FIRST for navigations (HTML) so header/auth state is current
 * - Cache-first only for static assets (_next/static, images, etc.)
 */

const VERSION = "v7"; // bump this whenever you change SW behaviour
const STATIC_CACHE = `tt-static-${VERSION}`;

self.addEventListener("install", (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => {
      // Precache nothing here unless you're 100% sure it's safe.
      return cache.addAll([]);
    })
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys
          .filter((k) => k.startsWith("tt-static-") && k !== STATIC_CACHE)
          .map((k) => caches.delete(k))
      );
      await self.clients.claim();
    })()
  );
});

function isBypass(url) {
  // Never touch API routes or anything auth/session related.
  // This is where service workers go to break apps.
  if (url.pathname.startsWith("/api/")) return true;
  if (url.pathname.startsWith("/auth/")) return true;
  if (url.pathname.startsWith("/login")) return true;
  if (url.pathname.startsWith("/signup")) return true;
  if (url.pathname.startsWith("/billing")) return true;

  // Supabase auth calls (if any are proxied through your domain)
  if (url.pathname.includes("supabase")) return true;

  return false;
}

function isStaticAsset(url) {
  return (
    url.pathname.startsWith("/_next/static/") ||
    url.pathname.startsWith("/_next/image") ||
    url.pathname.match(/\.(png|jpg|jpeg|gif|webp|svg|ico|css|js|map|woff2?)$/)
  );
}

self.addEventListener("fetch", (event) => {
  const req = event.request;
  const url = new URL(req.url);

  // Only handle same-origin requests
  if (url.origin !== self.location.origin) return;

  // Bypass auth + api routes completely
  if (isBypass(url)) return;

  // NETWORK-FIRST for navigations so auth-aware UI isn't stale
  if (req.mode === "navigate") {
    event.respondWith(
      (async () => {
        try {
          const fresh = await fetch(req);
          return fresh;
        } catch (err) {
          // If offline, fall back to cache (best effort)
          const cached = await caches.match(req);
          return (
            cached ||
            new Response("Offline", { status: 503, headers: { "Content-Type": "text/plain" } })
          );
        }
      })()
    );
    return;
  }

  // Cache-first for static assets
  if (isStaticAsset(url)) {
    event.respondWith(
      (async () => {
        const cached = await caches.match(req);
        if (cached) return cached;

        const res = await fetch(req);
        const cache = await caches.open(STATIC_CACHE);
        cache.put(req, res.clone());
        return res;
      })()
    );
    return;
  }

  // Default: just go to network
  event.respondWith(fetch(req));
});

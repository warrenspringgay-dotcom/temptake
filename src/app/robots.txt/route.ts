// src/app/robots.txt/route.ts
export const dynamic = "force-static";
export function GET() {
  return new Response(`User-agent: *
Allow: /

Sitemap: https://temptake.com/sitemap.xml`, {
    headers: { "Content-Type": "text/plain" }
  });
}
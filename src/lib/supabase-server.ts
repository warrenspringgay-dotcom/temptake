// src/lib/supabase-server.ts
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";

/**
 * Create a cookie-aware Supabase client for **server** code (RSC, Server Actions, Route Handlers).
 * NOTE: In Next 15+, cookies() is async on the server, so this function is async too.
 */
export async function supabaseServer() {
  const cookieStore = await cookies(); // <- important for Next 15

  const client = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set(name: string, value: string, options?: CookieOptions) {
          // options is typed by @supabase/ssr; pass directly
          cookieStore.set({ name, value, ...options });
        },
        remove(name: string, options?: CookieOptions) {
          cookieStore.set({ name, value: "", ...options, maxAge: 0 });
        },
      },
    }
  );

  return client;
}

/* ───────── Backwards-compat shims so older imports keep compiling ───────── */

// Some files used to import these names — keep them available:
export async function getServerSupabase() {
  return supabaseServer();
}
export async function createSupabaseServerClient() {
  return supabaseServer();
}

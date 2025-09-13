// src/lib/supabase-server.ts
import { cookies, type CookieOptions } from "next/headers";
import { createServerClient } from "@supabase/ssr";

/**
 * Next 15-safe server client for RSC / Server Actions.
 * - Uses async cookies() calls
 * - Swallows cookie writes outside Server Actions/Route Handlers
 */
export function supabaseServer() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  return createServerClient(url, anon, {
    cookies: {
      // Next 15 makes cookies() async; call it at use time
      getAll: async () => (await cookies()).getAll(),
      setAll: async (cookiesToSet) => {
        // Cookie writes only succeed in Server Actions / Route Handlers.
        // We try, but swallow if we're in RSC.
        try {
          const store = await cookies();
          for (const { name, value, options } of cookiesToSet) {
            store.set({ name, value, ...(options as CookieOptions) });
          }
        } catch {
          // no-op in disallowed contexts
        }
      },
    },
  });
}

// Back-compat aliases (some files may still import these)
export const createSupabaseServerClient = supabaseServer;
export const getServerSupabase = supabaseServer;

// src/lib/supabaseServer.ts
import { cookies } from "next/headers";
import {
  createServerClient as createSupabaseClient,
  type CookieOptions,
} from "@supabase/ssr";

/**
 * Universal server-side Supabase client (routes, layouts, server actions).
 */
export async function getServerSupabase() {
  // Next.js 15: cookies() is async
  const cookieStore = await cookies();

  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions = {}) {
          try {
            cookieStore.set(name, value, {
              ...options,
              path: "/",
            });
          } catch {
            // ignore – can fail in some runtimes
          }
        },
        remove(name: string, options: CookieOptions = {}) {
          try {
            cookieStore.set(name, "", {
              ...options,
              path: "/",
              maxAge: 0,
            });
          } catch {
            // ignore
          }
        },
      },
    }
  );
}

/**
 * Backwards-compat alias for existing code that imports
 * `getServerSupabaseAction`.
 */
export async function getServerSupabaseAction() {
  return getServerSupabase();
}

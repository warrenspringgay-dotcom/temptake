// src/lib/supabaseServer.ts
import { createServerClient as _createServerClient } from "@supabase/ssr";
import type { CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";

/**
 * Creates a Supabase server client safely in Next.js 15+ (await cookies())
 */
export async function createServerClient() {
  const cookieStore = await cookies(); // ✅ await required

  const supabase = _createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get: (name: string) => cookieStore.get(name)?.value,
        set: (name: string, value: string, options?: CookieOptions) => {
          try {
            cookieStore.set({ name, value, ...options });
          } catch {
            /* ignore */
          }
        },
        remove: (name: string, options?: CookieOptions) => {
          try {
            cookieStore.set({ name, value: "", ...options, maxAge: 0 });
          } catch {
            /* ignore */
          }
        },
      },
    }
  );

  return supabase;
}

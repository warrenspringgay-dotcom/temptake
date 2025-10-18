// src/lib/supabaseServer.ts
import "server-only";

import { cookies } from "next/headers";
import {
  createServerClient as createSupabaseServerClient,
  type CookieOptions,
} from "@supabase/ssr";

/**
 * Create a Supabase server client bound to Next.js cookies.
 * Note: In your Next version, cookies() is async → this function is async too.
 */
export async function createServerClient() {
  // In some Next versions cookies() is sync, in others it's a Promise.
  // This works for both:
  const cookieStore = await Promise.resolve(cookies() as any);

  return createSupabaseServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set(name: string, value: string, options?: CookieOptions) {
          cookieStore.set({ name, value, ...options });
        },
        remove(name: string, options?: CookieOptions) {
          cookieStore.set({ name, value: "", ...options, maxAge: 0 });
        },
      },
    }
  );
}

/** Back-compat helper many server actions already await */
export async function getServerSupabase() {
  return createServerClient();
}

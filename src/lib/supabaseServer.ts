// src/lib/supabaseServer.ts
import { cookies } from "next/headers";
import { createServerClient, type CookieOptions } from "@supabase/ssr";

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

/** Use inside Server Components / loaders (cannot modify cookies) */
export async function getServerSupabase() {
  const store = await cookies(); // OK to read in SC
  return createServerClient(URL, KEY, {
    cookies: {
      get(name: string) {
        return store.get(name)?.value;
      },
      // NO-OP writers so nothing tries to change cookies in SC
      set(_n: string, _v: string, _o?: CookieOptions) {},
      remove(_n: string, _o?: CookieOptions) {},
    },
  });
}

/** Use only inside "use server" actions or route handlers (can modify cookies) */
export async function getServerSupabaseAction() {
  const store = await cookies(); // In a Server Action this is writable
  return createServerClient(URL, KEY, {
    cookies: {
      get(name: string) {
        return store.get(name)?.value;
      },
      set(name: string, value: string, options?: CookieOptions) {
        // Allowed *only* in Server Actions / Route Handlers
        store.set({ name, value, ...options });
      },
      remove(name: string, options?: CookieOptions) {
        store.set({ name, value: "", ...options, maxAge: 0 });
      },
    },
  });
}

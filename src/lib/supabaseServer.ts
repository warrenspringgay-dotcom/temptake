// src/lib/supabaseServer.ts
import { cookies } from "next/headers";
import { createServerClient, type CookieOptions } from "@supabase/ssr";

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

/** Use inside Server Components / loaders (read-only cookies) */
export async function getServerSupabase() {
  const store = await cookies();
  return createServerClient(URL, KEY, {
    cookies: {
      get(name: string) {
        return store.get(name)?.value;
      },
      set(_n: string, _v: string, _o?: CookieOptions) {},
      remove(_n: string, _o?: CookieOptions) {},
    },
  });
}

/** Use only in Server Actions / route handlers (writable cookies) */
export async function getServerSupabaseAction() {
  const store = await cookies();
  return createServerClient(URL, KEY, {
    cookies: {
      get(name: string) {
        return store.get(name)?.value;
      },
      set(name: string, value: string, options?: CookieOptions) {
        store.set({ name, value, ...options });
      },
      remove(name: string, options?: CookieOptions) {
        store.set({ name, value: "", ...options, maxAge: 0 });
      },
    },
  });
}

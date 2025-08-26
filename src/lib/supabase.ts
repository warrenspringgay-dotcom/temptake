// src/lib/supabase.ts
import { createBrowserClient, createServerClient, type CookieOptions } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

/** Flag so callers can gracefully no-op if env is missing */
export const supabaseEnabled = Boolean(URL && KEY);

/** Create a new browser client (recommended for client components) */
export function supabaseBrowser(): SupabaseClient {
  if (!supabaseEnabled) {
    throw new Error("Supabase env vars missing: NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY");
  }
  return createBrowserClient(URL, KEY);
}

/**
 * Legacy export expected by older code (e.g., src/app/actions/db.ts).
 * Singleton browser client; safe in client components.
 * Avoid using this in server actions — prefer supabaseServer().
 */
export const supabase: SupabaseClient = supabaseBrowser();

/** The cookie adapter shape required by @supabase/ssr for server-side usage */
export type ServerCookieAdapter = {
  // Return the cookie value or null/undefined; can be sync or promise
  get(name: string): string | Promise<string | null | undefined> | null | undefined;
  // Return all cookies as name/value pairs
  getAll(): { name: string; value: string }[];
  // Set and remove (can be no-ops in server actions if cookies are read-only)
  set(name: string, value: string, options: CookieOptions): void;
  remove(name: string, options: CookieOptions): void;
};

/**
 * Server-side client factory.
 * Pass an object that implements ServerCookieAdapter.
 */
export function supabaseServer(cookieAdapter: ServerCookieAdapter): SupabaseClient {
  if (!supabaseEnabled) {
    throw new Error("Supabase env vars missing: NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY");
  }
  return createServerClient(URL, KEY, { cookies: cookieAdapter });
}

// src/lib/supabaseClient.ts
"use client";

import { createBrowserClient } from "@supabase/ssr";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

declare global {
  // eslint-disable-next-line no-var
  var __tt_supabase__: ReturnType<typeof createBrowserClient> | undefined;
}

/**
 * Factory function (some pages import this name specifically).
 */
export function createBrowserSupabase() {
  return createBrowserClient(SUPABASE_URL, SUPABASE_ANON_KEY);
}

/**
 * Convenience singleton (kept for existing code patterns).
 */
export const supabase = globalThis.__tt_supabase__ ?? createBrowserSupabase();

if (process.env.NODE_ENV !== "production") {
  globalThis.__tt_supabase__ = supabase;
}

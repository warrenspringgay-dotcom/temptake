// src/lib/supabase-server.ts
// Thin wrapper so files importing "@/lib/supabase-server" keep working.
// Re-uses the helper from "@/lib/supabaseServer".

import { createServerClient } from "@/lib/supabaseServer";
import type { SupabaseClient } from "@supabase/supabase-js";

/** Preferred: call this to get a server-side Supabase client */
export function supabaseServer(): SupabaseClient {
  return createServerClient();
}

// Also re-export in case some files import this name instead.
export { createServerClient } from "@/lib/supabaseServer";

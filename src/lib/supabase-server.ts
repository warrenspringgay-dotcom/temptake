// src/lib/supabase-server.ts
export { createServerClient } from "./supabaseServer";

// Optional alias for old code that imported { supabaseServer }
export const supabaseServer = createServerClient;

// src/lib/supabase-server.ts
// Back-compat alias used by older imports. IMPORTANT: import first, then alias.
import { getServerSupabase as _createServerClient } from "./supabaseServer";



export const createServerClient = _createServerClient; // re-export same name if you want
export const supabaseServer = _createServerClient;     // legacy alias some files used



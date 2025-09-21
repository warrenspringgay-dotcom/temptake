"use server";

import { supabaseServer } from "@/lib/supabase-server";

/** Use this anywhere you previously imported `ServerSupabase` */
export async function getSupabase() {
  return supabaseServer();
}

/* If you had anything like:
export async function someAction(...) {
  const supabase = await ServerSupabase();
  ...
}
…convert it to: */
export async function someAction(/* args */) {

  const supabase = await supabaseServer();
  // ... your logic
}

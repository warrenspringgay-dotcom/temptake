// src/app/actions/db.ts
"use server";

import { revalidatePath } from "next/cache";
import { getServerSupabase } from "@/lib/supabase-server";

/** Get cookie-aware Supabase client (server) */
export async function db() {
  return await getServerSupabase();
}

export { revalidatePath };

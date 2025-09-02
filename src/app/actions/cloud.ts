// src/app/actions/cloud.ts
"use server";

import { createSupabaseServerClient } from "@/lib/supabase-server";

/**
 * Get a Supabase server client (cookie-aware, Next 15 friendly).
 * Use this from other server actions if you need direct access.
 */
export async function getSupabase() {
  return await createSupabaseServerClient();
}

/**
 * Example: get a public URL from a Storage bucket.
 * (Safe no-op if bucket/path don’t exist.)
 */
export async function getPublicUrl(bucket: string, path: string): Promise<string | null> {
  try {
    const supabase = await createSupabaseServerClient();
    const { data } = supabase.storage.from(bucket).getPublicUrl(path);
    return data?.publicUrl ?? null;
  } catch {
    return null;
  }
}

/**
 * Example: verify the current user is signed in.
 * Returns the user id or null.
 */
export async function getCurrentUserId(): Promise<string | null> {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  return user?.id ?? null;
}

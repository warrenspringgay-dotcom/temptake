"use server";

import { getServerSupabase } from "@/lib/supabase-server";

/** Cookie-aware Supabase client for Server Components / Server Actions */
export async function getSupabase() {
  return getServerSupabase();
}

/** Storage helper: returns a public URL (or null if bucket/path missing). */
export async function getPublicUrl(
  bucket: string,
  path: string
): Promise<string | null> {
  try {
    const supabase = getServerSupabase();
    const { data } = supabase.storage.from(bucket).getPublicUrl(path);
    return data?.publicUrl ?? null;
  } catch {
    return null;
  }
}

/** Returns the current authenticated user id, or null. */
export async function getCurrentUserId(): Promise<string | null> {
  try {
    const supabase = getServerSupabase();
    const { data } = await supabase.auth.getUser();
    return data.user?.id ?? null;
  } catch {
    return null;
  }
}

// src/app/actions/cloud.ts
"use server";

import { getServerSupabase } from "@/lib/supabase-server";

/** Cookie-aware Supabase client for Server Components / Server Actions */
export async function getSupabase() {
  return await getServerSupabase();
}

/** Get a public URL for a file in a bucket. */
export async function getPublicUrl(bucket: string, path: string): Promise<string | null> {
  try {
    const supabase = await getServerSupabase();
    const { data } = supabase.storage.from(bucket).getPublicUrl(path);
    return data?.publicUrl ?? null;
  } catch {
    return null;
  }
}

/**
 * Upload a file (public) and return its public URL.
 * - `file` can be: File (Web), Blob, ArrayBuffer, or Uint8Array
 * - `contentType` e.g. "image/png" or "application/pdf"
 */
export async function uploadPublicFile(
  bucket: string,
  path: string,
  file: File | Blob | ArrayBuffer | Uint8Array,
  contentType?: string
): Promise<{ ok: true; path: string; publicUrl: string | null } | { ok: false; error: string }> {
  try {
    const supabase = await getServerSupabase();

    // No special narrowing needed: all allowed types are accepted by supabase-js.
    const body: File | Blob | ArrayBuffer | Uint8Array = file;

    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(path, body, { contentType, upsert: true });

    if (error) return { ok: false, error: error.message };

    const { data: pub } = supabase.storage.from(bucket).getPublicUrl(path);
    return { ok: true, path: data?.path ?? path, publicUrl: pub?.publicUrl ?? null };
  } catch (e: any) {
    return { ok: false, error: e?.message ?? "Upload failed" };
  }
}

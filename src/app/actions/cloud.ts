// src/app/actions/cloud.ts
"use server";

import { getServerSupabase } from "@/lib/supabase-server";

/** Cookie-aware Supabase client for Server Actions */
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

    let body: File | Blob | ArrayBuffer | Uint8Array;
    if (file instanceof Blob || file instanceof File) {
      body = file;
    } else if (file instanceof ArrayBuffer || file instanceof Uint8Array) {
      body = file;
    } else {
      body = file as any;
    }

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

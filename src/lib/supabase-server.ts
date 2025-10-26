// src/lib/supabase-server.ts
// Back-compat shim so older imports (`@/lib/supabase-server`) keep working
// regardless of how ./supabaseServer exports its server client factory.

import * as compat from "./supabaseServer";

type AnyFn = ((...args: any[]) => any) | undefined;

// Prefer a named `getServerClient`, fall back to `createServerClient`, then default export.
const exported = compat as unknown as {
  getServerClient?: AnyFn;
  createServerClient?: AnyFn;
  default?: AnyFn;
};

export const getServerClient: AnyFn =
  exported.getServerClient || exported.createServerClient || exported.default;

if (!getServerClient) {
  throw new Error(
    "supabase-server.ts: expected './supabaseServer' to export `getServerClient`, `createServerClient`, or a default function."
  );
}

export default getServerClient as (...args: any[]) => any;

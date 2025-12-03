// src/lib/supabaseAdmin.ts
import { createClient } from "@supabase/supabase-js";

const url = process.env.SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceKey) {
  console.error("supabaseAdmin env", { url, hasServiceKey: !!serviceKey });
  throw new Error(
    "supabaseAdmin: SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY is missing"
  );
}

export const supabaseAdmin = createClient(url, serviceKey, {
  auth: {
    persistSession: false,
  },
});

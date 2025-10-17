// src/lib/supabaseBrowser.ts
import { createBrowserClient } from "@supabase/ssr";

// This client automatically syncs the session into cookies via document.cookie,
// so the server/middleware can read it on every request.
export const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

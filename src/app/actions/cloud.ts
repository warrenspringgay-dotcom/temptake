"use server";
import { createServerClient } from "@/lib/supabaseServer";

export default async function Page() {
  const supabase = await createServerClient();
  // ...
}


/* If you had anything like:
export async function someAction(...) {
  const supabase = await ServerSupabase();
  ...
}
…convert it to: */
export async function someAction(/* args */) {

  const supabase = await createServerClient();
  // ... your logic
}

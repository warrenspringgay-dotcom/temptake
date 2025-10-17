// src/app/api/auth/session/route.ts
import { NextRequest, NextResponse } from "next/server";
import {
  createServerClient as createSupabaseServerClient,
  type CookieOptions,
} from "@supabase/ssr";

/**
 * Receives auth events from the browser (onAuthStateChange)
 * and updates server cookies so middleware/server components
 * can see the session.
 */
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const { event, session } = body as {
    event?: string;
    session?: {
      access_token?: string;
      refresh_token?: string;
    } | null;
  };

  const res = NextResponse.json({ ok: true });

  const supabase = createSupabaseServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get: (name: string) => req.cookies.get(name)?.value,
        set: (name: string, value: string, options?: CookieOptions) => {
          res.cookies.set({ name, value, ...options });
        },
        remove: (name: string, options?: CookieOptions) => {
          res.cookies.set({ name, value: "", ...options, expires: new Date(0) });
        },
      },
    }
  );

  try {
    if (event === "SIGNED_OUT" || !session) {
      await supabase.auth.signOut();
      return res;
    }

    if (session?.access_token && session?.refresh_token) {
      // This sets the sb-... cookies on the response
      await supabase.auth.setSession({
        access_token: session.access_token,
        refresh_token: session.refresh_token,
      });
    }
  } catch {
    // ignore – client will still be signed in, we just won't update cookies
  }

  return res;
}

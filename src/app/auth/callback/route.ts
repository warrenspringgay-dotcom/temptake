// src/app/auth/callback/route.ts
import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

async function capturePosthogServerEvent({
  distinctId,
  event,
  properties,
}: {
  distinctId: string;
  event: string;
  properties?: Record<string, any>;
}) {
  const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
  const host = process.env.NEXT_PUBLIC_POSTHOG_HOST || "https://app.posthog.com";

  // If you haven't configured PostHog env vars, just silently skip.
  if (!key) return;

  try {
    await fetch(`${host.replace(/\/$/, "")}/capture/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        api_key: key,
        event,
        distinct_id: distinctId,
        properties: {
          ...properties,
          $set: properties?.$set,
        },
      }),
    });
  } catch {
    // don't block auth callback if analytics fails
  }
}

function safeInternalPath(path: string | null | undefined) {
  if (!path) return "/dashboard";
  if (path.startsWith("/") && !path.startsWith("//")) return path;
  return "/dashboard";
}

export async function GET(req: NextRequest) {
  const url = new URL(req.url);

  const code = url.searchParams.get("code");
  const nextParam = url.searchParams.get("next");
  const next = safeInternalPath(nextParam);

  // Create response early so Supabase can attach cookies
  const res = NextResponse.redirect(new URL(next, url.origin));

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return req.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            res.cookies.set(name, value, options);
          });
        },
      },
    }
  );

  // If the user cancelled or code missing, just bounce to next
  if (!code) return res;

  const { error } = await supabase.auth.exchangeCodeForSession(code);

  // If exchange fails, send them back to login with a flag
  if (error) {
    return NextResponse.redirect(
      new URL(
        `/login?error=oauth&next=${encodeURIComponent(next)}`,
        url.origin
      )
    );
  }

  // Now we have a session, we can resolve the user
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user?.id) {
    // Capture Google login server-side (no browser SDK here)
    await capturePosthogServerEvent({
      distinctId: user.id,
      event: "user_logged_in",
      properties: {
        method: "google",
        email: user.email ?? null,
      },
    });
  }

  return res;
}

"use client";

import { ReactNode, useEffect } from "react";
import posthog from "posthog-js";
import { PostHogProvider, usePostHog } from "posthog-js/react";
import { usePathname, useSearchParams } from "next/navigation";

const POSTHOG_KEY = process.env.NEXT_PUBLIC_POSTHOG_KEY;
const POSTHOG_HOST =
  process.env.NEXT_PUBLIC_POSTHOG_HOST || "https://eu.i.posthog.com";

// Init on client only
if (typeof window !== "undefined" && POSTHOG_KEY) {
  if (!posthog.__loaded) {
    posthog.init(POSTHOG_KEY, {
      api_host: POSTHOG_HOST,
      capture_pageview: false, // we'll do manual pageviews
    });
  }
}

function PageViewTracker() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (!POSTHOG_KEY) return;
    posthog.capture("$pageview", {
      $current_url:
        typeof window !== "undefined" ? window.location.href : undefined,
      pathname,
      search: searchParams.toString(),
    });
  }, [pathname, searchParams]);

  return null;
}

export function PHProvider({ children }: { children: ReactNode }) {
  if (!POSTHOG_KEY) {
    // If key not set, just render children, no analytics
    return <>{children}</>;
  }

  return (
    <PostHogProvider client={posthog}>
      <PageViewTracker />
      {children}
    </PostHogProvider>
  );
}

// Optional hook re-export so you can just import from this file later
export { usePostHog } from "posthog-js/react";

// src/components/PosthogProvider.tsx
"use client";

import { ReactNode, useEffect } from "react";
import posthog from "posthog-js";
import { PostHogProvider } from "posthog-js/react";
import { usePathname, useSearchParams } from "next/navigation";

const POSTHOG_KEY = process.env.NEXT_PUBLIC_POSTHOG_KEY || "";
const POSTHOG_HOST =
  process.env.NEXT_PUBLIC_POSTHOG_HOST || "https://eu.posthog.com";

let posthogInitialized = false;

export function PHProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Init once on client
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!POSTHOG_KEY) return;
    if (posthogInitialized) return;

    posthog.init(POSTHOG_KEY, {
      api_host: POSTHOG_HOST,
      autocapture: true,
      capture_pageview: false, // we’ll do our own for App Router
      capture_pageleave: true,
      persistence: "localStorage",
    });

    posthogInitialized = true;
  }, []);

  // Track pageviews on route change
  useEffect(() => {
    if (!POSTHOG_KEY || !posthogInitialized) return;
    if (typeof window === "undefined") return;

    const url = window.location.pathname + window.location.search;
    posthog.capture("$pageview", {
      $current_url: url,
    });
  }, [pathname, searchParams]);

  if (!POSTHOG_KEY) {
    // Analytics disabled in this env – just render children
    return <>{children}</>;
  }

  return <PostHogProvider client={posthog}>{children}</PostHogProvider>;
}
// Optional hook re-export so you can just import from this file later
export { usePostHog } from "posthog-js/react";
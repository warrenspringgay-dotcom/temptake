// src/components/PosthogProvider.tsx
"use client";

import { ReactNode, useEffect } from "react";
import posthog from "posthog-js";
import { PostHogProvider } from "posthog-js/react";
import { usePathname, useSearchParams } from "next/navigation";

const POSTHOG_KEY = process.env.NEXT_PUBLIC_POSTHOG_KEY || "";
const POSTHOG_HOST =
  process.env.NEXT_PUBLIC_POSTHOG_HOST || "https://eu.posthog.com";

const CONSENT_KEY = "tt_consent_v1";

let posthogInitialized = false;

function readConsent(): { analytics: boolean } | null {
  try {
    const raw = localStorage.getItem(CONSENT_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function PHProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Init once on client, but default to opt-out (no tracking) until consent is granted.
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!POSTHOG_KEY) return;
    if (posthogInitialized) return;

    const consent = readConsent();
    const analyticsAllowed = !!consent?.analytics;

    posthog.init(POSTHOG_KEY, {
      api_host: POSTHOG_HOST,

      // 👇 compliance: do nothing until user opts in
      opt_out_capturing_by_default: true,

      // Never rely on autocapture pre-consent.
      // We'll switch it on after consent (see below).
      autocapture: false,

      capture_pageview: false, // we do our own for App Router
      capture_pageleave: true,

      // persistence can stay localStorage, but it won't be used for tracking until opted in
      persistence: "localStorage",
    });

    posthogInitialized = true;

    // If user already consented previously, enable capturing immediately
    if (analyticsAllowed) {
      posthog.opt_in_capturing();
      // optional: enable autocapture after opt-in
      posthog.set_config({ autocapture: true });
    } else {
      posthog.opt_out_capturing();
    }
  }, []);

  // Track pageviews on route change (only actually sends if opted in)
  useEffect(() => {
    if (!POSTHOG_KEY || !posthogInitialized) return;
    if (typeof window === "undefined") return;

    const url = window.location.pathname + window.location.search;
    posthog.capture("$pageview", {
      $current_url: url,
    });
  }, [pathname, searchParams]);

  if (!POSTHOG_KEY) {
    return <>{children}</>;
  }

  return <PostHogProvider client={posthog}>{children}</PostHogProvider>;
}

export { usePostHog } from "posthog-js/react";

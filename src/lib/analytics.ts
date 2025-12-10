// src/lib/analytics.ts
"use client";

import posthog from "posthog-js";

export function track(event: string, properties?: Record<string, any>) {
  try {
    posthog.capture(event, properties);
  } catch {
    // Fail silently – analytics should never break UX
  }
}

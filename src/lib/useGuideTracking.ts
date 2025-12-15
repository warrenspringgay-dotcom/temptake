// src/lib/useGuideTracking.ts
"use client";

import { useEffect } from "react";
import posthog from "posthog-js";

export function useGuideTracking(slug?: string) {
  useEffect(() => {
    posthog.capture("guide_viewed", {
      slug: slug ?? "index",
      path: window.location.pathname,
    });
  }, [slug]);

  useEffect(() => {
    let fired25 = false;
    let fired50 = false;
    let fired75 = false;

    function onScroll() {
      const scrollTop = window.scrollY;
      const docHeight =
        document.documentElement.scrollHeight - window.innerHeight;

      if (docHeight <= 0) return;

      const pct = scrollTop / docHeight;

      if (pct > 0.25 && !fired25) {
        fired25 = true;
        posthog.capture("guide_scroll_25");
      }
      if (pct > 0.5 && !fired50) {
        fired50 = true;
        posthog.capture("guide_scroll_50");
      }
      if (pct > 0.75 && !fired75) {
        fired75 = true;
        posthog.capture("guide_scroll_75");
      }
    }

    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
}

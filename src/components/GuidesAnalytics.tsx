// src/components/GuidesAnalytics.tsx
"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import posthog from "posthog-js";

export default function GuidesAnalytics({ slug }: { slug: string }) {
  const pathname = usePathname();

  // Page view tracking (fires on route changes too)
  useEffect(() => {
    posthog.capture("guide_viewed", {
      slug,
      path: pathname,
    });
  }, [slug, pathname]);

  // Scroll depth tracking (simple + effective)
  useEffect(() => {
    let fired25 = false;
    let fired50 = false;
    let fired75 = false;

    function onScroll() {
      const docHeight =
        document.documentElement.scrollHeight - window.innerHeight;
      if (docHeight <= 0) return;

      const pct = window.scrollY / docHeight;

      if (pct >= 0.25 && !fired25) {
        fired25 = true;
        posthog.capture("guide_scroll_25", { slug, path: pathname });
      }
      if (pct >= 0.5 && !fired50) {
        fired50 = true;
        posthog.capture("guide_scroll_50", { slug, path: pathname });
      }
      if (pct >= 0.75 && !fired75) {
        fired75 = true;
        posthog.capture("guide_scroll_75", { slug, path: pathname });
      }
    }

    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [slug, pathname]);

  // Click tracking for guide cards (delegated)
  useEffect(() => {
    function onClick(e: MouseEvent) {
      const el = (e.target as HTMLElement | null)?.closest?.(
        "[data-ph-guide-card='1']"
      ) as HTMLElement | null;

      if (!el) return;

      posthog.capture("guide_card_clicked", {
        slug,
        from: pathname,
        to: el.getAttribute("data-guide-href") || "",
        title: el.getAttribute("data-guide-title") || "",
        tag: el.getAttribute("data-guide-tag") || "",
      });
    }

    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, [slug, pathname]);

  return null;
}

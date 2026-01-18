"use client";

import { useEffect } from "react";
import posthog from "posthog-js";

const CONSENT_KEY = "tt_consent_v1";

function readConsent(): { analytics: boolean } | null {
  try {
    const raw = localStorage.getItem(CONSENT_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export default function ConsentBootstrap() {
  useEffect(() => {
    const consent = readConsent();

    // No choice yet -> do nothing (banner will show)
    if (!consent) return;

    if (consent.analytics) {
      // If your PHProvider already calls posthog.init, you can skip init here.
      // But we still want to make sure capture is enabled.
      posthog.opt_in_capturing?.();
    } else {
      // Hard stop: don't capture anything
      posthog.opt_out_capturing?.();
    }
  }, []);

  return null;
}

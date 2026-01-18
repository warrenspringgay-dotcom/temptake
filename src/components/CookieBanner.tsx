"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import posthog from "posthog-js";

const CONSENT_KEY = "tt_consent_v1";

function hasConsent() {
  try {
    return !!localStorage.getItem(CONSENT_KEY);
  } catch {
    return false;
  }
}

function setConsent(analytics: boolean) {
  localStorage.setItem(
    CONSENT_KEY,
    JSON.stringify({ analytics, updatedAt: new Date().toISOString() })
  );
}

export default function CookieBanner() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    setShow(!hasConsent());
  }, []);

  if (!show) return null;

  return (
    <div className="fixed bottom-3 left-3 right-3 z-[100] mx-auto max-w-3xl rounded-2xl border border-slate-200 bg-white p-4 shadow-xl">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-slate-700">
          We use essential cookies to keep TempTake working. With your permission,
          we also use analytics to understand usage.{" "}
          <Link href="/privacy" className="underline underline-offset-2">
            Privacy Policy
          </Link>{" "}
          and{" "}
          <Link href="/cookie-policy" className="underline underline-offset-2">
            Cookie Policy
          </Link>
          .
        </p>

        <div className="flex gap-2">
          <button
            onClick={() => {
              setConsent(false);
              posthog.opt_out_capturing?.();
              setShow(false);
            }}
            className="h-9 rounded-xl border border-slate-300 bg-white px-3 text-sm"
          >
            Reject
          </button>

          <button
            onClick={() => {
              setConsent(true);
              posthog.opt_in_capturing?.();
              // optionally capture the consent event:
              posthog.capture?.("cookie_consent_set", { analytics: true });
              setShow(false);
            }}
            className="h-9 rounded-xl bg-black px-3 text-sm text-white"
          >
            Accept analytics
          </button>
        </div>
      </div>
    </div>
  );
}

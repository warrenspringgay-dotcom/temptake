// src/components/CookieBanner.tsx
"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";

type ConsentState = "accepted" | "rejected" | null;

const STORAGE_KEY = "tt_cookie_consent_v1";

function getStoredConsent(): ConsentState {
  if (typeof window === "undefined") return null;
  const v = window.localStorage.getItem(STORAGE_KEY);
  if (v === "accepted" || v === "rejected") return v;
  return null;
}

function setStoredConsent(v: Exclude<ConsentState, null>) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, v);
}

export default function CookieBanner() {
  const [consent, setConsent] = useState<ConsentState>(null);
  const [show, setShow] = useState(false);

  useEffect(() => {
    const c = getStoredConsent();
    setConsent(c);
    setShow(c === null);
  }, []);

  function applyPosthog(choice: Exclude<ConsentState, null>) {
    // PostHog is optional. If it’s not present, we just store the preference.
    const ph = (window as any)?.posthog;
    try {
      if (ph?.opt_in_capturing && choice === "accepted") ph.opt_in_capturing();
      if (ph?.opt_out_capturing && choice === "rejected") ph.opt_out_capturing();
    } catch {
      // no-op: consent storage still works
    }
  }

  function onReject() {
    setStoredConsent("rejected");
    applyPosthog("rejected");
    setConsent("rejected");
    setShow(false);
  }

  function onAccept() {
    setStoredConsent("accepted");
    applyPosthog("accepted");
    setConsent("accepted");
    setShow(false);
  }

  if (!show) return null;

  return (
    <div
      // THIS is what your print CSS is looking for
      data-hide-on-print
      // extra class so we can target it if needed
      className="tt-cookie-banner fixed bottom-4 left-1/2 z-[9999] w-[min(920px,calc(100%-24px))] -translate-x-1/2"
    >
      <div className="rounded-2xl border border-slate-200 bg-white/95 p-4 shadow-lg backdrop-blur">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-slate-700">
            We use essential cookies to keep TempTake working. With your permission, we also use
            analytics to understand usage.{" "}
            <Link href="/privacy-policy" className="underline text-slate-900">
              Privacy Policy
            </Link>{" "}
            and{" "}
            <Link href="/cookie-policy" className="underline text-slate-900">
              Cookie Policy
            </Link>
            .
          </p>

          <div className="flex shrink-0 items-center justify-end gap-2">
            <button
              type="button"
              onClick={onReject}
              className="h-9 rounded-xl border border-slate-300 bg-white px-3 text-xs font-semibold text-slate-800 hover:bg-slate-50"
            >
              Reject
            </button>
            <button
              type="button"
              onClick={onAccept}
              className="h-9 rounded-xl bg-slate-900 px-3 text-xs font-semibold text-white hover:bg-slate-800"
            >
              Accept analytics
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

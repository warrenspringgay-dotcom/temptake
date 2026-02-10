// src/app/launch/LaunchClient.tsx
"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Script from "next/script";

function cls(...parts: Array<string | false | undefined>) {
  return parts.filter(Boolean).join(" ");
}

export default function LaunchClient({ tallyId }: { tallyId: string }) {
  const [showStickyCta, setShowStickyCta] = useState(false);

  useEffect(() => {
    const onScroll = () => setShowStickyCta(window.scrollY > 260);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const tallyAttrs = useMemo(
    () => ({
      "data-tally-open": tallyId,
      "data-tally-layout": "modal",
      "data-tally-emoji-text": "👋",
      "data-tally-emoji-animation": "wave",
      "data-tally-auto-close": "0",
    }),
    [tallyId]
  );

  function openTallyWaitlist() {
    try {
      (window as any)?.Tally?.openPopup?.(tallyId, {
        layout: "modal",
        emojiText: "👋",
        emojiAnimation: "wave",
        autoClose: 0,
      });
    } catch {
      // no-op
    }
  }

  return (
    <>
      <Script src="https://tally.so/widgets/embed.js" async />

      {/* Sticky CTA bar */}
      <div
        className={cls(
          "pointer-events-none fixed left-0 top-0 z-40 w-full transition-all duration-200",
          showStickyCta ? "translate-y-0 opacity-100" : "-translate-y-3 opacity-0"
        )}
      >
        <div className="pointer-events-auto border-b border-white/10 bg-slate-950/75 backdrop-blur-md">
          <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-3 px-4 py-2">
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-2xl bg-emerald-500 text-[11px] font-bold text-slate-950">
                TT
              </div>
              <div className="leading-tight">
                <div className="text-[12px] font-semibold text-slate-50">TempTake early access</div>
                <div className="text-[11px] text-slate-300">
                  Join the beta kitchens shaping the product.
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Link
                href="/demo"
                className="hidden rounded-2xl border border-white/20 bg-white/5 px-4 py-2 text-[11px] font-medium text-slate-50 hover:bg-white/10 sm:inline-flex"
              >
                View demo
              </Link>

              <button
                type="button"
                {...tallyAttrs}
                onClick={() => openTallyWaitlist()}
                className="inline-flex items-center justify-center rounded-2xl bg-gradient-to-r from-emerald-500 via-lime-500 to-emerald-500 px-4 py-2 text-[11px] font-semibold text-slate-950 shadow-lg shadow-emerald-500/30 transition hover:brightness-105"
              >
                Join early access
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

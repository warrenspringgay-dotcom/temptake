// src/components/WelcomeBanner.tsx
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

export default function WelcomeBanner() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const flag = localStorage.getItem("tt_welcome_pending");
      if (flag === "1") {
        setShow(true);
        localStorage.removeItem("tt_welcome_pending");
      }
    } catch {
      // ignore
    }
  }, []);

  if (!show) return null;

  return (
    <div className="mb-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
      <div className="flex items-start gap-3">
        <div className="mt-[2px] text-lg">🎉</div>
        <div className="flex-1">
          <div className="font-semibold">Welcome to TempTake!</div>
          <p className="mt-1">
            We’ve set up your organisation and default settings. You can update
            your business name and preferred location any time in{" "}
            <Link
              href="/settings"
              className="underline underline-offset-2 font-medium"
            >
              Settings
            </Link>
            . Need guidance? Visit the{" "}
            <Link
              href="/help"
              className="underline underline-offset-2 font-medium"
            >
              Help centre
            </Link>
            .
          </p>
        </div>
        <button
          type="button"
          className="ml-2 rounded-full px-2 py-1 text-xs text-emerald-900/70 hover:bg-emerald-100"
          onClick={() => setShow(false)}
        >
          Close
        </button>
      </div>
    </div>
  );
}

// src/app/four-week-review/error.tsx
"use client";

import React, { useEffect } from "react";

export default function FourWeekReviewError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[four-week-review] error", error);
  }, [error]);

  return (
    <div className="mx-auto max-w-2xl rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <h1 className="text-lg font-semibold text-slate-900">
        Four-week review failed to load
      </h1>
      <p className="mt-2 text-sm text-slate-600">
        The page crashed while rendering. If this persists, the Reports view is still
        available.
      </p>

      {error?.digest ? (
        <p className="mt-2 text-xs text-slate-500">Digest: {error.digest}</p>
      ) : null}

      <div className="mt-4 flex flex-wrap gap-2">
        <button
          onClick={reset}
          className="rounded-xl bg-black px-4 py-2 text-sm font-semibold text-white hover:bg-slate-900"
        >
          Try again
        </button>

        <a
          href="/reports?range=4w"
          className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-900 hover:bg-slate-50"
        >
          Open Reports
        </a>
      </div>
    </div>
  );
}

// src/components/PrintNowButton.tsx
"use client";

export default function PrintNowButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700"
    >
      Print now
    </button>
  );
}
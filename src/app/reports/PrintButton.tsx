// src/app/reports/PrintButton.tsx
"use client";

export default function PrintButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="rounded-lg border px-3 py-1.5 text-sm hover:bg-gray-50"
      aria-label="Print this report"
      title="Print"
    >
      Print
    </button>
  );
}

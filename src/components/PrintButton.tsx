// src/components/PrintButton.tsx
"use client";

export default function PrintButton({ className }: { className?: string }) {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className={className}
    >
      Print
    </button>
  );
}

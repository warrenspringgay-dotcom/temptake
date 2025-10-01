// src/components/PrintButton.tsx
"use client";

import React from "react";

export default function PrintButton({ className = "" }: { className?: string }) {
  return (
    <button
      type="button"
      className={className}
      onClick={() => window.print()}
      aria-label="Print"
      title="Print"
    >
      🖨️ Print
    </button>
  );
}

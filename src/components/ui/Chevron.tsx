// src/components/ui/Chevron.tsx
"use client";
import React from "react";

export default function Chevron({ open }: { open: boolean }) {
  return (
    <span
      className={`inline-block transition-transform ${open ? "rotate-90" : ""}`}
      aria-hidden
    >
      ▶
    </span>
  );
}

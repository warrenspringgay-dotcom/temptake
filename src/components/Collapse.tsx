// src/components/Collapse.tsx
"use client";
import React from "react";
import Chevron from "./ui/Chevron";

export default function Collapse({ title, children, defaultOpen = true }: { title: string; children: React.ReactNode; defaultOpen?: boolean; }) {
  const [open, setOpen] = React.useState(defaultOpen);
  return (
    <div className="rounded-xl border">
      <button type="button" className="flex w-full items-center justify-between px-3 py-2" onClick={() => setOpen((v) => !v)}>
        <span className="text-sm font-medium">{title}</span>
        <Chevron open={open} />
      </button>
      {open && <div className="border-t p-3">{children}</div>}
    </div>
  );
}

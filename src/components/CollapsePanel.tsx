"use client";

import * as React from "react";
import { cn } from "@/lib/cn";

type Props = {
  title: string;
  defaultOpen?: boolean;
  className?: string;
  headerClassName?: string;
  bodyClassName?: string;
  rightSlot?: React.ReactNode; // e.g. “Full entry form” button
  children: React.ReactNode;
};

export default function CollapsePanel({
  title,
  defaultOpen = false,
  className,
  headerClassName,
  bodyClassName,
  rightSlot,
  children,
}: Props) {
  const [open, setOpen] = React.useState(defaultOpen);

  return (
    <div
      className={cn(
        "rounded-2xl border bg-white shadow-sm",
        open ? "pb-2" : "pb-0",
        className,
      )}
    >
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className={cn(
          "flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left",
          headerClassName,
        )}
        aria-expanded={open}
      >
        <span
          className={cn(
            "inline-flex h-5 w-5 items-center justify-center rounded-full border text-xs",
            "transition-transform",
            open ? "rotate-90" : "rotate-0",
          )}
          aria-hidden
        >
          ▸
        </span>
        <span className="text-sm font-medium">{title}</span>
        <span className="ml-auto">{rightSlot}</span>
      </button>

      {open && (
        <div className={cn("px-4 pb-4", bodyClassName)}>
          {children}
        </div>
      )}
    </div>
  );
}

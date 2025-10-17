// src/components/ui/TableWrap.tsx
"use client";

import React from "react";

/**
 * Keeps long tables usable on phones (horizontal scroll)
 * while doing nothing special on larger screens.
 */
export default function TableWrap({ children }: { children: React.ReactNode }) {
  return (
    <div className="-mx-3 overflow-x-auto sm:mx-0">
      {/* set a sensible minimum so columns don't crush on phones */}
      <div className="min-w-[720px]">{children}</div>
    </div>
  );
}

// src/components/BrandLogo.tsx
"use client";

import React from "react";
import Image from "next/image";

type Props = { className?: string; size?: number };



export default function BrandLogo({ className, size = 28 }: { className?: string; size?: number }) {
  return (
    <Image
      src="/favicon.png" // ✅ must start with /
      alt="TempTake logo"
      width={size}
      height={size}
      className={className}
    />
  );
}
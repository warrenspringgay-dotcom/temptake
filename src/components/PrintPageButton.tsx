// src/components/PrintPageButton.tsx
"use client";

import React from "react";

type PrintPageButtonProps = {
  className?: string;
  children?: React.ReactNode;
};

export default function PrintPageButton({
  className,
  children = "Print template",
}: PrintPageButtonProps) {
  const handlePrint = () => {
    if (typeof window === "undefined") return;

    requestAnimationFrame(() => {
      window.setTimeout(() => {
        window.print();
      }, 80);
    });
  };

  return (
    <button type="button" onClick={handlePrint} className={className}>
      {children}
    </button>
  );
}
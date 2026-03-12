// src/components/AutoPrintOnLoad.tsx
"use client";

import { useEffect } from "react";

export default function AutoPrintOnLoad() {
  useEffect(() => {
    const run = () => {
      window.setTimeout(() => {
        window.print();
      }, 300);
    };

    if (document.readyState === "complete") {
      run();
    } else {
      window.addEventListener("load", run, { once: true });
      return () => window.removeEventListener("load", run);
    }
  }, []);

  return null;
}
"use client";

import { useEffect } from "react";

export default function ServiceWorkerRegister() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("serviceWorker" in navigator)) return;

    // Don’t register in dev on http:// unless you want to test it locally
    const isLocalhost = window.location.hostname === "localhost";
    const canRegister =
      window.location.protocol === "https:" || isLocalhost;

    if (!canRegister) return;

    // Register SW
    navigator.serviceWorker
      .register("/sw.js")
      .catch((err) => {
        // eslint-disable-next-line no-console
        console.warn("SW registration failed:", err);
      });
  }, []);

  return null;
}

"use client";

import { useEffect } from "react";

export default function ServiceWorkerRegister() {
  useEffect(() => {
    // If you want SW in dev too, delete this guard.
    if (process.env.NODE_ENV !== "production") return;

    if (!("serviceWorker" in navigator)) return;

    let refreshing = false;

    const onControllerChange = () => {
      if (refreshing) return;
      refreshing = true;
      window.location.reload();
    };

    navigator.serviceWorker.addEventListener("controllerchange", onControllerChange);

    (async () => {
      try {
        const reg = await navigator.serviceWorker.register("/sw.js");

        // Force check for updates
        reg.update();

        // If there's already an update waiting, activate it
        if (reg.waiting) {
          reg.waiting.postMessage({ type: "SKIP_WAITING" });
        }

        reg.addEventListener("updatefound", () => {
          const sw = reg.installing;
          if (!sw) return;
          sw.addEventListener("statechange", () => {
            if (sw.state === "installed" && navigator.serviceWorker.controller) {
              // New SW installed, take over
              reg.waiting?.postMessage({ type: "SKIP_WAITING" });
            }
          });
        });
      } catch (e) {
        // Silent fail: SW is optional.
      }
    })();

    return () => {
      navigator.serviceWorker.removeEventListener("controllerchange", onControllerChange);
    };
  }, []);

  return null;
}

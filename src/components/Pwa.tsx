"use client";

import { useEffect, useState } from "react";

export default function Pwa() {
  const [waitingWorker, setWaitingWorker] = useState<ServiceWorker | null>(null);
  const [showUpdate, setShowUpdate] = useState(false);

  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    let mounted = true;

    navigator.serviceWorker
      .register("/sw.js")
      .then((reg) => {
        // If there's already a waiting worker (rare, but happens)
        if (reg.waiting && mounted) {
          setWaitingWorker(reg.waiting);
          setShowUpdate(true);
        }

        // Listen for new SW installs
        reg.addEventListener("updatefound", () => {
          const sw = reg.installing;
          if (!sw) return;

          sw.addEventListener("statechange", () => {
            // Installed + there's an existing controller = update available
            if (sw.state === "installed" && navigator.serviceWorker.controller && mounted) {
              setWaitingWorker(sw);
              setShowUpdate(true);
            }
          });
        });
      })
      .catch(() => {
        /* ignore */
      });

    // Reload when the new SW takes control
    const onControllerChange = () => window.location.reload();
    navigator.serviceWorker.addEventListener("controllerchange", onControllerChange);

    return () => {
      mounted = false;
      navigator.serviceWorker.removeEventListener("controllerchange", onControllerChange);
    };
  }, []);

  function applyUpdate() {
    if (!waitingWorker) return;
    waitingWorker.postMessage({ type: "SKIP_WAITING" });
  }

  if (!showUpdate) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 z-[9999] mx-auto max-w-md rounded-2xl border border-slate-200 bg-white p-4 shadow-xl">
      <div className="text-sm font-semibold text-slate-900">Update available</div>
      <div className="mt-1 text-xs text-slate-600">
        A newer version of TempTake is ready. Refresh to get the latest fixes.
      </div>
      <div className="mt-3 flex gap-2">
        <button
          onClick={applyUpdate}
          className="rounded-xl bg-black px-3 py-2 text-xs font-semibold text-white"
        >
          Update now
        </button>
        <button
          onClick={() => setShowUpdate(false)}
          className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700"
        >
          Later
        </button>
      </div>
    </div>
  );
}

"use client";

import React, { useEffect, useMemo, useState } from "react";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
};

function isIosDevice() {
  if (typeof window === "undefined") return false;

  const ua = window.navigator.userAgent;
  const platform = window.navigator.platform;

  const iOS =
    /iPhone|iPad|iPod/i.test(ua) ||
    (platform === "MacIntel" && navigator.maxTouchPoints > 1);

  return iOS;
}

function isSafariBrowser() {
  if (typeof window === "undefined") return false;

  const ua = window.navigator.userAgent;
  const isSafari =
    /Safari/i.test(ua) &&
    !/CriOS/i.test(ua) &&
    !/FxiOS/i.test(ua) &&
    !/EdgiOS/i.test(ua) &&
    !/OPiOS/i.test(ua);

  return isSafari;
}

function isStandaloneMode() {
  if (typeof window === "undefined") return false;

  return (
    window.matchMedia?.("(display-mode: standalone)")?.matches ||
    // iOS Safari
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (window.navigator as any).standalone === true
  );
}

export default function InstallAppButton() {
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [showIosModal, setShowIosModal] = useState(false);
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    setInstalled(isStandaloneMode());

    const onBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setDeferredPrompt(event as BeforeInstallPromptEvent);
    };

    const onAppInstalled = () => {
      setInstalled(true);
      setDeferredPrompt(null);
      setShowIosModal(false);
    };

    window.addEventListener("beforeinstallprompt", onBeforeInstallPrompt);
    window.addEventListener("appinstalled", onAppInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstallPrompt);
      window.removeEventListener("appinstalled", onAppInstalled);
    };
  }, []);

  const env = useMemo(() => {
    const ios = isIosDevice();
    const safari = isSafariBrowser();
    const standalone = isStandaloneMode();

    return {
      ios,
      safari,
      standalone,
      canNativePrompt: !!deferredPrompt,
    };
  }, [deferredPrompt]);

  if (installed || env.standalone) return null;

  async function handleInstall() {
    // Android / browsers supporting beforeinstallprompt
    if (deferredPrompt) {
      try {
        await deferredPrompt.prompt();
        await deferredPrompt.userChoice;
      } catch (error) {
        console.error("Install prompt failed:", error);
      }
      return;
    }

    // iPhone/iPad Safari
    if (env.ios && env.safari) {
      setShowIosModal(true);
      return;
    }

    // iPhone/iPad but not Safari
    if (env.ios && !env.safari) {
      setShowIosModal(true);
      return;
    }

    // Fallback for anything else
    alert(
      "To install the app, use your browser menu and look for 'Install app' or open this site in Safari on iPhone and tap Share → Add to Home Screen."
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={handleInstall}
        className="inline-flex items-center justify-center rounded-2xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
      >
        Install app
      </button>

      {showIosModal ? (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl">
            <h2 className="text-lg font-bold text-slate-900">
              Install TempTake on your iPhone
            </h2>

            {env.ios && !env.safari ? (
              <p className="mt-3 text-sm leading-6 text-slate-600">
                Apple only lets you add web apps to the Home Screen properly from
                Safari. Open this page in Safari first, then follow the steps below.
              </p>
            ) : (
              <p className="mt-3 text-sm leading-6 text-slate-600">
                On iPhone, installation works through Safari’s Share menu rather
                than a normal browser install popup.
              </p>
            )}

            <ol className="mt-4 space-y-3 text-sm leading-6 text-slate-700">
              <li>
                <span className="font-semibold">1.</span> Tap the{" "}
                <span className="font-semibold">Share</span> button in Safari.
              </li>
              <li>
                <span className="font-semibold">2.</span> Scroll down and tap{" "}
                <span className="font-semibold">Add to Home Screen</span>.
              </li>
              <li>
                <span className="font-semibold">3.</span> Tap{" "}
                <span className="font-semibold">Add</span>.
              </li>
            </ol>

            <div className="mt-5 rounded-2xl bg-slate-50 px-4 py-3 text-xs leading-5 text-slate-600">
              Once added, TempTake will open like an app from the Home Screen.
            </div>

            <div className="mt-6 flex gap-3">
              <button
                type="button"
                onClick={() => setShowIosModal(false)}
                className="inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-900 hover:bg-slate-50"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
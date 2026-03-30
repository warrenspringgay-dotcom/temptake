"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseBrowser";
import { useAuth } from "@/components/AuthProvider";

function initialsFromEmail(email?: string | null) {
  if (!email) return "?";
  const part = email.split("@")[0] || "";
  const chars = part.replace(/[^a-z0-9]/gi, "").slice(0, 2);
  return (chars || "?").toUpperCase();
}

function itemCls(disabled?: boolean) {
  return [
    "block rounded-lg px-3 py-2",
    disabled ? "text-gray-400 cursor-not-allowed" : "hover:bg-gray-50",
  ].join(" ");
}

function isIOS() {
  if (typeof window === "undefined") return false;

  const ua = window.navigator.userAgent || "";
  const platform = window.navigator.platform || "";

  return (
    /iPad|iPhone|iPod/.test(ua) ||
    (platform === "MacIntel" && window.navigator.maxTouchPoints > 1)
  );
}

function isSafariBrowser() {
  if (typeof window === "undefined") return false;

  const ua = window.navigator.userAgent || "";

  return (
    /Safari/i.test(ua) &&
    !/CriOS/i.test(ua) &&
    !/FxiOS/i.test(ua) &&
    !/EdgiOS/i.test(ua) &&
    !/OPiOS/i.test(ua)
  );
}

function isStandalone() {
  if (typeof window === "undefined") return false;
  const iosStandalone = (window.navigator as Navigator & { standalone?: boolean }).standalone === true;
  const displayModeStandalone =
    window.matchMedia &&
    window.matchMedia("(display-mode: standalone)").matches;
  return iosStandalone || displayModeStandalone;
}

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
};

export default function UserMenu() {
  const router = useRouter();
  const pathname = usePathname();
  const { user, ready } = useAuth();

  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [canInstall, setCanInstall] = useState(false);
  const [standalone, setStandalone] = useState(false);
  const [ios, setIos] = useState(false);
  const [safari, setSafari] = useState(false);
  const [showIosInstallHelp, setShowIosInstallHelp] = useState(false);

  useEffect(() => setOpen(false), [pathname]);

  useEffect(() => {
    if (!open) return;

    function handleClickOutside(e: MouseEvent) {
      if (!menuRef.current) return;
      if (!menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    setIos(isIOS());
    setSafari(isSafariBrowser());
    setStandalone(isStandalone());

    function handler(e: Event) {
      e.preventDefault();
      const bip = e as BeforeInstallPromptEvent;
      setDeferredPrompt(bip);
      setCanInstall(true);
    }

    function onInstalled() {
      setStandalone(true);
      setDeferredPrompt(null);
      setCanInstall(false);
      setShowIosInstallHelp(false);
    }

    window.addEventListener("beforeinstallprompt", handler);
    window.addEventListener("appinstalled", onInstalled);

    const mm = window.matchMedia?.("(display-mode: standalone)");
    const onChange = () => setStandalone(isStandalone());
    mm?.addEventListener?.("change", onChange);

    return () => {
      window.removeEventListener("beforeinstallprompt", handler);
      window.removeEventListener("appinstalled", onInstalled);
      mm?.removeEventListener?.("change", onChange);
    };
  }, []);

  const email = user?.email ?? null;
  const inits = useMemo(() => initialsFromEmail(email), [email]);

  async function signOut() {
    await supabase.auth.signOut();
    setOpen(false);
    router.replace("/login");
    router.refresh();
  }

  async function handleInstallClick() {
    setOpen(false);

    if (standalone) {
      router.push("/dashboard");
      return;
    }

    if (deferredPrompt) {
      try {
        await deferredPrompt.prompt();
        const choice = await deferredPrompt.userChoice;
        setDeferredPrompt(null);
        setCanInstall(false);

        if (choice.outcome !== "accepted") {
          router.push("/dashboard");
        }
      } catch {
        router.push("/dashboard");
      }
      return;
    }

    if (ios) {
      setShowIosInstallHelp(true);
      return;
    }

    router.push("/dashboard");
  }

  if (!ready) {
    return (
      <div
        className="h-9 w-9 rounded-full border bg-white/80"
        aria-hidden="true"
      />
    );
  }

  if (!user) {
    return (
      <Link
        href="/login"
        className="rounded-lg bg-black px-3 py-2 text-xs font-medium text-white hover:bg-gray-900"
      >
        Sign in
      </Link>
    );
  }

  return (
    <>
      <div className="relative" ref={menuRef}>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="inline-flex h-9 w-9 items-center justify-center rounded-full border bg-white text-xs font-semibold hover:bg-gray-50"
          title={email ?? "Signed in"}
          aria-haspopup="menu"
          aria-expanded={open}
        >
          {inits}
        </button>

        {open && (
          <div
            role="menu"
            className="absolute right-0 mt-2 w-72 overflow-hidden rounded-2xl border bg-white shadow-lg"
          >
            <div className="border-b px-4 py-3">
              <div className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">
                Signed in as
              </div>
              <div className="truncate text-sm font-semibold text-gray-900">
                {email ?? "—"}
              </div>
            </div>

            <div className="p-2 text-sm">
              <Link href="/settings" className={itemCls()} role="menuitem">
                Settings
              </Link>

              <Link href="/feedback" className={itemCls()} role="menuitem">
                My feedback
              </Link>

              <Link href="/food-hygiene" className={itemCls()} role="menuitem">
                Food hygiene rating log
              </Link>

              <Link href="/locations" className={itemCls()} role="menuitem">
                Locations
              </Link>

              <Link href="/haccp-procedures" className={itemCls()} role="menuitem">
                HACCP procedures
              </Link>

              <Link href="/billing" className={itemCls()} role="menuitem">
                Billing &amp; subscription
              </Link>

              <Link href="/templates" className={itemCls()} role="menuitem">
                Templates
              </Link>

              <Link href="/guides" className={itemCls()} role="menuitem">
                Guides
              </Link>

              <Link href="/help" className={itemCls()} role="menuitem">
                Help &amp; support
              </Link>

              <button
                type="button"
                onClick={handleInstallClick}
                className={itemCls(false) + " w-full text-left"}
                role="menuitem"
                title={
                  standalone
                    ? "App is already installed"
                    : canInstall
                    ? "Install the app"
                    : ios
                    ? safari
                      ? "Install via Add to Home Screen"
                      : "Open in Safari to install"
                    : "Get the app"
                }
              >
                {standalone
                  ? "App installed"
                  : canInstall
                  ? "Install app"
                  : ios
                  ? "Install app"
                  : "Get the app"}
              </button>

              <div className="my-2 border-t" />

              <button
                type="button"
                onClick={signOut}
                className="block w-full rounded-lg px-3 py-2 text-left text-red-700 hover:bg-red-50"
                role="menuitem"
              >
                Sign out
              </button>
            </div>
          </div>
        )}
      </div>

      {showIosInstallHelp && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={() => setShowIosInstallHelp(false)}
        >
          <div
            className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="text-lg font-semibold text-gray-900">
              Install TempTake
            </div>

            {safari ? (
              <div className="mt-3 space-y-2 text-sm text-gray-600">
                <p>On iPhone or iPad:</p>
                <p>1. Tap the Share button in Safari</p>
                <p>2. Scroll down and tap “Add to Home Screen”</p>
                <p>3. Tap “Add”</p>
              </div>
            ) : (
              <div className="mt-3 space-y-2 text-sm text-gray-600">
                <p>On Apple devices, TempTake needs to be installed from Safari.</p>
                <p>1. Open this page in Safari</p>
                <p>2. Tap the Share button</p>
                <p>3. Tap “Add to Home Screen”</p>
              </div>
            )}

            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowIosInstallHelp(false)}
                className="rounded-lg border px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowIosInstallHelp(false);
                  router.push("/dashboard");
                }}
                className="rounded-lg bg-black px-3 py-2 text-sm font-medium text-white hover:bg-gray-900"
              >
                Open app
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
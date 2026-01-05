// src/components/UserMenu.tsx
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
  return /iPad|iPhone|iPod/.test(ua) && !(window as any).MSStream;
}

function isStandalone() {
  if (typeof window === "undefined") return false;
  const iosStandalone = (window.navigator as any).standalone === true;
  const displayModeStandalone =
    window.matchMedia &&
    window.matchMedia("(display-mode: standalone)").matches;
  return iosStandalone || displayModeStandalone;
}

// Type for the PWA install prompt event (not in TS lib by default)
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

  // PWA install support
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [canInstall, setCanInstall] = useState(false);
  const [standalone, setStandalone] = useState(false);
  const [ios, setIos] = useState(false);

  // Close on route change
  useEffect(() => setOpen(false), [pathname]);

  // Close on click outside or Escape
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

  // Capture install prompt on supported browsers (mostly Android Chrome/Edge)
  useEffect(() => {
    if (typeof window === "undefined") return;

    setIos(isIOS());
    setStandalone(isStandalone());

    function handler(e: Event) {
      // Stop Chrome from showing its mini-infobar automatically
      e.preventDefault();
      const bip = e as BeforeInstallPromptEvent;
      setDeferredPrompt(bip);
      setCanInstall(true);
    }

    window.addEventListener("beforeinstallprompt", handler);

    const mm = window.matchMedia?.("(display-mode: standalone)");
    const onChange = () => setStandalone(isStandalone());
    mm?.addEventListener?.("change", onChange);

    return () => {
      window.removeEventListener("beforeinstallprompt", handler);
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
    // Close menu immediately for a cleaner UX
    setOpen(false);

    // If already installed, take them to the product.
    if (standalone) {
      router.push("/dashboard");
      return;
    }

    // iOS: no prompt API. Route to dashboard (no /app fallback).
    if (ios && !deferredPrompt) {
      router.push("/dashboard");
      return;
    }

    // Supported install prompt
    if (deferredPrompt) {
      try {
        await deferredPrompt.prompt();
        const choice = await deferredPrompt.userChoice;

        // Chrome controls re-firing of beforeinstallprompt.
        // Once used, clear it.
        setDeferredPrompt(null);
        setCanInstall(false);

        // If dismissed, route back to dashboard.
        if (choice.outcome !== "accepted") {
          router.push("/dashboard");
        }
      } catch {
        router.push("/dashboard");
      }
      return;
    }

    // Fallback: route to dashboard
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

            <Link href="/food-hygiene" className={itemCls()} role="menuitem">
              Food hygiene rating log
            </Link>

            <Link href="/locations" className={itemCls()} role="menuitem">
              Locations
            </Link>

            <Link href="/billing" className={itemCls()} role="menuitem">
              Billing &amp; subscription
            </Link>

            <Link href="/guides" className={itemCls()} role="menuitem">
              Guides
            </Link>

            <Link href="/help" className={itemCls()} role="menuitem">
              Help &amp; support
            </Link>

            {/* ✅ Install/Get app: triggers PWA prompt when possible, otherwise routes to dashboard */}
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
                  ? "Install via Add to Home Screen"
                  : "Get the app"
              }
            >
              {standalone ? "App installed" : canInstall ? "Install app" : "Get the app"}
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
  );
}

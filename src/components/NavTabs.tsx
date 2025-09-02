// src/components/NavTabs.tsx
"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";
import { signOutAction } from "@/app/actions/auth";

type NavTabsProps = {
  brandName?: string;
  brandAccent?: string;
  logoUrl?: string;
};

const tabs = [
  { href: "/", label: "Dashboard" },
  { href: "/allergens", label: "Allergens" },
  { href: "/team", label: "Team" },
  { href: "/suppliers", label: "Suppliers" },
  { href: "/reports", label: "Reports" },
];

export default function NavTabs({
  brandName = "TempTake",
  brandAccent = "blue",
  logoUrl = "/temptake-192.png",
}: NavTabsProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [open, setOpen] = useState(false);        // mobile nav
  const [userOpen, setUserOpen] = useState(false); // user dropdown
  const [userEmail, setUserEmail] = useState<string | null>(null);

  const navRef = useRef<HTMLDivElement | null>(null);
  const userRef = useRef<HTMLDivElement | null>(null);

  // Active link helper
  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(href + "/");

  // Close menus on outside click
  useEffect(() => {
    function onDoc(e: MouseEvent) {
      const target = e.target as Node;
      if (navRef.current && !navRef.current.contains(target)) setOpen(false);
      if (userRef.current && !userRef.current.contains(target)) setUserOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  // Get current user (client-side) to show email/login buttons
  useEffect(() => {
    let mounted = true;
    supabase.auth.getUser().then(({ data }) => {
      if (!mounted) return;
      setUserEmail(data.user?.email ?? null);
    });
    // also listen to auth changes so menu stays in sync after sign-in/out
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setUserEmail(session?.user?.email ?? null);
    });
    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  const redirectParam = searchParams.get("redirect") || pathname || "/";

  return (
    <nav className="sticky top-0 z-50 bg-white border-b border-gray-200">
      <div ref={navRef} className="mx-auto max-w-6xl flex items-center justify-between px-4 py-2">
        {/* Logo + brand */}
        <Link href="/" className="flex items-center gap-2">
          <Image src={logoUrl} alt={`${brandName} logo`} width={28} height={28} />
          <span className="font-semibold text-slate-900">{brandName}</span>
        </Link>

        {/* Desktop nav */}
        <div className="hidden md:flex gap-1 sm:gap-2">
          {tabs.map((tab) => {
            const active = isActive(tab.href);
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={`px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                  active
                    ? "text-blue-600 bg-blue-50"
                    : "text-slate-600 hover:text-slate-900 hover:bg-gray-50"
                }`}
              >
                {tab.label}
              </Link>
            );
          })}
        </div>

        {/* Desktop user menu */}
        <div ref={userRef} className="hidden md:flex items-center gap-2">
          {userEmail ? (
            <div className="relative">
              <button
                onClick={() => setUserOpen((v) => !v)}
                className="inline-flex items-center gap-2 rounded-md px-2.5 py-1.5 text-sm text-slate-700 hover:bg-gray-100"
                aria-haspopup="menu"
                aria-expanded={userOpen}
              >
                <span className="inline-block h-6 w-6 rounded-full bg-gray-200 text-gray-700 grid place-items-center text-xs">
                  {userEmail.charAt(0).toUpperCase()}
                </span>
                <span className="max-w-[160px] truncate">{userEmail}</span>
                <svg className="h-4 w-4 opacity-60" viewBox="0 0 20 20" fill="currentColor">
                  <path
                    fillRule="evenodd"
                    d="M5.23 7.21a.75.75 0 011.06.02L10 10.94l3.71-3.71a.75.75 0 111.06 1.06l-4.24 4.25a.75.75 0 01-1.06 0L5.21 8.29a.75.75 0 01.02-1.08z"
                    clipRule="evenodd"
                  />
                </svg>
              </button>

              {userOpen && (
                <div
                  role="menu"
                  className="absolute right-0 mt-2 w-48 rounded-md border bg-white shadow-sm overflow-hidden"
                >
                  <Link
                    href="/settings"
                    className="block px-3 py-2 text-sm text-slate-700 hover:bg-gray-50"
                    onClick={() => setUserOpen(false)}
                  >
                    Settings
                  </Link>
                  <form action={signOutAction}>
                    <button className="w-full text-left px-3 py-2 text-sm text-slate-700 hover:bg-gray-50">
                      Sign out
                    </button>
                  </form>
                </div>
              )}
            </div>
          ) : (
            <Link
              href={`/login?redirect=${encodeURIComponent(redirectParam)}`}
              className="rounded-md px-3 py-1.5 text-sm text-slate-700 hover:bg-gray-100"
            >
              Sign in
            </Link>
          )}
        </div>

        {/* Mobile hamburger */}
        <button
          onClick={() => setOpen((v) => !v)}
          className="md:hidden inline-flex items-center justify-center p-2 rounded-md text-slate-600 hover:text-slate-900 hover:bg-gray-100"
          aria-label="Toggle menu"
          aria-expanded={open}
        >
          <svg className="h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            {open ? (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            ) : (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            )}
          </svg>
        </button>
      </div>

      {/* Mobile dropdown (nav + user) */}
      {open && (
        <div className="md:hidden border-t border-gray-200 bg-white">
          {/* user row */}
          <div className="px-4 py-2 flex items-center justify-between">
            {userEmail ? (
              <>
                <div className="flex items-center gap-2">
                  <span className="inline-block h-7 w-7 rounded-full bg-gray-200 text-gray-700 grid place-items-center text-sm">
                    {userEmail.charAt(0).toUpperCase()}
                  </span>
                  <span className="text-sm text-slate-700">{userEmail}</span>
                </div>
                <form action={signOutAction}>
                  <button className="rounded-md px-3 py-1.5 text-sm text-slate-700 hover:bg-gray-100">
                    Sign out
                  </button>
                </form>
              </>
            ) : (
              <Link
                href={`/login?redirect=${encodeURIComponent(redirectParam)}`}
                className="rounded-md px-3 py-1.5 text-sm text-slate-700 hover:bg-gray-100"
                onClick={() => setOpen(false)}
              >
                Sign in
              </Link>
            )}
          </div>

          {/* links */}
          <div className="border-t border-gray-200">
            {tabs.map((tab) => {
              const active = isActive(tab.href);
              return (
                <Link
                  key={tab.href}
                  href={tab.href}
                  className={`block px-4 py-2 text-sm ${
                    active ? "text-blue-600 bg-blue-50" : "text-slate-600 hover:text-slate-900 hover:bg-gray-50"
                  }`}
                  onClick={() => setOpen(false)}
                >
                  {tab.label}
                </Link>
              );
            })}
          </div>
        </div>
      )}
    </nav>
  );
}

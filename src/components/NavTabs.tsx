// src/components/NavTabs.tsx
"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";

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
  logoUrl = "/icon.png",
}: NavTabsProps) {
  const pathname = usePathname();
  const router = useRouter();

  const [open, setOpen] = useState(false);
  const [userOpen, setUserOpen] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);

  const navRef = useRef<HTMLDivElement | null>(null);

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(href + "/");

  // close user menu when clicking outside
  useEffect(() => {
    function onDoc(e: MouseEvent) {
      const target = e.target as Node;
      if (navRef.current && !navRef.current.contains(target)) setUserOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  // close menus on route change
  useEffect(() => {
    setOpen(false);
    setUserOpen(false);
  }, [pathname]);

  // keep session email in state
  useEffect(() => {
    let mounted = true;

    supabase.auth.getUser().then(({ data }) => {
      if (!mounted) return;
      setUserEmail(data.user?.email ?? null);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setUserEmail(session?.user?.email ?? null);
      router.refresh(); // keep server-rendered bits (like nav) in sync
    });

    return () => {
      mounted = false;
      // guard for older client types
      // @ts-expect-error older types
      sub?.subscription?.unsubscribe?.();
      // @ts-expect-error newer types
      sub?.unsubscribe?.();
    };
  }, [router]);

  async function signOutClient() {
    try {
      await supabase.auth.signOut();
    } finally {
      setUserOpen(false);
      setOpen(false);
      router.refresh();
      router.push("/login");
    }
  }

  return (
    <nav className="sticky top-0 z-50 bg-white border-b border-gray-200">
      <div className="mx-auto max-w-6xl flex items-center justify-between px-4 py-2">
        {/* Brand */}
        <Link href="/" className="flex items-center gap-2">
          <Image src={logoUrl} alt={`${brandName} logo`} width={28} height={28} />
          <span className="font-semibold text-slate-900">{brandName}</span>
        </Link>

        {/* Desktop links */}
        <div className="hidden md:flex gap-1 sm:gap-2">
          {tabs.map((t) => {
            const active = isActive(t.href);
            return (
              <Link
                key={t.href}
                href={t.href}
                className={`px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                  active
                    ? "text-blue-600 bg-blue-50"
                    : "text-slate-600 hover:text-slate-900 hover:bg-gray-50"
                }`}
              >
                {t.label}
              </Link>
            );
          })}
        </div>

        {/* Desktop auth area */}
        <div ref={navRef} className="hidden md:flex items-center gap-2">
          {userEmail ? (
            <div className="relative">
              <button
                onClick={() => setUserOpen((v) => !v)}
                className="inline-flex items-center gap-2 rounded-md px-2.5 py-1.5 text-sm text-slate-700 hover:bg-gray-100"
                aria-haspopup="menu"
                aria-expanded={userOpen}
              >
                <span className="inline-grid place-items-center h-6 w-6 rounded-full bg-gray-200 text-gray-700 text-xs">
                  {userEmail.charAt(0).toUpperCase()}
                </span>
                <span className="max-w-[160px] truncate">{userEmail}</span>
                <svg className="h-4 w-4 opacity-60" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
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
                  className="absolute right-0 mt-2 w-48 rounded-md border bg-white shadow-sm overflow-hidden z-[60]"
                >
                  <Link href="/settings" className="block px-3 py-2 text-sm text-slate-700 hover:bg-gray-50">
                    Settings
                  </Link>
                  <button
                    onClick={signOutClient}
                    className="w-full text-left px-3 py-2 text-sm text-slate-700 hover:bg-gray-50"
                  >
                    Sign out
                  </button>
                </div>
              )}
            </div>
          ) : (
            <Link
              href="/login"
              className="rounded-md border px-3 py-1.5 text-sm text-slate-700 hover:bg-gray-50"
            >
              Login
            </Link>
          )}
        </div>

        {/* Mobile toggle */}
        <button
          onClick={() => setOpen(true)}
          className="md:hidden inline-flex items-center justify-center p-2 rounded-md text-slate-600 hover:text-slate-900 hover:bg-gray-100"
          aria-label="Open menu"
          aria-expanded={open}
        >
          <svg className="h-6 w-6" viewBox="0 0 24 24" stroke="currentColor" fill="none" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
      </div>

      {/* Mobile sheet */}
      {open && (
        <div className="fixed inset-0 z-[100] bg-white/95 backdrop-blur-sm" role="dialog" aria-modal="true">
          <div className="flex items-center justify-between px-4 py-3 border-b">
            <div className="flex items-center gap-2">
              <Image src={logoUrl} alt={`${brandName} logo`} width={24} height={24} />
              <span className="font-semibold text-slate-900">{brandName}</span>
            </div>
            <button
              onClick={() => setOpen(false)}
              className="inline-flex items-center justify-center p-2 rounded-md text-slate-600 hover:text-slate-900 hover:bg-gray-100"
              aria-label="Close menu"
            >
              <svg className="h-6 w-6" viewBox="0 0 24 24" stroke="currentColor" fill="none">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Mobile header auth row */}
          <div className="px-4 py-3 border-b flex items-center justify-between">
            {userEmail ? (
              <>
                <div className="flex items-center gap-2">
                  <span className="inline-grid place-items-center h-7 w-7 rounded-full bg-gray-200 text-gray-700 text-sm">
                    {userEmail.charAt(0).toUpperCase()}
                  </span>
                  <span className="text-sm text-slate-700">{userEmail}</span>
                </div>
                <button
                  onClick={signOutClient}
                  className="rounded-md px-3 py-1.5 text-sm text-slate-700 hover:bg-gray-100"
                >
                  Sign out
                </button>
              </>
            ) : (
              <Link
                href="/login"
                onClick={() => setOpen(false)}
                className="rounded-md border px-3 py-1.5 text-sm text-slate-700 hover:bg-gray-100"
              >
                Login
              </Link>
            )}
          </div>

          <div className="px-2 py-2">
            {tabs.map((t) => {
              const active = isActive(t.href);
              return (
                <Link
                  key={t.href}
                  href={t.href}
                  onClick={() => setOpen(false)}
                  className={`block rounded-lg px-3 py-3 text-base ${
                    active ? "text-blue-700 bg-blue-50" : "text-slate-700 hover:bg-gray-100"
                  }`}
                >
                  {t.label}
                </Link>
              );
            })}
          </div>
        </div>
      )}
    </nav>
  );
}

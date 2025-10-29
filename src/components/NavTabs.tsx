"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Menu } from "lucide-react";
import { supabase } from "@/lib/supabaseBrowser";

type Tab = { href: string; label: string };

const TABS: Tab[] = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/routines", label: "Routines" },
  { href: "/allergens", label: "Allergens" },
  { href: "/cleaning-rota", label: "Cleaning Rota" },
  { href: "/team", label: "Team" },
  { href: "/suppliers", label: "Suppliers" },
  { href: "/reports", label: "Reports" },
];

export default function NavTabs() {
  const pathname = usePathname();

  // auth (client-side)
  const [email, setEmail] = useState<string | null>(null);
  useEffect(() => {
    let mounted = true;
    (async () => {
      const { data } = await supabase.auth.getUser();
      if (!mounted) return;
      setEmail(data.user?.email ?? null);
    })();
    const { data: sub } = supabase.auth.onAuthStateChange(async () => {
      const { data } = await supabase.auth.getUser();
      setEmail(data.user?.email ?? null);
    });
    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  // menu dropdown (top-right)
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    function onDown(e: MouseEvent) {
      if (!menuRef.current) return;
      if (!menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setMenuOpen(false);
    }
    if (menuOpen) {
      document.addEventListener("mousedown", onDown);
      document.addEventListener("keydown", onKey);
    }
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [menuOpen]);

  // mobile panel
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b bg-white">
      {/* Top bar: logo (left), centered brand, user/menu on right */}
      <div className="mx-auto grid h-12 max-w-screen-2xl grid-cols-3 items-center px-3 sm:px-4">
        {/* left: logo + brand (clickable) */}
        <Link href="/dashboard" className="flex items-center gap-2">
          {/* Your logo restored */}
          <Image src="/logo.png" alt="TempTake" width={24} height={24} />
          <span className="hidden sm:inline font-semibold">TempTake</span>
        </Link>

        {/* center spacer (keeps right pill aligned while logo stays left) */}
        <div className="flex items-center justify-center">
          {/* nothing needed here; tabs are on the second row */}
        </div>

        {/* right: account/menu */}
        <div className="ml-auto flex items-center justify-end gap-2">
          {/* Menu button (desktop & mobile) */}
          <div className="relative" ref={menuRef}>
            <button
              onClick={() => setMenuOpen((v) => !v)}
              className="inline-flex items-center gap-2 rounded-xl border px-3 py-1.5 text-sm hover:bg-gray-50"
              aria-expanded={menuOpen}
              aria-haspopup="menu"
            >
              <Menu className="h-4 w-4" />
              {email ? (
                <span className="hidden sm:block">{email}</span>
              ) : (
                <span className="hidden sm:block">Menu</span>
              )}
            </button>

            {menuOpen && (
              <div
                role="menu"
                className="absolute right-0 mt-2 w-56 overflow-hidden rounded-xl border bg-white shadow-xl"
              >
                <Link
                  href="/help"
                  className="block px-3 py-2 text-sm hover:bg-gray-50"
                  onClick={() => setMenuOpen(false)}
                >
                  Help
                </Link>
                <Link
                  href="/settings"
                  className="block px-3 py-2 text-sm hover:bg-gray-50"
                  onClick={() => setMenuOpen(false)}
                >
                  Settings
                </Link>
                {email ? (
                  <form
                    action="/logout"
                    method="post"
                    className="border-t"
                    onSubmit={() => setMenuOpen(false)}
                  >
                    <button className="block w-full px-3 py-2 text-left text-sm hover:bg-gray-50">
                      Sign out
                    </button>
                  </form>
                ) : (
                  <Link
                    href="/login"
                    className="block border-t px-3 py-2 text-sm hover:bg-gray-50"
                    onClick={() => setMenuOpen(false)}
                  >
                    Sign in
                  </Link>
                )}
              </div>
            )}
          </div>

          {/* Mobile hamburger toggles tabs panel */}
          <button
            className="inline-flex h-10 w-10 items-center justify-center rounded-xl hover:bg-gray-100 md:hidden"
            aria-label="Open tabs"
            aria-expanded={mobileOpen}
            onClick={() => setMobileOpen((v) => !v)}
          >
            <Menu className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Tabs row – centered */}
      <div className="border-t bg-white">
        <div className="mx-auto hidden max-w-screen-2xl px-3 sm:px-4 md:block">
          <ul className="flex items-center justify-center gap-1 py-2">
            {TABS.map((t) => {
              const active =
                pathname === t.href || (pathname?.startsWith(t.href + "/") ?? false);
              return (
                <li key={t.href}>
                  <Link
                    href={t.href}
                    className={[
                      "inline-flex h-9 items-center rounded-md px-3 text-sm transition-colors",
                      active ? "bg-black text-white" : "text-slate-700 hover:bg-gray-100",
                    ].join(" ")}
                  >
                    {t.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>

        {/* Mobile tabs panel (slide/drop) */}
        <div
          className={[
            "md:hidden origin-top transition-transform duration-150 ease-out",
            mobileOpen ? "scale-y-100 opacity-100" : "pointer-events-none scale-y-95 opacity-0",
          ].join(" ")}
        >
          <nav className="mx-3 mb-2 mt-1 rounded-xl border bg-white shadow-sm">
            <ul className="flex snap-x snap-mandatory gap-1 overflow-x-auto px-2 py-2">
              {TABS.map((t) => {
                const active =
                  pathname === t.href || (pathname?.startsWith(t.href + "/") ?? false);
                return (
                  <li key={t.href} className="snap-start shrink-0">
                    <Link
                      href={t.href}
                      className={[
                        "inline-flex h-9 items-center rounded-md px-3 text-sm transition-colors",
                        active ? "bg-black text-white" : "text-slate-700 hover:bg-gray-100",
                      ].join(" ")}
                      onClick={() => setMobileOpen(false)}
                    >
                      {t.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>
        </div>
      </div>
    </header>
  );
}

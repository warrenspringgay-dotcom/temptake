"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseBrowser";


const links = [
  { href: "/", label: "Dashboard" },
  { href: "/routines", label: "Routines" },
  { href: "/allergens", label: "Allergens" },
  { href: "/team", label: "Team" },
  { href: "/suppliers", label: "Suppliers" },
  { href: "/reports", label: "Reports" },
];

export default function AppHeader() {
  const [open, setOpen] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    supabase.auth.getUser().then(({ data }) => {
      if (!mounted) return;
      setUserEmail(data.user?.email ?? null);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
      setUserEmail(s?.user?.email ?? null);
    });
    return () => {
      mounted = false;
      sub?.subscription.unsubscribe();
    };
  }, []);

  async function handleLogin() {
    // Example: redirect to your existing auth route
    window.location.href = "/login";
  }

  async function handleLogout() {
    await supabase.auth.signOut();
  }

  return (
    <header className="sticky top-0 z-40 w-full border-b bg-white/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center gap-2 px-4 py-3">
        <Link href="/" className="text-base font-semibold">TempTake</Link>

        {/* desktop links */}
        <nav className="ml-4 hidden items-center gap-3 md:flex">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="rounded-md px-2 py-1 text-sm text-slate-700 hover:bg-gray-100"
            >
              {l.label}
            </Link>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-2">
          {userEmail ? (
            <>
              <span className="hidden text-sm text-slate-600 sm:inline">{userEmail}</span>
              <button
                onClick={handleLogout}
                className="rounded-lg border px-3 py-1.5 text-sm hover:bg-gray-50"
              >
                Sign out
              </button>
            </>
          ) : (
            <button
              onClick={handleLogin}
              className="rounded-lg bg-black px-3 py-1.5 text-sm font-medium text-white hover:bg-gray-900"
            >
              Sign in
            </button>
          )}

          {/* burger */}
          <button
            aria-label="Toggle menu"
            className="ml-1 inline-flex rounded-md p-2 hover:bg-gray-100 md:hidden"
            onClick={() => setOpen((v) => !v)}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <path d="M4 6h16M4 12h16M4 18h16" stroke="currentColor" strokeWidth="2" />
            </svg>
          </button>
        </div>
      </div>

      {/* mobile menu */}
      {open && (
        <div className="border-t bg-white md:hidden">
          <nav className="mx-auto grid max-w-6xl gap-1 px-4 py-2">
            {links.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className="rounded-md px-2 py-2 text-sm text-slate-800 hover:bg-gray-100"
                onClick={() => setOpen(false)}
              >
                {l.label}
              </Link>
            ))}
          </nav>
        </div>
      )}
    </header>
  );
}

// src/components/MobileMenu.tsx
"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { supabase } from "@/lib/supabaseBrowser";

type Props = {
  user: any | null;
};

const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/routines", label: "Routines" },
  { href: "/allergens", label: "Allergens" },
  { href: "/cleaning-rota", label: "Cleaning rota" },
  { href: "/team", label: "Team" },
  { href: "/suppliers", label: "Suppliers" },
  { href: "/reports", label: "Reports" },
];

export default function MobileMenu({ user }: Props) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  async function handleLogout() {
    await supabase.auth.signOut();
    window.location.href = "/login";
  }

  return (
    <div className="relative">
      {/* hamburger button */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-gray-300 bg-white text-sm shadow-sm"
        aria-label="Open menu"
      >
        ☰
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-56 rounded-2xl border bg-white py-2 text-sm shadow-lg">
          <div className="px-3 pb-1 text-xs font-semibold uppercase tracking-wide text-gray-500">
            Navigation
          </div>

          {NAV_ITEMS.map((item) => {
            const active =
              pathname === item.href ||
              (pathname?.startsWith(item.href + "/") ?? false);

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className={`block px-3 py-1.5 ${
                  active
                    ? "bg-black text-white"
                    : "text-gray-800 hover:bg-gray-100"
                }`}
              >
                {item.label}
              </Link>
            );
          })}

          <div className="my-2 border-t" />

          <Link
            href="/help"
            onClick={() => setOpen(false)}
            className="block px-3 py-1.5 text-gray-800 hover:bg-gray-100"
          >
            Help
          </Link>

          {/* You can add a /settings page later and hook this up */}
          {/* <Link
            href="/settings"
            onClick={() => setOpen(false)}
            className="block px-3 py-1.5 text-gray-800 hover:bg-gray-100"
          >
            Settings
          </Link> */}

          <button
            type="button"
            onClick={handleLogout}
            className="mt-1 block w-full px-3 py-1.5 text-left text-red-600 hover:bg-red-50"
          >
            Log out
          </button>
        </div>
      )}
    </div>
  );
}

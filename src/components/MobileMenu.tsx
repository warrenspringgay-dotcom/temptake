// src/components/MobileMenu.tsx
"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/routines", label: "Routines" },
  { href: "/allergens", label: "Allergens" },
  { href: "/cleaning-rota", label: "Cleaning Rota" },
  { href: "/team", label: "Team" },
  { href: "/suppliers", label: "Suppliers" },
  { href: "/reports", label: "Reports" },
  { href: "/settings", label: "Settings" }, // NEW
  { href: "/help", label: "Help" },         // NEW
];

export default function MobileMenu({ user }: { user?: { email?: string } | null }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  return (
    <div className="relative ml-auto">
      <button
        aria-label="Open menu"
        onClick={() => setOpen((v) => !v)}
        className="inline-flex h-9 w-11 items-center justify-center rounded-md border md:hidden"
      >
        <span className="sr-only">Menu</span>
        <span className="block h-0.5 w-5 bg-black" />
        <span className="mt-1 block h-0.5 w-5 bg-black" />
        <span className="mt-1 block h-0.5 w-5 bg-black" />
      </button>

      {open && (
        <div className="absolute right-0 top-11 z-50 w-56 rounded-xl border bg-white p-2 shadow-lg md:hidden">
          <nav className="grid">
            {LINKS.map((l) => {
              const active =
                pathname === l.href || (pathname?.startsWith(l.href + "/") ?? false);
              return (
                <Link
                  key={l.href}
                  href={l.href}
                  onClick={() => setOpen(false)}
                  className={[
                    "rounded-md px-3 py-2 text-sm",
                    active ? "bg-black text-white" : "hover:bg-gray-100",
                  ].join(" ")}
                >
                  {l.label}
                </Link>
              );
            })}

            <div className="my-2 h-px bg-gray-200" />

            {user ? (
              <Link
                href="/logout"
                onClick={() => setOpen(false)}
                className="rounded-md px-3 py-2 text-sm hover:bg-gray-100"
              >
                Sign out
              </Link>
            ) : (
              <Link
                href="/login"
                onClick={() => setOpen(false)}
                className="rounded-md px-3 py-2 text-sm hover:bg-gray-100"
              >
                Login
              </Link>
            )}
          </nav>
        </div>
      )}
    </div>
  );
}

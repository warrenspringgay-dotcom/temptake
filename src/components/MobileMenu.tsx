"use client";

import Link from "next/link";
import { Menu } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/routines", label: "Routines" },
  { href: "/allergens", label: "Allergens" },
  { href: "/cleaning-rota", label: "Cleaning Rota" },
  { href: "/team", label: "Team" },
  { href: "/suppliers", label: "Suppliers" },
  { href: "/reports", label: "Reports" },
  // Utility links shown in the same menu (mobile requirement)
  { href: "/help", label: "Help" },
  { href: "/settings", label: "Settings" },
];

type Props = {
  user: { email?: string | null } | null;
};

export default function MobileMenu({ user }: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);
  const pathname = usePathname();

  // close on route change
  useEffect(() => setOpen(false), [pathname]);

  // outside click / esc
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    function onClick(e: MouseEvent) {
      if (!ref.current) return;
      if (!ref.current.contains(e.target as Node)) setOpen(false);
    }
    if (open) {
      document.addEventListener("keydown", onKey);
      document.addEventListener("mousedown", onClick);
    }
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onClick);
    };
  }, [open]);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        aria-label="Open menu"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="inline-flex h-10 w-10 items-center justify-center rounded-xl hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-black/20"
      >
        <Menu className="h-5 w-5" />
      </button>

      {/* Backdrop */}
      {open && (
        <button
          aria-label="Close menu"
          className="fixed inset-0 z-40 bg-black/25"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Panel */}
      <div
        className={[
          "fixed left-3 right-3 top-14 z-50 origin-top",
          open ? "scale-y-100 opacity-100" : "pointer-events-none scale-y-95 opacity-0",
          "transition duration-150 ease-out",
        ].join(" ")}
      >
        <div className="rounded-xl border bg-white shadow-xl overflow-hidden">
          <nav className="max-h-[70vh] overflow-y-auto">
            {LINKS.map((t) => {
              const active = pathname === t.href || (pathname?.startsWith(t.href + "/") ?? false);
              return (
                <Link
                  key={t.href}
                  href={t.href}
                  className={[
                    "block px-4 py-3 text-sm",
                    active ? "bg-black text-white" : "text-slate-700 hover:bg-gray-50",
                  ].join(" ")}
                >
                  {t.label}
                </Link>
              );
            })}

            {/* Auth at bottom */}
            <div className="border-t">
              {user ? (
                <Link href="/logout" className="block px-4 py-3 text-sm text-red-600 hover:bg-gray-50">
                  Sign out
                </Link>
              ) : (
                <Link href="/login" className="block px-4 py-3 text-sm hover:bg-gray-50">
                  Login
                </Link>
              )}
            </div>
          </nav>
        </div>
      </div>
    </div>
  );
}

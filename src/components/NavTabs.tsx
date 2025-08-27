"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useI18n } from "@/i18n";
import NavUser from "./NavUser";

type NavTabsProps = {
  brandName?: string;
  brandAccent?: string;
  logoUrl?: string;
};

type Item = { href: string; label: string };

export default function NavTabs({
  brandName = "TempTake",
  brandAccent = "#2563EB",
  logoUrl = "/temptake-192.png",
}: NavTabsProps) {
  const { t } = useI18n();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [elevated, setElevated] = useState(false);

  const NAV_ITEMS: Item[] = [
    { href: "/", label: t("dashboard") },
    { href: "/allergens", label: t("allergens") },
    { href: "/team", label: t("team") },
    { href: "/suppliers", label: t("suppliers") },
    { href: "/reports", label: t("reports") },
    { href: "/settings", label: t("settings") },
  ];

  useEffect(() => {
    const onScroll = () => setElevated(window.scrollY > 2);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Close mobile menu on route change
  useEffect(() => setOpen(false), [pathname]);

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  return (
    <header
      className={`sticky top-0 z-50 bg-white ${
        elevated ? "shadow-sm" : ""
      } border-b border-gray-200`}
    >
      <div className="mx-auto max-w-6xl px-3">
        <div className="h-14 flex items-center gap-3">
          {/* Brand / home */}
          <Link href="/" className="flex items-center gap-2 min-w-0">
            <Image
              src={logoUrl || "/icon.png"}
              alt={brandName}
              width={28}
              height={28}
              className="rounded-sm shrink-0"
              priority
            />
            <span className="truncate font-semibold">{brandName}</span>
          </Link>

          <div className="flex-1" />

          {/* Desktop nav */}
          <nav aria-label="Primary" className="hidden md:flex items-center gap-1">
            {NAV_ITEMS.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`px-3 py-2 rounded-md text-sm transition-colors ${
                  isActive(item.href)
                    ? "bg-gray-100 text-gray-900"
                    : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
                }`}
                style={isActive(item.href) ? { outlineColor: brandAccent } : undefined}
              >
                {item.label}
              </Link>
            ))}
          </nav>

          {/* Right-side user */}
          <div className="hidden md:flex">
            <NavUser />
          </div>

          {/* Mobile hamburger */}
          <button
            type="button"
            className="md:hidden inline-flex items-center justify-center rounded-md border border-gray-300 px-2.5 py-2 text-gray-700 hover:bg-gray-50"
            aria-haspopup="menu"
            aria-controls="mobile-nav"
            aria-expanded={open}
            onClick={() => setOpen((v) => !v)}
          >
            <span className="sr-only">Open navigation</span>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M3 6h18M3 12h18M3 18h18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </button>
        </div>
      </div>

      {/* Mobile dropdown */}
      <div
        id="mobile-nav"
        className={`md:hidden border-t border-gray-200 bg-white transition-[max-height] overflow-hidden ${
          open ? "max-h-[420px]" : "max-h-0"
        }`}
        role="menu"
        aria-label="Mobile"
      >
        <div className="mx-auto max-w-6xl px-3 py-2">
          <div className="flex flex-col">
            {NAV_ITEMS.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                role="menuitem"
                className={`px-3 py-2 rounded-md text-sm ${
                  isActive(item.href)
                    ? "bg-gray-100 text-gray-900"
                    : "text-gray-700 hover:bg-gray-50"
                }`}
              >
                {item.label}
              </Link>
            ))}

            {/* User actions in mobile menu */}
            <div className="border-t border-gray-200 mt-2 pt-2">
              <NavUser mobile />
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}

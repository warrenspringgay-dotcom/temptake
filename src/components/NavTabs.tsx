// src/components/NavTabs.tsx
"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";

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
  const isActive = (href: string) => (href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(href + "/"));

  return (
    <nav className="sticky top-0 z-50 bg-white border-b border-gray-200">
      <div className="mx-auto max-w-6xl flex items-center justify-between px-4 py-2">
        <Link href="/" className="flex items-center gap-2">
          <Image src={logoUrl} alt={`${brandName} logo`} width={28} height={28} />
          <span className="font-semibold text-slate-900">{brandName}</span>
        </Link>

        <div className="flex gap-1 sm:gap-2">
          {tabs.map((tab) => {
            const active = isActive(tab.href);
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={`px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                  active ? "text-blue-600 bg-blue-50" : "text-slate-600 hover:text-slate-900 hover:bg-gray-50"
                }`}
              >
                {tab.label}
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}

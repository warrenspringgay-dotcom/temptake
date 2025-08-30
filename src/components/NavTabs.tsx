// src/components/NavTabs.tsx
"use client";

import Link from "next/link";
import Image from "next/image";

export default function NavTabs({
  brandName = "TempTake",
  brandAccent = "#F59E0B",
  logoUrl = "/temptake-192.png",
}: {
  brandName?: string;
  brandAccent?: string;
  logoUrl?: string;
}) {
  const tabs = [
    { href: "/", label: "Logs" },
    { href: "/allergens", label: "Allergens" },
    { href: "/suppliers", label: "Suppliers" },
    { href: "/team", label: "Team" },
    { href: "/reports", label: "Reports" },
    { href: "/settings", label: "Settings" },
  ];

  return (
    <nav className="border-b bg-white shadow-sm">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-2">
        {/* Brand */}
        <div className="flex items-center gap-2">
          <Image src={logoUrl} alt={brandName} width={24} height={24} />
          <span
            className="text-lg font-semibold"
            style={{ color: brandAccent }}
          >
            {brandName}
          </span>
        </div>

        {/* Tabs */}
        <div className="flex gap-4 text-sm font-medium">
          {tabs.map((tab) => (
            <Link
              key={tab.href}
              href={tab.href}
              className="rounded px-2 py-1 text-gray-700 hover:bg-gray-100"
            >
              {tab.label}
            </Link>
          ))}
        </div>
      </div>
    </nav>
  );
}
